#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — GitHub auto-update script (v30 · app 25.0.0)
#
#  Downloads the newest release from the store's official GitHub repo
#  (https://github.com/Alextaylorvhjnf/TAJSHOPBYAlex) and rebuilds the
#  Docker image from it.
#
#  DATA SAFETY — this script NEVER touches:
#    • the taj_db volume      (SQLite: orders, users, products, settings)
#    • the taj_uploads volume (uploaded images)
#    • .env                   (secrets / payment keys)
#  `docker compose up -d` only recreates the application container —
#  volumes are preserved by design. The container entrypoint then runs a
#  non-destructive `prisma db push` on every start, so schema changes
#  sync automatically. Nothing is ever deleted.
#
#  Usage (on the server, inside the project folder):
#    ./update.sh            → check GitHub and install the newest version
#    ./update.sh --check    → only show what's available (change nothing)
#    ./update.sh --force    → reinstall even when versions match
#
#  First-time bootstrap on an OLD deployment (v29.2 and older — its
#  update.sh only rebuilt local files):
#    cd ~/taj-electronics
#    curl -sL -o update.sh \
#      https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main/updates/update.sh
#    chmod +x update.sh && ./update.sh
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main"
MANIFEST_URL="$REPO_RAW/updates/update-manifest.json"

say()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ ERROR: %s\033[0m\n' "$*" >&2; exit 1; }

CHECK_ONLY=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --check|-c) CHECK_ONLY=1 ;;
    --force|-f) FORCE=1 ;;
    *) warn "آرگومان ناشناخته: $arg (ادامه می‌دهیم)" ;;
  esac
done

cd "$(dirname "$0")"
[ -f docker-compose.yml ] || die "این اسکریپت باید داخل پوشهٔ پروژه اجرا شود (docker-compose.yml پیدا نشد)"
[ -f package.json ]       || die "package.json پیدا نشد — پوشهٔ پروژه معتبر نیست"

# ── 0 · self-update (best-effort: always run the newest updater logic) ──
if [ "${TAJ_UPDATE_SELF:-}" != "1" ]; then
  if curl -fsSL --max-time 15 "$REPO_RAW/updates/update.sh" -o update.sh.new 2>/dev/null \
     && head -n1 update.sh.new 2>/dev/null | grep -q "bash"; then
    if [ ! -f update.sh ] || ! cmp -s update.sh update.sh.new; then
      chmod +x update.sh.new
      mv -f update.sh.new update.sh
      ok "خودِ اسکریپت به‌روزرسانی به آخرین نسخهٔ گیت‌هاب ارتقا یافت — ادامه با نسخهٔ جدید…"
      TAJ_UPDATE_SELF=1 exec bash update.sh "$@"
    fi
  fi
  rm -f update.sh.new 2>/dev/null || true
fi

# ── 1 · current version ────────────────────────────────────────────────
CURRENT=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')
[ -n "$CURRENT" ] || CURRENT="0.0.0"
say "نسخهٔ فعلی نصب‌شده: $CURRENT"

# ── 2 · fetch the manifest from GitHub ─────────────────────────────────
say "بررسی آخرین نسخه در گیت‌هاب… ($MANIFEST_URL)"
MANIFEST=$(curl -fsSL --max-time 20 "$MANIFEST_URL") || die "دریافت مانیفست از گیت‌هاب ناموفق بود — اتصال اینترنت سرور را بررسی کنید"

json_field() { printf '%s' "$MANIFEST" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n1 | sed 's/.*"\([^"]*\)"$/\1/'; }
LATEST=$(json_field version)
ZIP_URL=$(json_field zipUrl)
SHA256=$(json_field sha256)
NOTES=$(json_field notes)
MIN_APP=$(json_field minAppVersion)

[ -n "$LATEST" ] || die "فیلد version در مانیفست گیت‌هاب پیدا نشد"
say "آخرین نسخهٔ منتشرشده در گیت‌هاب: $LATEST"
[ -n "$NOTES" ] && printf '  یادداشت نسخه: %s\n' "$NOTES"

