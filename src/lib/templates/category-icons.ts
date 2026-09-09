import {
  BatteryCharging,
  Cable,
  Camera,
  CircuitBoard,
  Computer,
  Cpu,
  Gamepad2,
  HardDrive,
  Headphones,
  Headset,
  Keyboard,
  Laptop,
  LayoutGrid,
  Lightbulb,
  MemoryStick,
  Monitor,
  Mouse,
  Plug,
  Printer,
  Router,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  Usb,
  Watch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * CATEGORY ICON MAP (v32 / 14-c-2)
 * -------------------------------------------------------------------
 * Maps Persian category names / english slugs → Lucide icons for the
 * mega-menu rails, tiles and shared category lists (header mobile nav,
 * search suggestions). Matching is substring-based on NORMALIZED text,
 * so compound names like «لوازم جانبی موبایل» or «قطعات کامپیوتر»
 * resolve, and rule ORDER decides (specific accessories before generic
 * devices, generic «قطعات» last). Unknown names fall back to the
 * graceful default icon (LayoutGrid).
 */

export const DEFAULT_CATEGORY_ICON: LucideIcon = LayoutGrid;

/** ordered rules — FIRST keyword hit wins (keys are pre-normalized) */
const RULES: readonly { keys: readonly string[]; icon: LucideIcon }[] = [
  /* هندزفری / ایربادز — in-ear (lucide has no earbud glyph → Headset) */
  { keys: ["هندزفری", "ایربادز", "ایرباد", "ایرپادز", "ایرپاد", "earbud", "earpod", "airpod", "headset"], icon: Headset },
  /* هدفون — over-ear */
  { keys: ["هدفون", "headphone"], icon: Headphones },
  { keys: ["کیبورد", "کلید", "keyboard"], icon: Keyboard },
  { keys: ["ماوس", "موس", "mouse"], icon: Mouse },
  { keys: ["مانیتور", "monitor", "display"], icon: Monitor },
  { keys: ["لپ تاپ", "لپتاپ", "نوت بوک", "laptop", "notebook", "macbook"], icon: Laptop },
  /* پردازنده / CPU */
  { keys: ["پردازنده", "سی پی یو", "cpu", "processor"], icon: Cpu },
  /* کارت گرافیک / مادربرد */
  { keys: ["کارت گرافیک", "گرافیک", "مادربرد", "gpu", "graphic", "motherboard", "mainboard"], icon: CircuitBoard },
  /* حافظه موقت / RAM */
  { keys: ["رم", "رام", "ram", "memory"], icon: MemoryStick },
  { keys: ["کابل", "cable", "cord"], icon: Cable },
  /* فلش / USB */
  { keys: ["فلش", "یو اس بی", "flash", "usb", "pendrive"], icon: Usb },
  /* هارد / SSD / استوریج */
  { keys: ["هارد", "اس اس دی", "استوریج", "ذخیره", "حافظه", "ssd", "hdd", "nvme", "storage", "hard", "drive"], icon: HardDrive },
  /* موبایل / گوشی */
  { keys: ["موبایل", "گوشی", "تلفن", "phone", "mobile", "smartphone", "cell"], icon: Smartphone },
  { keys: ["کامپیوتر", "سیستم", "computer", "desktop", "pc"], icon: Computer },
  { keys: ["تبلت", "tablet", "ipad"], icon: Tablet },
  /* ساعت / پوشیدنی */
  { keys: ["ساعت", "پوشیدنی", "watch", "smartwatch", "wearable"], icon: Watch },
  { keys: ["دوربین", "عکاسی", "لنز", "camera", "photo"], icon: Camera },
  /* کنسول / گیمینگ */
  { keys: ["کنسول", "بازی", "گیم", "console", "game", "gaming", "playstation", "xbox", "nintendo"], icon: Gamepad2 },
  { keys: ["اسپیکر", "بلندگو", "speaker", "soundbar"], icon: Speaker },
  /* پاوربانک / شارژر / باتری */
  { keys: ["پاوربانک", "پاور بانک", "باتری", "شارژر", "powerbank", "power bank", "battery", "charger", "charging"], icon: BatteryCharging },
  { keys: ["تلویزیون", "تی وی", "tv", "television"], icon: Tv },
  { keys: ["پرینتر", "چاپگر", "اسکنر", "printer", "scanner", "plotter"], icon: Printer },
  /* شبکه / مودم / روتر */
  { keys: ["شبکه", "مودم", "روتر", "وای فای", "وایفای", "سوئیچ", "network", "modem", "router", "wifi", "switch", "lan"], icon: Router },
  { keys: ["روشنایی", "لامپ", "light", "lamp", "bulb"], icon: Lightbulb },
  /* لوازم جانبی / گجت */
  { keys: ["جانبی", "گجت", "accessor", "gadget", "peripheral"], icon: Plug },
  /* قطعات (generic) — LAST so «قطعات کامپیوتر» resolves to Computer etc. */
  { keys: ["قطعات", "قطعه", "part", "component", "spare"], icon: Cpu },
];

/**
 * Normalize Persian (and latin) text for fuzzy matching:
 * ZWNJ/ZWSP → space · Arabic ي/ى → Persian ی · Arabic ك → Persian ک ·
 * tatweel + harakat stripped · digits + punctuation dropped ·
 * spaces collapsed · lowercased (for latin slug keywords).
 */
function normalizeCategoryText(input: string): string {
  return (input ?? "")
    .replace(/[\u200b-\u200f\u2060]/g, " ")
    .replace(/[\u064a\u0649]/g, "\u06cc")
    .replace(/\u0643/g, "\u06a9")
    .replace(/\u0640/g, "")
    .replace(/[\u064b-\u0652]/g, "")
    .replace(/[0-9\u0660-\u0669\u06f0-\u06f9]/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Resolve the Lucide icon for a category. Checks the (normalized)
 * Persian name AND the slug together, in rule order; anything
 * unrecognized → DEFAULT_CATEGORY_ICON.
 *
 *   getCategoryIcon("موبایل")            // Smartphone
 *   getCategoryIcon("قطعات کامپیوتر")     // Computer
 *   getCategoryIcon("هندزفری بی‌سیم")     // Headset  (ZWNJ handled)
 *   getCategoryIcon("نامع...", "laptops") // Laptop   (slug fallback)
 */
export function getCategoryIcon(nameFa: string, slug?: string): LucideIcon {
  const text = normalizeCategoryText(`${nameFa ?? ""} ${slug ?? ""}`);
  if (text) {
    for (const rule of RULES) {
      for (const key of rule.keys) {
        if (text.includes(key)) return rule.icon;
      }
    }
  }
  return DEFAULT_CATEGORY_ICON;
}

/** short alias */
export const getIcon = getCategoryIcon;
