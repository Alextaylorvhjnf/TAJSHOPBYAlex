# 🚀 TAJ Electronics — Deployment Guide

> **The fast path:** upload the ZIP to any VPS, extract, run two commands.
>
> ```bash
> unzip taj-electronics-v20.zip   # extracts EVERYTHING into ./taj-electronics/ (self-contained)
> cd taj-electronics
> sudo bash setup.sh      # fresh server only: Docker + Compose + Node 22 + Bun + OpenSSL
> sudo ./install.sh       # builds the image and starts the app on port 3000
> ```
>
> 
> **⚠️ Upgrading from an older version (v12 or earlier)? Read this first.**
> The ZIP is **self-contained in a `taj-electronics/` folder** — never
> extract it *over* an old copy of the project. Old releases contain a
> `src/middleware.ts` file that newer releases replaced with
> `src/proxy.ts`; if both are present in the build directory the build
> fails with:
> `Both middleware file ... and proxy file ... are detected`.
> Also double-check the ZIP filename when unzipping (a missing `.zip`
> extension makes `unzip` fail silently and leaves the old files in
> place). The safe upgrade is:
>
> ```bash
> cd /var/www/YOUR-DOMAIN
> docker compose down -v 2>/dev/null || true        # stop the old stack from its folder
> rm -rf taj-electronics                             # remove the OLD release folder
> unzip taj-electronics-v20.zip                      # fresh self-contained extraction
> cd taj-electronics && cp .env.example .env         # then continue with install.sh
> ```
>
> (If you ever extracted an old release *flat* into the parent folder,
> remove those leftover files too: `rm -rf src public prisma scripts db
> node_modules .next Dockerfile docker-compose.yml .dockerignore
> package.json bun.lock .env .env.example install.sh setup.sh`.)

Then open **`http://YOUR-SERVER-IP:3000/install`** (or your domain) —
> the web wizard creates your admin account. The demo catalog (28
> products, categories, brands, sliders, stories) is already there —
> v12+ installs it automatically on the first container boot. Done.

**v13 adds the storefront template system:** Admin → تغییر قالب فروشگاه
offers 10 genuinely different homepage templates with real-data preview
and one-click apply — switching never rebuilds or touches store data.
Homepage story durations (3–10 s per slide) and the AI assistant's
deterministic order-tracking / product-search fallback (works without a
Gemini key) ship in the same release.

**v15 UX release:** tapping the header basket icon now opens a **mini-cart
side drawer** (edit quantities, remove, live totals — no page leave), the
homepage gains an **«محصولات انحصاری تاج»** section of large 3D-viewing
cards (pointer tilt + continuous product swing on hover), the floating AI
widget **lifts itself clear of the footer's Alaruz Design credit** instead
of covering it, and the footer link columns re-flow 1 → 2 → 4 across
PC widths.

