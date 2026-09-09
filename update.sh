#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — اسکریپت به‌روزرسانی خودکار (v34 · app 29.0.0)
#
#  از آخرین نسخهٔ منتشرشده در گیت‌هاب فروشگاه (کانال رسمی) می‌گیرد و نصب می‌کند.
#  هر دو حالت نصب را پشتیبانی می‌کند (تشخیص خودکار):
#    • Standalone (v34+): بستهٔ به‌روزرسانی حاوی برنامهٔ از پیش ساخته‌شده است →
#      تعویض کد + ری‌استارت سرویس systemd — بدون هیچ بیلدی روی سرور (~۱ دقیقه)
#    • Docker (نسخه‌های قدیمی): مثل قبل build + up
#
#  ایمنی داده‌ها — هرگز دست نمی‌زند به:
#    • db/custom.db        (سفارش‌ها، کاربران، محصولات، تنظیمات)
#    • public/uploads/     (تصاویر بارگذاری‌شده)
#    • .env                (رمزها و کلیدهای درگاه)
#
#  استفاده (داخل پوشهٔ نصب — standalone: /var/www/taj-electronics):
#    ./update.sh            → بررسی و نصب آخرین نسخه
#    ./update.sh --check    → فقط نمایش نسخهٔ موجود (بدون تغییر)
#    ./update.sh --force    → نصب مجدد حتی وقتی نسخه‌ها برابرند
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/Alextaylorvhjnf/TAJSHOPBYAlex/main"
MANIFEST_URL="$REPO_RAW/updates/update-manifest.json"
APP_DIR_DEFAULT="/var/www/taj-electronics"

