#!/bin/bash
# dev server supervisor — respawns if it dies
while true; do
  cd /home/z/my-project
  bun run dev >> /tmp/taj-dev.log 2>&1
  echo "[supervisor] dev server exited ($?), respawning in 3s..." >> /tmp/taj-dev.log
  sleep 3
done
