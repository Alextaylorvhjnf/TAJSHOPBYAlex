#!/bin/bash
# dev-server watchdog — keeps `bun run dev` (Next.js 16, port 3000) alive.
#
# WHY THIS EXISTS (2025-09-05 incident):
#   The sandbox has 3.9GB RAM. The Next.js Turbopack dev server for this large
#   app (200+ routes) grows to 1.8–2.6GB RSS as routes compile; combined with
#   headless-Chrome (agent-browser) and periodic sandbox pack jobs (zip /
#   v23-pack.sh), the Linux OOM killer murdered `next-server` 48 times, leaving
#   the preview panel blank ("preview does not load / shows nothing").
#
# MITIGATION:
#   1. Cap the V8 old-space heap (NODE_OPTIONS=--max-old-space-size=1536) so
#      the server GCs aggressively instead of ballooning toward the OOM cliff.
#   2. Watchdog restarts the server automatically if it dies or hangs.
#   3. Proactive guard: if next-server RSS exceeds ~2.2GB, restart it cleanly
#      before the kernel OOM killer picks it as the victim.
#
# Single instance enforced via /tmp/dev-watchdog.pid.
# Log: /tmp/dev-watchdog.log

PROJECT_DIR="/home/z/my-project"
LOG="/tmp/dev-watchdog.log"
PIDFILE="/tmp/dev-watchdog.pid"
DOWN_SINCE="/tmp/dev-watchdog.downsince"
NODE_OPTIONS_VALUE="--max-old-space-size=1536"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [watchdog] $*" >> "$LOG"
}

# ── single instance guard ─────────────────────────────────────────────
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "watchdog already running (pid $OLD_PID)" >&2
    exit 0
  fi
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"; exit 0' INT TERM EXIT

log "watchdog started (pid $$), heap cap: $NODE_OPTIONS_VALUE"

port_up() {
  curl -s -o /dev/null --max-time 5 "http://localhost:3000/" && return 0
  return 1
}

next_dev_pids() {
  pgrep -f "next dev -p 3000" 2>/dev/null
}

next_server_pid() {
  # comm is truncated to 15 chars ("next-server (v"), so match with -f.
  pgrep -f "next-server" 2>/dev/null | head -1
}

start_server() {
  # Clean up any zombie remnants so we never run duplicate instances.
  local pids
  pids=$(next_dev_pids)
  if [ -n "$pids" ]; then
    log "start_server: killing stale next dev processes: $pids"
    kill $pids 2>/dev/null
    sleep 2
    kill -9 $pids 2>/dev/null
  fi
  if [ -f "$DOWN_SINCE" ]; then rm -f "$DOWN_SINCE"; fi
  log "start_server: launching 'bun run dev' with NODE_OPTIONS=$NODE_OPTIONS_VALUE"
  cd "$PROJECT_DIR" || { log "FATAL: cannot cd $PROJECT_DIR"; exit 1; }
  NODE_OPTIONS="$NODE_OPTIONS_VALUE" setsid nohup bun run dev \
    </dev/null >> /tmp/dev-server.out 2>&1 &
  disown
  log "start_server: launched (wrapper pid $!)"
}

while true; do
  sleep 10

  # ── proactive RSS guard (avoid becoming the OOM victim) ────────────
  SRV_PID=$(next_server_pid)
  if [ -n "$SRV_PID" ]; then
    RSS_KB=$(ps -o rss= -p "$SRV_PID" 2>/dev/null | tr -d ' ')
    if [ -n "$RSS_KB" ] && [ "$RSS_KB" -gt 2200000 ] 2>/dev/null; then
      log "RSS guard: next-server (pid $SRV_PID) at $((RSS_KB/1024))MB — restarting before OOM"
      kill "$SRV_PID" 2>/dev/null
      sleep 3
      # v28: a bloated/hung next-server ignores SIGTERM — escalate to SIGKILL
      # (old behavior looped forever re-measuring the same pid while the
      # port was down, freezing the preview). Also kill the wrapper tree so
      # the dead-detector below relaunches a clean instance.
      if ps -p "$SRV_PID" >/dev/null 2>&1; then
        log "RSS guard: SIGTERM ignored by pid $SRV_PID — escalating to SIGKILL"
        kill -9 "$SRV_PID" 2>/dev/null
        next_dev_pids | tr '\n' ' ' | xargs -r kill -9 2>/dev/null
        sleep 2
      fi
      continue
    fi
  fi

  # ── liveness checks ────────────────────────────────────────────────
  if port_up; then
    if [ -f "$DOWN_SINCE" ]; then
      log "server recovered, removing down marker"
      rm -f "$DOWN_SINCE"
    fi
    continue
  fi

  # Port is down. Distinguish crash (restart now) vs boot/hang.
  DEVPIDS=$(next_dev_pids)
  if [ -z "$DEVPIDS" ]; then
    log "server is DEAD (no next dev process, port down) — restarting"
    start_server
    continue
  fi

  # next dev process exists but port down: could be booting or hung.
  if [ ! -f "$DOWN_SINCE" ]; then
    date +%s > "$DOWN_SINCE"
    log "port down but process alive ($DEVPIDS) — waiting (boot/compile)"
    continue
  fi
  DOWN_FOR=$(( $(date +%s) - $(cat "$DOWN_SINCE") ))
  if [ "$DOWN_FOR" -gt 90 ]; then
    log "server HUNG (port down ${DOWN_FOR}s despite process alive) — killing and restarting"
    kill $DEVPIDS 2>/dev/null
    sleep 2
    kill -9 $DEVPIDS 2>/dev/null
    start_server
  fi
done
