#!/bin/bash
# Fetch real product images — sequential-ish (max 2 parallel) with retries
OUT=/tmp/taj-img
mkdir -p $OUT

declare -A QUERIES=(
  [iphone-15-pro-max]="iPhone 15 Pro Max natural titanium smartphone product photo on white background"
  [galaxy-s24-ultra]="Samsung Galaxy S24 Ultra titanium gray smartphone product photo"
  [xiaomi-14]="Xiaomi 14 smartphone black product photo"
  [pixel-8-pro]="Google Pixel 8 Pro smartphone product photo"
  [iphone-13]="iPhone 13 blue smartphone product photo"
  [galaxy-a55]="Samsung Galaxy A55 smartphone product photo"
  [rog-strix-g16]="ASUS ROG Strix G16 gaming laptop product photo"
  [macbook-air-m3]="Apple MacBook Air M3 laptop product photo"
  [legion-5]="Lenovo Legion 5 gaming laptop product photo"
  [vivobook-15]="ASUS VivoBook 15 laptop product photo"
  [ps5-slim]="Sony PlayStation 5 console white product photo"
  [xbox-series-x]="Xbox Series X console black product photo"
  [rtx-4070-ti]="NVIDIA GeForce RTX 4070 Ti graphics card product photo"
  [i7-14700k]="Intel Core i7 14700K CPU processor product photo"
  [lg-ultragear-27]="LG UltraGear 27 inch gaming monitor product photo"
  [odyssey-g7]="Samsung Odyssey G7 curved gaming monitor product photo"
  [sony-xm5]="Sony WH-1000XM5 wireless headphones product photo"
  [airpods-pro-2]="Apple AirPods Pro 2 product photo"
  [apple-watch-9]="Apple Watch Series 9 product photo"
  [galaxy-watch-6]="Samsung Galaxy Watch 6 smartwatch product photo"
  [anker-powercore]="Anker PowerCore 20000mAh power bank product photo"
  [anker-gan65]="Anker 65W GaN USB C charger product photo"
  [samsung-990-pro]="Samsung 990 Pro NVMe SSD 1TB product photo"
  [mx-keys-s]="Logitech MX Keys S wireless keyboard product photo"
  [mx-master-3s]="Logitech MX Master 3S wireless mouse product photo"
  [epson-projector]="Epson home cinema projector product photo"
  [jbl-charge-5]="JBL Charge 5 portable bluetooth speaker product photo"
  [nest-hub]="Google Nest Hub smart display product photo"
)

fetch_one() {
  local key="$1"; local query="$2"
  # skip if already successfully fetched
  if [ -f "$OUT/$key.json" ] && head -c 20 "$OUT/$key.json" | rg -q '"success": ?true'; then
    return 0
  fi
  local raw
  for attempt in 1 2 3; do
    raw=$(timeout 150 z-ai image-search --query "$query" --count 3 --gl us --no-rank 2>/dev/null)
    if [ -n "$raw" ]; then
      printf '%s\n' "$raw" | sed -n '/^[[:space:]]*{/,$p' > "$OUT/$key.json"
      if head -c 20 "$OUT/$key.json" | rg -q '"success": ?true'; then
        return 0
      fi
    fi
    sleep 3
  done
  echo '{"success":false}' > "$OUT/$key.json"
}

JOBS=0
for key in "${!QUERIES[@]}"; do
  fetch_one "$key" "${QUERIES[$key]}" &
  JOBS=$((JOBS+1))
  if [ $((JOBS % 2)) -eq 0 ]; then wait; fi
done
wait
echo "DONE: $(ls $OUT | wc -l) files, $(rg -l '"success": ?true' $OUT 2>/dev/null | wc -l) ok"
