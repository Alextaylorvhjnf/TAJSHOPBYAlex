#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
#  TAJ Electronics — نصاب سریع v34 (بدون Docker، بدون بیلد روی سرور)
#
#  چرا این نسخه سریع است؟
#    بیلد Next.js از قبل انجام شده و داخل بسته (پوشهٔ runtime/) آماده است.
#    روی سرور شما هیچ کامپایل و هیچ npm install انجام نمی‌شود —
#    فقط Node.js + Nginx + SSL نصب/تنظیم می‌شود و سرویس روشن می‌شود.
#    ⇒ کل نصب: حدود ۲ تا ۴ دقیقه | مصرف دیسک: زیر ۱ گیگابایت
#      (نصب‌های Docker قبلی: ۳۰-۴۰ دقیقه بیلد و ~۱۰GB دیسک)
#
#  استفاده (تعاملی — دامنه را خودتان می‌پرسد):
#      sudo bash install.sh
#  استفاده غیرتعاملی:
#      sudo bash install.sh --domain store.example.com
#      sudo bash install.sh --no-ssl          (بدون گواهی SSL)
#
#  مراحل (idempotent — اجرای مجدد امن است و داده‌ها حفظ می‌شوند):
#    1) بررسی سرور و نصب پیش‌نیازها (فقط مواردِ غایب نصب می‌شوند)
#    2) پرسیدن دامنه + بررسی DNS
#    3) استقرار برنامهٔ آماده در /var/www/taj-electronics
#    4) ساخت .env (رمز تصادفی) + دیتابیس seed
#    5) تنظیم Nginx (ریورس‌پروکسی)
#    6) SSL (Let's Encrypt — فقط با دامنهٔ معتبر)
#    7) سرویس systemd + بررسی سلامت + جمع‌بندی
#
#  برای توسعه‌دهنده‌ها: مسیر Docker همچنان موجود است
#  (docker-compose.yml + Dockerfile دست‌نخورده هستند).
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_PORT="3000"
APP_DIR="/var/www/taj-electronics"
SERVICE_NAME="taj-electronics"
NGINX_CONF="/etc/nginx/conf.d/taj-electronics.conf"
HEALTH_PATH="/api/health"
START_TIME=$SECONDS

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ خطا: %s\033[0m\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1;35m━━━ [%s/7] %s ━━━\033[0m\n' "$1" "$2"; }
elapsed() { echo $((SECONDS - START_TIME)); }

# ── فلگ‌های اختیاری ──
DOMAIN_ARG=""
NO_SSL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN_ARG="${2:-}"; shift 2 ;;
    --no-ssl) NO_SSL=1; shift ;;
    *) warn "آرگومان ناشناخته: $1 (نادیده گرفته شد)"; shift ;;
  esac
done

cd "$(dirname "$0")"
SRC_DIR="$(pwd)"

# ── دسترسی root ──
if [ "$(id -u)" -ne 0 ]; then
  say "نیاز به دسترسی root — اجرای مجدد با sudo…"
  exec sudo bash "$0" ${DOMAIN_ARG:+--domain "$DOMAIN_ARG"} $([ "$NO_SSL" = 1 ] && echo --no-ssl)
fi

# ── برنامهٔ از پیش ساخته‌شده باید کنار این اسکریپت باشد ──
[ -f "$SRC_DIR/runtime/server.js" ] || die "پوشهٔ runtime/ (برنامهٔ آمادهٔ v34) کنار install.sh پیدا نشد.
   مطمئن شوید کل محتوای فایل ZIP را استخراج کرده‌اید و از داخل همان پوشه اجرا می‌کنید."

# ══════════════════════════════════════════════════════════════════════
step 1 "بررسی سرور و نصب پیش‌نیازها (فقط مواردِ غایب)"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)
say "تشخیص سیستم‌عامل…"
OS="unknown"
if command -v apt-get >/dev/null 2>&1; then OS="debian"
elif command -v dnf >/dev/null 2>&1; then OS="rhel"
fi
[ "$OS" = "unknown" ] && die "فقط Debian/Ubuntu (apt) و RHEL/AlmaLinux/Rocky (dnf) پشتیبانی می‌شود."