**v23 release:** **mobile slider art + working compare (manual & AI) + GTA-VI
Vice City gaming template + timed flash deals + Zywra admin + AI comment
generator + mega menu / cart popovers + per-template feature toggles.**
The admin's **«تصویر موبایل» slider upload now actually renders on phones**
(every template + the shared hero: phones get the mobile artwork, ≥sm keeps
the desktop artwork — previously the desktop image was always shown). The
product-page **«مقایسه» button now opens a full compare dialog**: manual
compare (pick up to 3 rivals from the same category → /compare spec table)
and **AI smart compare** (pick one rival → the chat widget compares both
products from real store data — LLM path AND a deterministic no-key
fallback). The **gaming template is a complete GTA-VI Vice-City rebuild**:
synthwave artwork hero (CSS sun/grid/scanlines + pointer parallax), rounded
neon glass cards, acid-lime pill CTAs, a rotated «به وایس‌سیتی خوش آمدید»
tab, neon product pod, gamer-club panel and a kill-feed ticker. Products
gain an optional **«پایان تخفیف شگفت‌انگیز» deadline** (admin product form):
while the countdown runs the discount is live; **the moment it hits zero the
product is no longer on sale** (storefront, cart, checkout and search all
fall back to the base price). Templates that contain timers are
**auto-detected** and each timer/glow/snow/parallax effect gets an
**on/off switch in Admin → ظاهر → ویژگی‌های قالب**. Six market-style
templates gained a **products mega menu** (home/shop/about/contact nav +
full category/brand panel) and six app-like templates open a **mini-cart
popover under the basket icon** instead of the side drawer — the rest keep
their own headers. The **admin panel is restyled to the Zywra invoice-SaaS
reference** (260px grouped sidebar with indigo active states, tinted stat
cards, trends, segmented controls — light + dark). **Admin → دیدگاه‌ها**
gains the **AI comment generator**: it analyzes the product image (vision),
detects the audience, writes realistic Persian comments with
gender-matched names + a store reply per comment (persona name is
configurable, default = store name), and recomputes the product rating.
The chat widget now **proactively reminds visitors with items in their
cart** («سبد خریدت منتظرته — وقت درخشیدنه!») and all 24 non-gaming
templates received an artistic signature layer (aurora meshes, starfields,
rain streaks, sunburst rays, pastel bubbles…).
**DB upgrade is in-place safe** (`docker compose up -d --build`): additive
nullable columns only — `Product.discountEndsAt`, `Review.replyText /
replyAuthorName / repliedAt`, `StoreSettings.templateFeatures /
aiReviewReplier`; the entrypoint runs `prisma db push` automatically.