is_newer() {
  [ "$1" = "$2" ] && return 1
  [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

if [ "$FORCE" -ne 1 ] && ! is_newer "$LATEST" "$CURRENT"; then
  ok "شما در آخرین نسخه هستید ($CURRENT) — نیازی به به‌روزرسانی نیست"
  [ "$CHECK_ONLY" -eq 1 ] || true
  exit 0
fi
if [ -n "$MIN_APP" ] && ! is_newer "$CURRENT" "$MIN_APP" && [ "$CURRENT" != "$MIN_APP" ]; then
  die "برای نصب نسخهٔ $LATEST ابتدا باید نسخهٔ $MIN_APP نصب باشد (نسخهٔ شما $CURRENT است)"
fi
if [ "$CHECK_ONLY" -eq 1 ]; then
  say "حالت --check: نسخهٔ جدید $LATEST در دسترس است — چیزی نصب/تغییر داده نشد"
  exit 0
fi
[ -n "$ZIP_URL" ] || die "مانیفست آدرس فایل ZIP (zipUrl) ندارد — با پشتیبان اسکریپت تماس بگیرید"

# ── 3 · download the update zip ────────────────────────────────────────
ZIP=".taj-update-$$.zip"
trap 'rm -f "$ZIP" 2>/dev/null || true' EXIT
say "دانلود بستهٔ به‌روزرسانی از گیت‌هاب… ($ZIP_URL)"
curl -fL --max-time 300 --retry 2 -o "$ZIP" "$ZIP_URL" || die "دانلود بستهٔ به‌روزرسانی ناموفق بود"
SIZE=$(du -h "$ZIP" | cut -f1)
say "دانلود کامل شد ($SIZE)"

# ── 4 · verify checksum (when the manifest provides one) ───────────────
if [ -n "$SHA256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL=$(sha256sum "$ZIP" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    ACTUAL=$(shasum -a 256 "$ZIP" | awk '{print $1}')
  else
    warn "ابزار sha256 در دسترس نیست — چک‌سام بررسی نشد (ادامه می‌دهیم)"
    ACTUAL="$SHA256"
  fi
  if [ "$ACTUAL" != "$SHA256" ]; then
    die "چک‌سام SHA-256 مطابقت ندارد — فایل دانلودی آسیب دیده است. هیچ تغییری اعمال نشد؛ دوباره تلاش کنید."
  fi
  ok "چک‌سام SHA-256 تأیید شد ✓"
else
  warn "مانیفست چک‌سام ندارد — دانلود بدون تأیید ادامه می‌یابد"
fi

# ── 5 · validate + apply (CODE ONLY — data/env/uploads never touched) ──
ALLOWED_DIRS="src public prisma scripts"
ALLOWED_ROOTS="package.json next.config.ts tailwind.config.ts tsconfig.json postcss.config.mjs components.json eslint.config.mjs bun.lock"

extract_with_python() {
  python3 - "$ZIP" "$ALLOWED_DIRS" "$ALLOWED_ROOTS" <<'PY'
import sys, zipfile
zp, allowed_dirs, allowed_roots = sys.argv[1], set(sys.argv[2].split()), set(sys.argv[3].split())
z = zipfile.ZipFile(zp)
for n in z.namelist():
    if not n or "\0" in n:                      sys.exit(f"نام فایل نامعتبر: {n!r}")
    if n.startswith("/") or n.startswith("\\"): sys.exit(f"مسیر مطلق ممنوع: {n}")
    parts = [p for p in n.replace("\\", "/").split("/") if p]
    if not parts:                                continue
    if any(p == ".." for p in parts):            sys.exit(f"مسیر شامل .. ممنوع: {n}")
    top = parts[0]
    if top in allowed_dirs:
        if top == "public" and len(parts) > 1 and parts[1] == "uploads":
            sys.exit("public/uploads/ (تصاویر کاربران) در بستهٔ به‌روزرسانی ممنوع است")
        continue
    if len(parts) == 1 and top in allowed_roots:
        continue
    sys.exit(f"«{n}» در فهرست مجاز نیست (فقط src/ ، public/ ، prisma/ ، scripts/ و فایل‌های پیکربندی)")
count = 0
for info in z.infolist():
    if info.is_dir(): continue
    if (info.external_attr >> 16) & 0o170000 == 0o120000:
        sys.exit(f"فایل symlink در بسته ممنوع است: {info.filename}")
    z.extract(info)   # overwrites in place
    count += 1
print(f"{count} فایل روی کد فعلی اعمال شد")
PY
}

extract_with_unzip() {
  # pre-validate every entry with the same rules
  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    case "$entry" in /*|\\*) die "مسیر مطلق ممنوع: $entry" ;; esac
    case "$entry" in *..*)  die "مسیر شامل .. ممنوع: $entry" ;; esac
    top="${entry%%/*}"
    case " $ALLOWED_ROOTS " in *" $top "*) continue ;; esac
    case " $ALLOWED_DIRS " in *" $top "*)
        case "$entry" in public/uploads/*|public/uploads) die "public/uploads/ در بسته ممنوع است" ;; esac
        continue ;;
    esac
    die "«$entry» در فهرست مجاز نیست"
  done < <(unzip -Z1 "$ZIP")
  unzip -oq "$ZIP"
}

if command -v python3 >/dev/null 2>&1; then
  say "بررسی امنیتی و اعمال فایل‌ها (python3)…"
  extract_with_python || die "بستهٔ به‌روزرسانی رد شد — هیچ تغییری اعمال نشد"
elif command -v unzip >/dev/null 2>&1; then
  say "بررسی امنیتی و اعمال فایل‌ها (unzip)…"
  extract_with_unzip || die "بستهٔ به‌روزرسانی رد شد — هیچ تغییری اعمال نشد"
else
  die "نه python3 و نه unzip روی سرور نصب است — یکی از آن‌ها را نصب کنید: apt install -y python3"
fi
ok "کدهای جدید اعمال شدند (فایل‌های کاربران، دیتابیس و .env دست‌نخورده ماندند)"

# keep the dependency lockfile in sync from GitHub (zips intentionally
# don't carry it, so panel-apply stays compatible with every version)
if curl -fsSL --max-time 20 "$REPO_RAW/bun.lock" -o bun.lock.new 2>/dev/null; then
  mv -f bun.lock.new bun.lock
  ok "bun.lock از گیت‌هاب همگام شد"
else
  rm -f bun.lock.new 2>/dev/null || true
  warn "همگام‌سازی bun.lock ناموفق بود (بدون مشکل ادامه می‌دهیم)"
fi

# ── 6 · rebuild + restart (volumes preserved — data survives) ──────────
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

say "بازسازی تصویر داکر (لایه‌های cache سرعت را بالا می‌برند)…"
$COMPOSE build || die "ساخت تصویر ناموفق بود — کانتینر قدیمی همچنان کار می‌کند"

say "راه‌اندازی مجدد برنامه (دیتابیس و تصاویر کاربران محفوظ می‌مانند)…"
$COMPOSE up -d || die "راه‌اندازی مجدد ناموفق بود"

say "انتظار برای سلامت برنامه (/api/health)…"
HEALTHY=0
for _ in $(seq 1 90); do
  if $COMPOSE exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 2
done
[ "$HEALTHY" -eq 1 ] || { $COMPOSE logs --tail 60 app || true; die "پس از به‌روزرسانی برنامه سلامت خود را برنگرداند"; }

NEW_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')
ok "به‌روزرسانی کامل شد — نسخهٔ جدید: ${NEW_VERSION:-$LATEST} ✓"
$COMPOSE ps