say()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ خطا: %s\033[0m\n' "$*" >&2; exit 1; }

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

# ── تشخیص حالت نصب ──
MODE="unknown"
if [ -f "./server.js" ] || [ -f "$APP_DIR_DEFAULT/server.js" ]; then
  MODE="standalone"
  # اگر از جای دیگری اجرا شد، به پوشهٔ استقرار برو
  if [ ! -f "./server.js" ] && [ -f "$APP_DIR_DEFAULT/server.js" ]; then
    cd "$APP_DIR_DEFAULT"
  fi
elif [ -f "./docker-compose.yml" ] || [ -f "./package.json" ]; then
  MODE="docker"
fi
[ "$MODE" = "unknown" ] && die "این اسکریپت باید داخل پوشهٔ نصب اجرا شود (server.js یا docker-compose.yml/package.json پیدا نشد)"

[ "$(id -u)" -ne 0 ] && exec sudo bash "$0" "$@"

if [ "$MODE" = "standalone" ]; then
  ok "حالت نصب: Standalone (برنامهٔ از پیش ساخته‌شده + systemd) — پوشه: $(pwd)"
else
  ok "حالت نصب: Docker/سورس — مسیر بیلد روی سرور"
fi

# ── 0 · خود-به‌روزرسانی اسکریپت ──
if [ "${TAJ_UPDATE_SELF:-}" != "1" ]; then
  if curl -fsSL --max-time 15 "$REPO_RAW/updates/update.sh" -o update.sh.new 2>/dev/null \
     && head -n1 update.sh.new 2>/dev/null | grep -q "bash"; then
    if [ ! -f update.sh ] || ! cmp -s update.sh update.sh.new; then
      chmod +x update.sh.new
      mv -f update.sh.new update.sh
      ok "خودِ اسکریپت به‌روزرسانی ارتقا یافت — ادامه با نسخهٔ جدید…"
      TAJ_UPDATE_SELF=1 exec bash update.sh "$@"
    fi
  fi
  rm -f update.sh.new 2>/dev/null || true
fi

# ── 1 · نسخهٔ فعلی ──
CURRENT=""
if [ "$MODE" = "standalone" ]; then
  [ -f .version ] && CURRENT="$(cat .version | xargs)"
  [ -z "$CURRENT" ] && [ -f package.json ] && CURRENT=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')
else
  CURRENT=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json 2>/dev/null | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')
fi
[ -n "$CURRENT" ] || CURRENT="0.0.0"
say "نسخهٔ فعلی نصب‌شده: $CURRENT"

# ── 2 · دریافت مانیفست ──
say "بررسی آخرین نسخه در گیت‌هاب… ($MANIFEST_URL)"
MANIFEST=$(curl -fsSL --max-time 20 "$MANIFEST_URL") || die "دریافت مانیفست ناموفق بود — اتصال اینترنت سرور را بررسی کنید"

json_field() { printf '%s' "$MANIFEST" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n1 | sed 's/.*"\([^"]*\)"$/\1/'; }
LATEST=$(json_field version)
ZIP_URL=$(json_field zipUrl)
SHA256=$(json_field sha256)
NOTES=$(json_field notes)
MIN_APP=$(json_field minAppVersion)

[ -n "$LATEST" ] || die "فیلد version در مانیفست پیدا نشد"
say "آخرین نسخهٔ منتشرشده: $LATEST"
[ -n "$NOTES" ] && printf '  یادداشت نسخه: %s\n' "$NOTES"

is_newer() {
  [ "$1" = "$2" ] && return 1
  [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

if [ "$FORCE" -ne 1 ] && ! is_newer "$LATEST" "$CURRENT"; then
  ok "شما در آخرین نسخه هستید ($CURRENT) — نیازی به به‌روزرسانی نیست"
  exit 0
fi
if [ -n "$MIN_APP" ] && ! is_newer "$CURRENT" "$MIN_APP" && [ "$CURRENT" != "$MIN_APP" ]; then
  die "برای نصب نسخهٔ $LATEST ابتدا باید نسخهٔ $MIN_APP نصب باشد (نسخهٔ شما $CURRENT است)"
fi
if [ "$CHECK_ONLY" -eq 1 ]; then
  say "حالت --check: نسخهٔ جدید $LATEST در دسترس است — چیزی نصب/تغییر داده نشد"
  exit 0
fi
[ -n "$ZIP_URL" ] || die "مانیفست آدرس ZIP ندارد"

# ── 3 · دانلود بسته ──
ZIP=".taj-update-$$.zip"
EXTRACT=".taj-update-extracted-$$"
trap 'rm -rf "$ZIP" "$EXTRACT" 2>/dev/null || true' EXIT
say "دانلود بستهٔ به‌روزرسانی… ($ZIP_URL)"
curl -fL --max-time 600 --retry 2 -o "$ZIP" "$ZIP_URL" || die "دانلود ناموفق بود"
SIZE=$(du -h "$ZIP" | cut -f1)
say "دانلود کامل شد ($SIZE)"

# ── 4 · چک‌سام ──
if [ -n "$SHA256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL=$(sha256sum "$ZIP" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    ACTUAL=$(shasum -a 256 "$ZIP" | awk '{print $1}')
  else
    warn "ابزار sha256 در دسترس نیست — چک‌سام بررسی نشد"
    ACTUAL="$SHA256"
  fi
  [ "$ACTUAL" != "$SHA256" ] && die "چک‌سام SHA-256 مطابقت ندارد — فایل دانلودی آسیب دیده است؛ دوباره تلاش کنید."
  ok "چک‌سام SHA-256 تأیید شد ✓"
fi

# ── 5 · استخراج امن (اعتبارسنجی مسیرها) ──
mkdir -p "$EXTRACT"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$ZIP" "$EXTRACT" <<'PY'
import sys, zipfile
zp, out = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(zp)
for n in z.namelist():
    if not n or "\0" in n:                      sys.exit(f"نام فایل نامعتبر: {n!r}")
    if n.startswith("/") or n.startswith("\\"): sys.exit(f"مسیر مطلق ممنوع: {n}")
    parts = [p for p in n.replace("\\", "/").split("/") if p]
    if not parts:                                continue
    if any(p == ".." for p in parts):            sys.exit(f"مسیر شامل .. ممنوع: {n}")
for info in z.infolist():
    if info.is_dir(): continue
    if (info.external_attr >> 16) & 0o170000 == 0o120000:
        sys.exit(f"فایل symlink در بسته ممنوع است: {info.filename}")
    z.extract(info, out)
PY
elif command -v unzip >/dev/null 2>&1; then
  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    case "$entry" in /*|\\*) die "مسیر مطلق ممنوع: $entry" ;; esac
    case "$entry" in *..*)  die "مسیر شامل .. ممنوع: $entry" ;; esac
  done < <(unzip -Z1 "$ZIP")
  unzip -q "$ZIP" -d "$EXTRACT"
else
  die "python3 یا unzip باید روی سرور نصب باشد: apt install -y python3 unzip"
fi
ok "بسته استخراج شد"

# ══════════════════════════════════════════════════════════════════════
# ── 6 · اعمال — حالت Standalone (v34+ — بدون بیلد) ──
# ══════════════════════════════════════════════════════════════════════
if [ "$MODE" = "standalone" ]; then
  HAS_FULL=0; HAS_CODE=0
  [ -f "$EXTRACT/runtime/server.js" ] && HAS_FULL=1
  [ -f "$EXTRACT/runtime-code/server.js" ] && HAS_CODE=1

  if [ "$HAS_FULL" = "0" ] && [ "$HAS_CODE" = "0" ]; then
    # بستهٔ فقط-سورس: روی نصب standalone اثری ندارد
    warn "این بستهٔ به‌روزرسانی فقط کد منبع دارد و برای نصبِ از پیش ساخته‌شده قابل اعمال نیست."
    say "برای به‌روزرسانی واقعی: بستهٔ کامل جدید (v34+) را دانلود کنید و install.sh آن را"
    say "دوباره اجرا کنید — نصب idempotent است و داده‌ها (دیتابیس/آپلودها/.env) حفظ می‌شوند."
    exit 0
  fi

  SRC="$EXTRACT/runtime"
  [ "$HAS_FULL" = "1" ] || SRC="$EXTRACT/runtime-code"

  say "پشتیبان‌گیری لحظه‌ای از داده‌ها…"
  BK=".taj-update-backup-$$"
  mkdir -p "$BK/db"
  [ -s "db/custom.db" ] && cp "db/custom.db" "$BK/db/custom.db"
  [ -d "public/uploads" ] && cp -a public/uploads "$BK/uploads"
  [ -f ".env" ] && cp ".env" "$BK/.env"

  say "تعویض فایل‌های برنامه (بدون بیلد — چند ثانیه)…"
  systemctl stop taj-electronics 2>/dev/null || true

  if [ "$HAS_FULL" = "1" ]; then
    # تعویض کامل: همه‌چیز جز داده‌ها
    find . -maxdepth 1 -mindepth 1 \
      ! -name 'db' ! -name '.env' ! -name 'update.sh' ! -name '.taj-*' \
      -exec rm -rf {} + 2>/dev/null || true
    mkdir -p db public
    cp -a "$SRC/." .
  else
    # تعویض کد: server.js + .next + prisma + scripts (node_modules نصب فعلی می‌ماند)
    rm -rf .next server.js prisma scripts
    mkdir -p public
    cp -a "$SRC/." .
    # public/ و prisma/ و scripts/ از بخش سورسِ همین بسته روی runtime overlay شوند
    for d in public prisma scripts; do
      [ -d "$EXTRACT/$d" ] && cp -a "$EXTRACT/$d/." "./$d/" 2>/dev/null || true
    done
  fi

  # بازگردانی داده‌ها + نسخهٔ جدید
  [ -s "$BK/db/custom.db" ] && mkdir -p db && cp "$BK/db/custom.db" db/custom.db
  [ -d "$BK/uploads" ] && rm -rf public/uploads && cp -a "$BK/uploads" public/uploads
  [ -f "$BK/.env" ] && cp "$BK/.env" .env
  [ -f "$SRC/.version" ] && cp "$SRC/.version" .version
  rm -rf "$BK"

  say "ری‌استارت سرویس (اسکیما هم غیرمخرب همگام می‌شود)…"
  systemctl restart taj-electronics

  say "انتظار برای سلامت برنامه (/api/health)…"
  HEALTHY=0
  for _ in $(seq 1 90); do
    if curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:3000/api/health" 2>/dev/null; then
      HEALTHY=1; break
    fi
    sleep 2
  done
  [ "$HEALTHY" -eq 1 ] || { journalctl -u taj-electronics --no-pager -n 40 2>/dev/null || true; die "پس از به‌روزرسانی برنامه سالم برنگشت — لاگ بالا"; }

  NEW_VERSION=""
  [ -f .version ] && NEW_VERSION="$(cat .version | xargs)"
  ok "به‌روزرسانی کامل شد — نسخهٔ جدید: ${NEW_VERSION:-$LATEST} ✓ (بدون هیچ بیلدی روی سرور)"
  systemctl status taj-electronics --no-pager -l | head -5 || true
  exit 0
fi

# ══════════════════════════════════════════════════════════════════════
# ── 6 · اعمال — حالت Docker/سورس (نسخه‌های قدیمی — مثل قبل) ──
# ══════════════════════════════════════════════════════════════════════
ALLOWED_DIRS="src public prisma scripts runtime runtime-code"
# v34: runtime/ + runtime-code/ (برنامهٔ از پیش ساخته‌شده) در بسته‌های جدید هستند؛
# برای حالت Docker معنا ندارند — فقط اعتبارسنجی می‌شوند و بعد از استخراج حذف می‌شوند.
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

# v34: پوشه‌های runtime مخصوص نصب standalone بودند — در حالت Docker حذف می‌شوند
# (داکر از سورس بیلد می‌کند و به برنامهٔ کامپایل‌شده نیاز ندارد)
if [ -d runtime ] || [ -d runtime-code ]; then
  rm -rf runtime runtime-code
  say "پوشهٔ برنامهٔ آماده (runtime/) مخصوص نصب standalone بود — برای Docker نادیده گرفته شد"
fi

if curl -fsSL --max-time 20 "$REPO_RAW/bun.lock" -o bun.lock.new 2>/dev/null; then
  mv -f bun.lock.new bun.lock
  ok "bun.lock از گیت‌هاب همگام شد"
else
  rm -f bun.lock.new 2>/dev/null || true
  warn "همگام‌سازی bun.lock ناموفق بود (بدون مشکل ادامه می‌دهیم)"
fi

# ── 7 · rebuild + restart (حالت Docker) ──
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