# کاربر اجرای سرویس (Debian: www-data / RHEL: nginx)
RUN_USER=""
if id www-data >/dev/null 2>&1; then RUN_USER="www-data"
elif id nginx >/dev/null 2>&1; then RUN_USER="nginx"
else RUN_USER="root"; fi

pkg_install() {
  # نصب فقط پکیج‌های غایب
  local missing=()
  for p in "$@"; do command -v "$p" >/dev/null 2>&1 || missing+=("$p"); done
  [ ${#missing[@]} -eq 0 ] && return 0
  say "نصب ${missing[*]}…"
  if [ "$OS" = "debian" ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq >/dev/null 2>&1 || true
    apt-get install -y -qq "${missing[@]}" >/dev/null
  else
    dnf install -y -q "${missing[@]}" >/dev/null
  fi
}

pkg_install curl unzip openssl

# ── Node.js ≥ 18 ──
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local maj
  maj="$(node --version 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')"
  [ -n "$maj" ] && [ "$maj" -ge 18 ] && [ "$maj" -ne 19 ]
}

if node_ok; then
  ok "Node.js $(node --version) موجود است"
else
  say "Node.js غایب/قدیمی است — نصب Node 22 (NodeSource)…"
  NODE_OK_AFTER=0
  if [ "$OS" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/ns_setup.sh 2>/dev/null \
      && bash /tmp/ns_setup.sh >/dev/null 2>&1 \
      && apt-get install -y -qq nodejs >/dev/null && NODE_OK_AFTER=1
  else
    curl -fsSL https://rpm.nodesource.com/setup_22.x -o /tmp/ns_setup.sh 2>/dev/null \
      && bash /tmp/ns_setup.sh >/dev/null 2>&1 \
      && dnf install -y -q nodejs >/dev/null && NODE_OK_AFTER=1
  fi
  rm -f /tmp/ns_setup.sh
  if [ "$NODE_OK_AFTER" != "1" ]; then
    # fallback: پکیج توزیع
    warn "NodeSource در دسترس نبود — تلاش با پکیج رسمی توزیع…"
    pkg_install nodejs || true
  fi
  node_ok || die "Node.js ≥ 18 نصب نشد. دستی نصب کنید:
     curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"
  ok "Node.js $(node --version) نصب شد"
fi

# ── Nginx ──
if command -v nginx >/dev/null 2>&1; then
  ok "Nginx $(nginx -v 2>&1 | grep -oE '[0-9.]+' | head -1) موجود است"
else
  say "نصب Nginx…"
  if [ "$OS" = "debian" ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq >/dev/null 2>&1 || true
    apt-get install -y -qq nginx >/dev/null
  else
    dnf install -y -q nginx >/dev/null
  fi
  command -v nginx >/dev/null 2>&1 || die "نصب Nginx ناموفق بود"
  ok "Nginx نصب شد"
fi
systemctl enable --now nginx >/dev/null 2>&1 || service nginx start >/dev/null 2>&1 || true

# ── certbot (برای SSL) ──
CERTBOT_OK=0
if [ "$NO_SSL" = "1" ]; then
  warn "SSL با فلگ --no-ssl غیرفعال شد"
elif command -v certbot >/dev/null 2>&1; then
  CERTBOT_OK=1; ok "certbot موجود است"
else
  say "نصب certbot (برای گواهی رایگان SSL)…"
  if [ "$OS" = "debian" ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq >/dev/null 2>&1 || true
    apt-get install -y -qq certbot python3-certbot-nginx >/dev/null 2>&1 && CERTBOT_OK=1
  else
    dnf install -y -q epel-release >/dev/null 2>&1 || true
    dnf install -y -q certbot python3-certbot-nginx >/dev/null 2>&1 && CERTBOT_OK=1
  fi
  [ "$CERTBOT_OK" = "1" ] && ok "certbot نصب شد" || warn "نصب certbot ناموفق بود — بدون SSL ادامه می‌دهیم"
fi

# ── systemd ──
[ -d /run/systemd/system ] || die "این سرور systemd ندارد — لطفاً از مسیر Docker (docker-compose.yml) استفاده کنید."

ok "پیش‌نیازها آماده است ($(($(elapsed) - T0)) ثانیه)"

# ══════════════════════════════════════════════════════════════════════
step 2 "دامنهٔ فروشگاه"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)
DOMAIN=""
SERVER_IP="$(curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null || curl -fsS --max-time 8 http://ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
[ -n "${SERVER_IP:-}" ] || SERVER_IP="localhost"

domain_valid() {
  [[ "$1" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]
}

if [ -n "$DOMAIN_ARG" ]; then
  DOMAIN="$DOMAIN_ARG"
  domain_valid "$DOMAIN" || die "دامنهٔ نامعتبر: $DOMAIN"
  ok "دامنه (از آرگومان): $DOMAIN"
else
  printf '\n\033[1;37mدامنهٔ فروشگاه را وارد کنید (مثال: store.example.com)\033[0m\n'
  printf '\033[1;37mاگر فعلاً دامنه ندارید فقط Enter بزنید تا با آی‌پی سرور نصب شود:\033[0m\n'
  while true; do
    read -r -p "دامنه [Enter = فقط IP]: " ANSWER || ANSWER=""
    ANSWER="$(echo "$ANSWER" | xargs || true)"
    if [ -z "$ANSWER" ]; then break; fi
    if domain_valid "$ANSWER"; then DOMAIN="$ANSWER"; break; fi
    warn "قالب دامنه درست نیست (بدون http و بدون /) — دوباره تلاش کنید یا Enter بزنید"
  done
fi

DNS_OK=0
if [ -n "$DOMAIN" ]; then
  say "بررسی DNS دامنه…"
  DOMAIN_IPS="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ' || true)"
  if [ -z "$DOMAIN_IPS" ]; then
    warn "دامنه هنوز resolve نمی‌شود — DNS آن را بعداً به IP سرور ($SERVER_IP) اشاره دهید"
    warn "فعلاً بدون SSL نصب می‌شود؛ بعد از تنظیم DNS دوباره این اسکریپت را اجرا کنید تا SSL فعال شود"
  elif echo "$DOMAIN_IPS" | grep -qw "$SERVER_IP"; then
    DNS_OK=1; ok "دامنه به این سرور اشاره می‌کند ($SERVER_IP)"
  else
    warn "دامنه به IP دیگری اشاره می‌کند: $DOMAIN_IPS (IP سرور: $SERVER_IP)"
    warn "بدون SSL ادامه می‌دهیم — رکورد A دامنه را به $SERVER_IP تغییر دهید و دوباره اجرا کنید"
  fi
else
  ok "نصب بدون دامنه — با آی‌پی $SERVER_IP"
fi
ok "دامنه آماده است ($(($(elapsed) - T0)) ثانیه)"

# ══════════════════════════════════════════════════════════════════════
step 3 "استقرار برنامهٔ آماده (بدون بیلد — کپی مستقیم)"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)

# ── توقف نصب Docker قبلی (در صورت وجود) و انتقال داده‌ها ──
if command -v docker >/dev/null 2>&1 && docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx taj-electronics; then
  say "نصب Docker قبلی پیدا شد — توقف و انتقال به نصب جدید (سبک و سریع)…"
  docker stop taj-electronics >/dev/null 2>&1 || true
  docker rm taj-electronics >/dev/null 2>&1 || true
  ok "کانتینر قدیمی taj-electronics حذف شد"
  DOCKER_DB="/var/lib/docker/volumes/taj-electronics_taj_db/_data/custom.db"
  DOCKER_UP="/var/lib/docker/volumes/taj-electronics_taj_uploads/_data"
  [ -s "$DOCKER_DB" ] && mkdir -p "$SRC_DIR/.taj-migrated" && cp "$DOCKER_DB" "$SRC_DIR/.taj-migrated/custom.db" 2>/dev/null \
    && say "دیتابیس قبلی برای انتقال ذخیره شد"
  [ -d "$DOCKER_UP" ] && [ -n "$(ls -A "$DOCKER_UP" 2>/dev/null)" ] && cp -a "$DOCKER_UP" "$SRC_DIR/.taj-migrated/uploads" 2>/dev/null \
    && say "آپلودهای قبلی برای انتقال ذخیره شد"
fi

# ── تداخل پورت 3000 ──
PORT_BUSY=0
curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" 2>/dev/null && PORT_BUSY=1
if [ "$PORT_BUSY" = "1" ] && ! systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  die "پورت 3000 توسط برنامهٔ دیگری اشغال است. خروجی تشخیصی:
$(ss -ltnp 2>/dev/null | grep ":${APP_PORT}" || echo "برنامهٔ روی پورت 3000")"
fi
[ "$PORT_BUSY" = "1" ] && say "سرویس قبلی فعال است — حالت ارتقا/به‌روزرسانی" || ok "پورت ${APP_PORT} آزاد است"

# ── استقرار در /var/www/taj-electronics (داده‌های قبلی حفظ می‌شود) ──
UPGRADE=0
if [ -f "$APP_DIR/server.js" ] || [ -d "$APP_DIR/.next" ]; then UPGRADE=1; fi

if [ "$UPGRADE" = "1" ]; then
  say "نصب قبلی در $APP_DIR پیدا شد — کد جایگزین، داده‌ها حفظ…"
  BACKUP="/tmp/taj-data-backup-$$"
  mkdir -p "$BACKUP"
  [ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" "$BACKUP/.env"
  [ -s "$APP_DIR/db/custom.db" ] && mkdir -p "$BACKUP/db" && cp "$APP_DIR/db/custom.db" "$BACKUP/db/custom.db"
  [ -d "$APP_DIR/public/uploads" ] && cp -a "$APP_DIR/public/uploads" "$BACKUP/uploads"
  systemctl stop "$SERVICE_NAME" >/dev/null 2>&1 || true
fi

# محافظ قبل از پاک‌کردن
case "$APP_DIR" in "/"|"/var"|"/var/www"|"/www"|"" ) die "مسیر استقرار نامعتبر" ;; esac
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

say "کپی برنامهٔ آماده (این فقط کپی است — چند ثانیه طول می‌کشد)…"
cp -a "$SRC_DIR/runtime/." "$APP_DIR/"
[ -f "$APP_DIR/.version" ] || printf '29.0.0\n' > "$APP_DIR/.version"
[ -d "$APP_DIR/public/uploads" ] || mkdir -p "$APP_DIR/public/uploads"
mkdir -p "$APP_DIR/db"

# انتقال داده‌های Docker قبلی / نصب قبلی
if [ -n "${BACKUP:-}" ] && [ -d "$BACKUP" ]; then
  [ -f "$BACKUP/.env" ] && cp "$BACKUP/.env" "$APP_DIR/.env" && ok ".env قبلی حفظ شد"
  if [ -s "$BACKUP/db/custom.db" ]; then cp "$BACKUP/db/custom.db" "$APP_DIR/db/custom.db"; ok "دیتابیس قبلی حفظ شد"; fi
  [ -d "$BACKUP/uploads" ] && rm -rf "$APP_DIR/public/uploads" && cp -a "$BACKUP/uploads" "$APP_DIR/public/uploads" && ok "آپلودهای قبلی حفظ شد"
elif [ -d "$SRC_DIR/.taj-migrated" ]; then
  [ -s "$SRC_DIR/.taj-migrated/custom.db" ] && cp "$SRC_DIR/.taj-migrated/custom.db" "$APP_DIR/db/custom.db" && ok "دیتابیس Docker قبلی منتقل شد"
  [ -d "$SRC_DIR/.taj-migrated/uploads" ] && rm -rf "$APP_DIR/public/uploads" && cp -a "$SRC_DIR/.taj-migrated/uploads" "$APP_DIR/public/uploads" && ok "آپلودهای Docker قبلی منتقل شد"
  rm -rf "$SRC_DIR/.taj-migrated"
fi

# seed اولین بوت (اگر هنوز دیتابیس نیست)
if [ ! -s "$APP_DIR/db/custom.db" ]; then
  cp "$APP_DIR/db-seed/catalog.db" "$APP_DIR/db/custom.db"
  ok "دیتابیس دمو (۱۰۰ محصول + اسلایدرها) نصب شد — با ویزارد /install ادمین بسازید"
fi

chown -R "$RUN_USER":"$RUN_USER" "$APP_DIR" 2>/dev/null || chown -R "$RUN_USER" "$APP_DIR" 2>/dev/null || true
ok "برنامه در $APP_DIR مستقر شد ($(($(elapsed) - T0)) ثانیه)"

# ══════════════════════════════════════════════════════════════════════
step 4 "تنظیمات (.env + دیتابیس + سرویس systemd)"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)

if [ -f "$APP_DIR/.env" ] && grep -q "^AUTH_SECRET=.\{8,\}" "$APP_DIR/.env"; then
  ok ".env موجود — رمز و تنظیمات قبلی حفظ شد"
else
  SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  if [ -n "$DOMAIN" ]; then
    [ "$DNS_OK" = "1" ] && SITE_URL="https://$DOMAIN" || SITE_URL="http://$DOMAIN"
  else
    SITE_URL="http://${SERVER_IP}"
  fi
  cat > "$APP_DIR/.env" <<EOF
# ═══ TAJ Electronics — تنظیمات محیطی (تولیدشده توسط install.sh v34) ═══
DATABASE_URL="file:${APP_DIR}/db/custom.db"
AUTH_SECRET=${SECRET}
NEXT_PUBLIC_SITE_URL="${SITE_URL}"
EOF
  ok ".env ساخته شد (AUTH_SECRET تصادفی قوی)"
fi
# DATABASE_URL همیشه با مسیر مطلقِ فعلی همگام بماند
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"file:${APP_DIR}/db/custom.db\"|" "$APP_DIR/.env" 2>/dev/null && rm -f "$APP_DIR/.env.bak"
chown "$RUN_USER":"$RUN_USER" "$APP_DIR/.env" 2>/dev/null || chown "$RUN_USER" "$APP_DIR/.env" 2>/dev/null || true

# ── سرویس systemd ──
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=TAJ Electronics - فروشگاه ساز تاج الکترونیکس
After=network.target nginx.service

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=HOSTNAME=127.0.0.1
Environment=HOME=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/bin/sh ${APP_DIR}/scripts/docker-entrypoint.sh
Restart=always
RestartSec=3
TimeoutStartSec=180
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1
ok "سرویس systemd ساخته شد (اجرای خودکار بعد از ری‌بوت)"

# اسکریپت به‌روزرسانی هم داخل استقرار باشد
[ -f "$SRC_DIR/update.sh" ] && cp "$SRC_DIR/update.sh" "$APP_DIR/update.sh" && chmod +x "$APP_DIR/update.sh"
ok "تنظیمات کامل شد ($(($(elapsed) - T0)) ثانیه)"

# ══════════════════════════════════════════════════════════════════════
step 5 "تنظیم Nginx (ریورس‌پروکسی)"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)

SERVER_NAMES="_"
[ -n "$DOMAIN" ] && SERVER_NAMES="$DOMAIN www.$DOMAIN $SERVER_IP _"

cat > "$NGINX_CONF" <<EOF
# TAJ Electronics — v34 (generated by install.sh)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${SERVER_NAMES};

    client_max_body_size 64m;

    gzip on;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

# حذف سایت default توزیع (با default_server تداخل می‌کند)
[ -L /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default && say "سایت default توزیع غیرفعال شد"
# نسخهٔ قدیمی vhost در sites-enabled (نصب‌های قبلی احتمالی)
[ -L /etc/nginx/sites-enabled/taj-electronics ] && rm -f /etc/nginx/sites-enabled/taj-electronics

# SELinux (RHEL): اجازهٔ اتصال nginx به پورت داخلی
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce 2>/dev/null)" = "Enforcing" ]; then
  setsebool -P httpd_can_network_connect 1 >/dev/null 2>&1 || warn "SELinux: تنظیم httpd_can_network_connect انجام نشد"
fi

nginx -t >/dev/null 2>&1 || { nginx -t; die "تنظیمات Nginx نامعتبر است"; }
systemctl reload nginx >/dev/null 2>&1 || systemctl restart nginx >/dev/null 2>&1 || service nginx reload >/dev/null 2>&1 || true
ok "Nginx تنظیم شد — فروشگاه روی پورت 80 در دسترس است ($(($(elapsed) - T0)) ثانیه)"

# ══════════════════════════════════════════════════════════════════════
step 6 "گواهی SSL (Let's Encrypt)"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)
SSL_ON=0
if [ "$NO_SSL" = "1" ] || [ -z "$DOMAIN" ]; then
  warn "SSL نصب نشد (دامنه‌ای داده نشد یا --no-ssl) — فروشگاه روی HTTP کار می‌کند"
  warn "بعد از اتصال دامنه، دوباره sudo bash install.sh را اجرا کنید تا SSL فعال شود"
elif [ "$CERTBOT_OK" != "1" ]; then
  warn "certbot در دسترس نیست — بدون SSL ادامه می‌دهیم"
elif [ "$DNS_OK" != "1" ]; then
  warn "دامنه به این سرور اشاره نمی‌کند — SSL رد شد (بعد از تنظیم DNS دوباره اجرا کنید)"
else
  say "درخواست گواهی رایگان برای $DOMAIN…"
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
       --register-unsafely-without-email --redirect >/dev/null 2>&1; then
    SSL_ON=1; ok "SSL فعال شد: https://$DOMAIN (تمدید خودکار هر ۶۰ روز)"
  else
    warn "صدور گواهی ناموفق بود — فروشگاه فعلاً روی HTTP است (بعداً دوباره اجرا کنید)"
  fi
fi
ok "گام SSL انجام شد ($(($(elapsed) - T0)) ثانیه)"

# ══════════════════════════════════════════════════════════════════════
step 7 "راه‌اندازی و بررسی سلامت"
# ══════════════════════════════════════════════════════════════════════
T0=$(elapsed)
say "استارت سرویس (seed + همگام‌سازی اسکیما + اجرای سرور)…"
systemctl restart "$SERVICE_NAME"

HEALTHY=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" 2>/dev/null; then
    HEALTHY=1; break
  fi
  sleep 2
done
if [ "$HEALTHY" != "1" ]; then
  journalctl -u "$SERVICE_NAME" --no-pager -n 40 2>/dev/null || true
  die "برنامه سالم بالا نیامد — لاگ بالا را ببینید یا دوباره اجرا کنید: systemctl restart $SERVICE_NAME"
fi
ok "برنامه سالم است (/api/health → 200) ($(($(elapsed) - T0)) ثانیه)"

# فایروال
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "active"; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ok "پورت‌های 80 و 443 در فایروال باز شد"
fi

# ══════════════════════════════════════════════════════════════════════
# جمع‌بندی نهایی
# ══════════════════════════════════════════════════════════════════════
TOTAL=$((SECONDS - START_TIME))
MIN=$((TOTAL / 60)); SEC=$((TOTAL % 60))

if [ "$SSL_ON" = "1" ]; then
  SHOP_URL="https://${DOMAIN}"
elif [ -n "$DOMAIN" ]; then
  SHOP_URL="http://${DOMAIN}"
else
  SHOP_URL="http://${SERVER_IP}"
fi

DISK_MB="$(du -sm "$APP_DIR" 2>/dev/null | awk '{print $1}')"
RAM_MB="$(ps -o rss= -p "$(pgrep -f 'node .*server.js' | head -1)" 2>/dev/null | awk '{printf "%d", $1/1024}')"

echo
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║"
echo "║   ✅  نصب با موفقیت انجام شد — تاج الکترونیکس آماده است!"
echo "║"
echo "║   ⏱  کل نصب: ${MIN} دقیقه و ${SEC} ثانیه — بدون هیچ بیلدی روی سرور شما"
echo "║   💾  حجم برنامه: ${DISK_MB:-?}MB | 🧠 حافظهٔ اجرا: ~${RAM_MB:-200}MB"
echo "║"
echo "║   🌐   فروشگاه:        ${SHOP_URL}"
echo "║   👤   ویزارد نصب:     ${SHOP_URL}/install"
echo "║        (اولین بار: ادمین کل + تنظیمات اولیه را همان‌جا کامل کنید)"
echo "║"
echo "║   🛠 مدیریت:"
echo "║        وضعیت:      systemctl status ${SERVICE_NAME}"
echo "║        لاگ زنده:   journalctl -u ${SERVICE_NAME} -f"
echo "║        ری‌استارت:  systemctl restart ${SERVICE_NAME}"
echo "║        به‌روزرسانی: sudo bash ${APP_DIR}/update.sh"
echo "║        پشتیبان:    db/ و public/uploads/ داخل ${APP_DIR}"
echo "║"
echo "║   🔒 داده‌های شما (دیتابیس، آپلودها، .env) در به‌روزرسانی‌ها حفظ می‌شوند."
echo "╚══════════════════════════════════════════════════════════════════════╝"

# ── اطلاع‌رسانی تلگرام (اگر سرور به تلگرام دسترسی ندارد = سرور ایران) ──
TG_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://api.telegram.org/ 2>/dev/null || echo 000)"
if [ "$TG_CODE" = "000" ] || [ "$TG_CODE" = "" ]; then
  echo
  printf '\033[1;33m📢 توجه مهم و با احترام:\033[0m\n'
  echo "به نظر می‌رسد سرور شما به تلگرام دسترسی ندارد (احتمالاً سرور داخل ایران است)."
  echo "به دلیل فیلترینگ تلگرام در ایران، قابلیت «ربات تلگرامی» روی این سرور قابل"
  echo "استفاده نیست — بقیهٔ فروشگاه کاملاً معمولی کار می‌کند. اگر می‌خواهید از ربات"
  echo "تلگرام استفاده کنید، فروشگاه را روی یک سرور خارجی میزبانی کنید؛ سرورهای"
  echo "ترکیه، آلمان و انگلیس گزینه‌های مناسب با سرعت خوب هستند. سپاسگزاریم 🙏"
fi

# ── راهنمای پاک‌سازی Docker قدیمی (در صورت وجود) ──
if command -v docker >/dev/null 2>&1; then
  OLD_IMG="$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -i 'taj' | head -3 || true)"
  if [ -n "$OLD_IMG" ]; then
    echo
    warn "ایمیج‌های Docker قدیمیِ همین پروژه پیدا شد (چند گیگابایت فضا اشغال می‌کنند):"
    echo "$OLD_IMG" | sed 's/^/        /'
    echo "        برای آزادسازی فضا:  docker rmi $OLD_IMG && docker image prune -f"
  fi
fi

echo
ok "پیشنهاد: بلافاصله ${SHOP_URL}/install را در مرورگر باز کنید و مدیر کل بسازید."