**v22 release:** **order-tracking widget v2 + Shop Agent Pro + automatic
product indexing + admin-controlled marquee speed.** The chat widget's
order tracking understands **real order numbers** (`TAJ-MTOCX9R9-422N`
alphanumeric — the old digits-only matcher never matched them, which is
why a bare order number fell into product search and answered «محصولی
مطابه پیدا نشد»): Persian digits are normalized, an order number and a
phone **stitch across conversation turns** (send the number, then just
the phone — no re-asking), the widget always asks for **only the missing
piece**, a logged-in customer's own orders are **auto-tracked via the
session with no phone prompt** (a bare «سفارشم کجاست؟» shows their latest
order), and nonexistent numbers get an honest not-found message. When a
**Gemini API key is placed**, the widget re-brands itself as **«ایجنت
فروش پرو» (Shop Agent Pro)** — pro header with PRO badge, pro greeting
and pro suggestion chips — while without a key it stays the smart
deterministic agent (which now reports **per color×spec combination
prices** for variable products and lists each combination's price/stock).
The admin **«اسکن و ایندکس محصولات» button is removed** — indexing is
fully automatic: every product create/update/patch/duplicate rebuilds its
searchText (name, brand, category, specs, colors, variants) on save, so
new products are answerable by the widget instantly (verified with a
fresh product found by color). Tool-call parsing was hardened so LLM
replies that embed the tool JSON after a Persian preamble actually
execute the tool instead of dumping raw JSON. A new **«سرعت حرکت نوار
متحرک» select** (Settings → فروشگاه) controls the speed of the marquee
ticker ads (خیلی سریع ۱۰s … خیلی آرام ۴۶s, or per-template default) and
applies to every template's header ticker. **In-place upgrade from v20 is
safe**: the only schema change is the additive nullable
`StoreSettings.tickerSpeed` column — synced automatically by the
container entrypoint's non-destructive `prisma db push`; no data
migration, no re-installation.

**v20 release:** **seamless infinite marquees + editable ticker
messages + FINNOVA-style admin + simple/variable products + transparent AI
diagnostics + 4D gaming redesign + template chrome on every page.**
Marquee direction is now RTL-correct — the announcement ticker, footer brand
strips and every moving rail loop with **zero gap and 100% viewport
coverage** (the old direction emptied the strip before restarting). A new
**«پیام‌های نوار متحرک» manager** (Settings → فروشگاه) lets the admin add,
edit or delete up to 8 rotating marquee messages (with optional links); an
empty list falls back to the single announcement. The **admin panel was
redesigned** to the reference SaaS look (white topbar, centered dark pill
nav, light-gray canvas, 20px cards with real mini charts, dark
latest-orders panel + indigo gradient order hero, pro login page) while
keeping all 4 v17 admin themes switchable. Products are now **SIMPLE or
VARIABLE** — variable products open a **combination price matrix (رنگ ×
مشخصه)** where each exact combination carries ONE absolute price + its own
stock (chips disable when a combination is sold out; cart/checkout charge
the exact combination price), and every admin money input groups digits
3-by-3 with Persian-digit support. The spec editor shows per-key smart
placeholders (ram → گیگابایت, os → Android/iOS …). The AI assistant delivers
a **full deterministic consultation** (price/stock/specs/colors/real
alternatives) even when no LLM engine is available, relevance gating keeps
weak matches out (S24 Ultra queries return exactly S24 Ultra), and engine
errors are **classified in Persian + written to the admin activity log**
(AI_TEST_FAIL / AI_ENGINE_FALLBACK / AI_ERROR with an analysis). The gaming
cyber template got a full **4D HUD redesign** (mouse-motion 3D hero with
crosshair tracker, 4D monitor rigs with RGB rings and FPS graphs, loadout
cards, kill-feed marquee) and the ARGB rig now lights up on **every store
page** in dark mode. Finally, switching the storefront template applies its
bespoke header/footer on **all pages** (product/listing/cart/checkout), not
just the homepage, and the checkout mobile overflow (55px at 375px) is
fixed. **In-place upgrade from v19 is safe** (`docker compose up -d
--build` from the new folder + existing volume): additive columns only
(`StoreSettings.tickerMessages`, `Product.productType`,
`Product.combinations`) — the container entrypoint's non-destructive
`prisma db push` syncs them automatically; no data migration, no
re-installation.

**v19 release:** **dark/light mode for every template** — each template's
chrome header carries a ☀️/🌙 toggle (next-themes, persisted per visitor;
the light default look is byte-identical to v18), and "dark"-tinted
chrome/footer surfaces become elevated dark surfaces in dark mode instead
of inverting to a light bar. The **gaming-cyber template turns into a
full ARGB/RGB rig in dark mode** (animated rainbow HUD frames, product
card auras, RGB headline, header/footer edge strips, ambient veil —
reduced-motion safe). The **AI shopping assistant got a smart search
engine**: Persian price constraints («زیر ۲۰ میلیون …») are strictly
enforced on the effective price, brands/categories are detected from the
free text (سامسونگ→Samsung, گوشی→موبایل …), typos like «تلوزیون» still
match («تلویزیون») and results are relevance-ranked — correct answers
with or without any LLM. New admin button **«اسکن و ایندکس محصولات»**
(Settings → AI) rebuilds the whole product index in one click. Products
now support **per-color prices and per-spec variant pricing** (different
capacity/version → different price and stock) end-to-end (product page
live price, cart, checkout snapshot — plus a cart serializer fix).
Fixed: newly marked **special products appear immediately** in the
exclusive homepage section, **story progress bars** are visible again
(0-height bug), the chat widget **never covers the Alaruz credit** on
template chrome footers, and **footer brand strips loop infinitely**.
The **ZarinPal gateway is fully aligned with the official v4 guide**:
optional `currency` (IRR default / IRT) and `referrer_id` settings in
the admin payment tab, forwarded on request/retry/verify with matching
amount units.
**Upgrading in place from v18 is safe** (`docker compose up -d
--build`): only additive schema columns (PaymentSettings.zarinpalCurrency
/ zarinpalReferrer) — the container's non-destructive `prisma db push`
syncs them on boot, no data is touched.

**v18 release:** **every non-default homepage template (all 24) now ships
its own bespoke header + footer** (8 header layouts × 8 footer layouts,
uniquely paired per template: logo, live search, category nav, account
and cart with live count; footer columns from the real CMS pages, live
categories and a moving brand photo strip — the Alaruz Design credit
stays prominent in every variant). The shared storefront header/footer
auto-hide **only on the homepage of the active template** (CSS `:has()`
gating) — the default template and every inner page (products, cart,
checkout…) are byte-identical to v17. The admin preview dialog now
renders the **complete** template with real data everywhere (slider,
photo categories, all product rails, exclusive 3D showcase, showcase
banners, stories, photo brands, FAQ) — no empty sections left in any
template, and category/brand boxes get representative photos from the
best-selling photographed product. Templates are **alive**: marquee
strips, floating hero collages, drifting blobs, looping Ken-Burns on
sliders/banners, shine CTAs, breathing badges, neon flicker and
staggered card entrances (all transform/opacity, reduced-motion safe).
Mobile fixed: zero horizontal overflow on all 24 templates at 375px
(RTL rail-leak guard + flash-deal card stacking).
**Upgrading in place from v17 is safe** (`docker compose up -d
--build`): frontend-only release — no schema changes at all.

**v17 release:** the **admin panel gets 4 photo-based themes + a fully
graphical dashboard**. A new «قالب پنل» picker in the admin header (and
mobile top bar) switches the whole panel between **«اکسل تیره»**
(charcoal + vibrant gradient KPI cards — the reference dashboard photo),
**«اکسل روشن»** (same look, light surfaces), **«SaaS تیره»** (navy/slate
with royal-blue accents, flat tinted cards — the Crextio photo) and
**«SaaS روشن»**; the choice is saved per browser and the storefront is
never affected (the theme attribute lives only on /admin routes). The
dashboard itself is rebuilt like the photos: gradient hero KPI cards,
icon-chip metric cards with trend pills, a donut chart with center
total, gradient bars/area charts, store-health progress bars and a
personalized greeting — all fed by the existing real stats API.
**Upgrading in place from v16 is safe** (`docker compose up -d
--build`): the change is purely frontend (no schema changes at all).

**v16 release:** **5 more homepage templates** (total 25 — Nexora Tech,
TechHub Dark, Purple Mall, Nova Glass, NovaTrend Clean, all rendered with
your real products/stories/categories/brands) plus the in-admin preview
dialog now renders **every** template (the 10 v14.1 templates previously
fell back to a loading skeleton). New **delivery system**: Admin →
سفارش‌ها و پرداخت → روش‌های ارسال manages the shipping options the
customer picks at checkout (پست پیشتاز/سفارشی، تیپاکس، چاپار، باربری،
پیک موتوری، اکسپرس ۲۴س، تحویل حضوری are pre-seeded) — the chosen method's
cost + ETA are stored on the order; with no active methods the checkout
falls back to the legacy flat shipping. Support tickets become a **live
chat with media**: both customers and admins can attach images/videos
(max 4 per message) and new messages appear automatically without a page
refresh. **In-place upgrade on v15 is safe** (`docker compose up -d
--build`): the schema changes are purely additive (DeliveryMethod table,
nullable order delivery fields, nullable message attachments column) —
`prisma db push` in the container entrypoint syncs them non-destructively
and existing data is untouched.

---

## Why a plain upload to a PHP host does not work

This is a **Next.js server application** (Node.js + database + image
processing), not a static site. PHP-only shared hosts (Apache/LiteSpeed
without Node.js support) return 404 for it. The installer below needs a
**VPS or any machine where Docker can run** (any Ubuntu/Debian/RHEL VPS
with 2 GB RAM and ~5 GB free disk works).

---

## What `install.sh` does (and never does)

| Step | Action |
|---|---|
| 1 | Detects the OS and **installs Docker + Compose only if missing** |
| 2 | Validates free disk (≥4 GB) and RAM (warns under 1.5 GB) |
| 3 | Checks that the project files are present |
| 4 | **Creates `.env` from `.env.example` — never overwrites an existing one** — and generates a strong random `AUTH_SECRET` (`openssl rand -hex 32`) |
| 5 | `docker compose build` (pinned **Bun 1.4.0** builder, slim **Node 22** runtime) |
| 6 | `docker compose up -d` — starts the app on port **3000** |
| 7 | Waits (up to 2 min) until **`/api/health`** returns HTTP 200 |
| 8 | Prints container status + the `/install` wizard URL |

Re-running `./install.sh` is **safe and idempotent** (existing `.env`,
database and uploads are preserved).

**It never asks for:** Gemini API key, ZarinPal Merchant ID, card
numbers — those are configured later from **Admin Panel → Settings**.

**Container startup order (v12, `scripts/docker-entrypoint.sh`):**
1. **First boot only:** the empty `taj_db` volume is initialized with the
     baked-in catalog database (demo catalog, **zero users, zero private
     data** — it is generated by `scripts/make-catalog-seed.ts` and audited
   so it never contains users/sessions/orders/messages).
2. **Every boot:** `prisma db push` (non-destructive, idempotent) keeps the
   database schema in sync after image updates — data is never deleted.
3. `node server.js` — the standalone Next.js server runs directly as the
   container command (`CMD ["node", "server.js"]`), no wrapper process.

**Database note:** the app ships with an embedded **SQLite** database
stored on the persistent `taj_db` Docker volume — no separate database
container, password or port is needed. All data (products, orders,
users, uploaded images) survives restarts, rebuilds and
`docker compose down`.

---

## First-run flow (web installer)

```text
install.sh finished
        ↓
container first boot: catalog seed installed → db push → node server.js
        ↓
open http://SERVER_IP:3000  →  auto-redirects to /install
        ↓
6-step wizard: system check → database setup → admin account → …
(your REAL admin account; the demo catalog is already in place)
        ↓
login at /admin  (SUPER_ADMIN)
        ↓
Admin Panel → Settings:
   • Payments → real ZarinPal Merchant ID (turn off Sandbox)
   • AI       → Gemini API key
   • ایمیل و SMTP → SMTP account (password-recovery emails)
```

---

## Daily management

```bash
docker compose ps          # status (should show "healthy")
docker compose logs -f     # live logs
docker compose restart     # restart the app
docker compose up -d       # start
docker compose down        # stop (data volumes are KEPT)
```

### Update to a new version

```bash
./update.sh
```

Rebuilds the image from the current source, restarts, waits for health.
Volumes (database + uploads) are never touched.

### Upgraded over an old volume — and /install redirects to the shop?
(v29.1) When you deploy a new version over the SAME Docker volume, the store
is already marked "installed", so `/install` permanently 307-redirects to `/`
— the first-run wizard never shows. That is by design (a live store must not
offer the installer to strangers), but after an upgrade YOU may want to run
the wizard again to apply the new defaults and create a fresh admin with a
one-time recovery phrase.

Two safe ways — both flip ONLY the install flag (products, orders, users,
uploads and settings are never touched):

1. **From the admin panel** (easiest): log in as a SUPER_ADMIN →
   تنظیمات (Settings) → فروشگاه (Store tab) → «ویزارد نصب اولیه» card →
   «اجرای مجدد ویزارد نصب» → confirm → you land on `/install` immediately.
2. **From the server terminal**:
   ```bash
   docker compose exec app node scripts/reset-install.mjs
   ```

Then run the wizard: it creates a NEW admin (old admins keep working),
fills only empty settings defaults, and imports the demo catalog only when
the catalog is empty (existing data is never overwritten). The final step
re-locks the installer automatically.

**Fresh install instead?** If you do NOT want the old data at all:
`docker compose down -v` (removes volumes) → `./install.sh` — first boot
seeds the demo catalog and the wizard opens on a clean slate.

### "خطا در ارتباط با سرور (500)" after an upgrade
If the old database predates the new schema columns and the container's
`prisma db push` failed or never ran, older versions 500'd on every page.
v29.1 is self-healing: on the first database access the app adds any missing
columns itself (plain `ALTER TABLE`, non-destructive) — storefront, admin
login and APIs recover automatically within one request. No action needed.

### Upgrade from an OLD deployment (≤ v11, e.g. the
`Cannot find module './server.js'` / `start-with-migration.js` error)

Old images wrapped the server in `scripts/start-with-migration.js`, which
looked for `server.js` in the wrong folder — that wrapper is gone in v12.
To replace an old deployment **while keeping all data**:

```bash
cd /var/www/your-path/taj-electronics     # old folder
docker compose down                        # stop the old container

# upload taj-electronics-v12.zip next to it, then:
unzip -o taj-electronics-v12.zip -d taj-electronics-v12
cp taj-electronics/.env taj-electronics-v12/.env      # keep your AUTH_SECRET etc.
cd taj-electronics-v12
sudo ./install.sh                          # builds v12 image, reuses volumes
```

The named volumes (`taj_db`, `taj_uploads`) survive — products, orders,
users and uploads are preserved. (If the old deployment used a different
compose project name, its volumes are named differently — copy the old
volume content or just start fresh with the v12 demo catalog.)

### Backup

```bash
./backup.sh
```

Pauses the app a few seconds for a consistent snapshot, archives the
database + uploads into `./backups/taj-db-<timestamp>.tar.gz` and
`taj-uploads-<timestamp>.tar.gz`, restarts, verifies health. Old
backups are never deleted automatically.

### Restore (manual, documented)

```bash
docker compose down
docker volume rm taj-electronics_taj_db taj-electronics_taj_uploads
docker volume create taj-electronics_taj_db
docker volume create taj-electronics_taj_uploads
docker run --rm -v taj-electronics_taj_db:/data -v "$(pwd)/backups:/backup" alpine \
  tar xzf /backup/taj-db-YOUR-TIMESTAMP.tar.gz -C /data
docker run --rm -v taj-electronics_taj_uploads:/data -v "$(pwd)/backups:/backup" alpine \
  tar xzf /backup/taj-uploads-YOUR-TIMESTAMP.tar.gz -C /data
docker compose up -d
```

---

## Domain + HTTPS (Nginx reverse proxy)

The app listens on `127.0.0.1:3000` (published as port `3000`).
Put Nginx in front for your domain — **the installer never touches an
existing Nginx config**; do this manually:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/taj
```

```nginx
server {
    listen 80;
    server_name YOUR-DOMAIN;          # e.g. shoping.alexvshop.ir

    client_max_body_size 10m;         # product image uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/taj /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR-DOMAIN        # free HTTPS, auto-renews
```

Then record the domain in the app:

```bash
sudo ./install.sh --domain YOUR-DOMAIN     # sets NEXT_PUBLIC_SITE_URL in .env
./update.sh                                # env change requires container restart
```

(No domain is hard-coded anywhere — the same ZIP works for any domain.
`NEXT_PUBLIC_SITE_URL` only affects sitemap/emails/payment callbacks.)

**DNS:** point an `A` record for your domain at the server IP first.

---

## Alternative deployments (without Docker)

### Node.js PaaS (Liara / ArvanCloud / Railway / Render)

- Build: `bun install && bunx prisma generate && bun run build`
- Start: `npm run start:node`
- Env: `DATABASE_URL` → SQLite path on a **persistent disk**,
  `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`
- Open the site → the `/install` wizard runs the same way.

### cPanel with "Setup Node.js App"

Only if your cPanel shows the **Setup Node.js App** icon:

1. Upload the ZIP to your home dir (`/home/USER/`, not `public_html`), extract
2. Setup Node.js App → Production, root `taj-electronics`, startup file `server.js`
3. Run NPM Install, add env vars (`DATABASE_URL=file:/home/USER/taj-electronics/db/custom.db`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`)
4. Terminal: `cd ~/taj-electronics && source ~/nodevenv/taj-electronics/20/bin/activate && bunx prisma generate && npm run build`
5. Restart the app → the wizard appears.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `install.sh` dies at "Docker Compose is not available" | Install `docker-compose-plugin` (Debian/Ubuntu: `apt install docker-compose-v2`) or run `sudo bash setup.sh` |
| Container shows `unhealthy` | `docker compose logs -f app` — most likely a missing `AUTH_SECRET` in `.env` (re-run `./install.sh`) |
| 502 from Nginx | App not running: `docker compose ps` + `docker compose logs app` |
| `/install` says already installed | The DB volume contains a previous install. To start fresh: `docker compose down && docker volume rm taj-electronics_taj_db` (⚠ deletes all data) |
| Build fails with OOM | Add swap (`fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`) or build with more RAM |
| `"Cannot find package 'effect'"` / `"Cannot find package 'fast-check'"` from `@prisma/config` | Fixed since v7 — the **full Prisma CLI dependency closure** (including `effect` + `fast-check` + engines) is computed automatically at image build time (`scripts/prisma-cli-closure.js`), and the build fails loudly if any CLI dependency is missing |
| `Cannot find module './server.js'` from `scripts/start-with-migration.js` | **Old image (≤v11).** v12 removed that wrapper: `CMD ["node", "server.js"]` + `scripts/docker-entrypoint.sh` deploy the standalone server at `/app/server.js`. Deploy the v12 ZIP (see "Upgrade from an old version" below) — volumes keep their data |
| `Prisma Client could not locate the Query Engine for runtime "debian-openssl-1.1.x"` | **Fixed in v13.3.** Cause: `node:22-slim` ships no `openssl` CLI, so Prisma's platform detection fell back to the legacy 1.1.x target while the image only contained the 3.0.x engine. Fix: the runtime stage now installs `openssl` (correct detection + libssl3), and `schema.prisma` ships engines for **both** `debian-openssl-1.1.x` and `debian-openssl-3.0.x` via `binaryTargets`. Rebuild the image: `docker compose up -d --build` |
| Uploaded image preview 404s in production (file exists on disk) | **Fixed in v14.1.** The standalone server caches the `public/` file list at startup, so runtime uploads were 404'd. `/uploads/[...path]` now serves files straight from disk (with Range support for story videos). Rebuild: `docker compose up -d --build` |
| EADDRINUSE :3000 | Another service uses port 3000 — change `"3000:3000"` in docker-compose.yml (left side only) |

---

## 🔄 In-panel updates (v29.2 — Update Script)

Starting with v29.2 the shop can update ITSELF from the admin panel —
**تنظیمات ← به‌روزرسانی اسکریپت**. You host a small `update-manifest.json`
plus a ZIP of the changed files; the panel checks, downloads, verifies the
SHA-256, backs up the current code, applies ONLY code paths (`src/`, `public/`
except uploads, `scripts/`, `prisma/`, configs), runs an additive
`prisma db push`, and the container restarts onto the new code.
`db/`, `.env` and `uploads/` are NEVER touched — orders, users, products and
uploaded media always survive. Full Persian guide: **UPDATE-GUIDE.md**.

### Where to host the update files
1. **GitHub (recommended)** — create a repo (e.g. `taj-updates`), put
   `update-manifest.json` + the version ZIPs in it, and set the manifest URL to
   the raw file (or attach both to a GitHub Release and use the release asset
   URLs — both work).
2. **Your own server** — upload the manifest + ZIP to e.g.
   `public_html/updates/` on the same hosting that serves your site and set
   `https://your-domain/updates/update-manifest.json`.

If `package.json` gained new dependencies, run once after the update:
`docker compose exec app bun install`.
