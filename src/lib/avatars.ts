/**
 * v27.1 — user profile avatar presets.
 * The account page lets the customer pick a face (girl/man styles) from
 * this list; the choice is stored on User.avatar and rendered by the
 * storefront header / account surfaces. Uploads (POST /api/upload folder
 * "avatars") are also accepted as custom avatars.
 */

export interface AvatarPreset {
  /** public path served from /public */
  src: string;
  /** short Farsi label */
  label: string;
  /** gender grouping for the picker UI */
  group: "female" | "male";
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { src: "/avatars/girl-1.png", label: "دختر — خنده‌رو", group: "female" },
  { src: "/avatars/girl-2.png", label: "دختر — روسری", group: "female" },
  { src: "/avatars/girl-3.png", label: "دختر — باحال", group: "female" },
  { src: "/avatars/girl-4.png", label: "دختر — فان", group: "female" },
  { src: "/avatars/man-1.png", label: "پسر — کلاسیک", group: "male" },
  { src: "/avatars/man-2.png", label: "پسر — عینکی", group: "male" },
  { src: "/avatars/man-3.png", label: "پسر — اسپرت", group: "male" },
  { src: "/avatars/man-4.png", label: "پسر — هنری", group: "male" },
];

export const AVATAR_GROUPS: { id: "female" | "male"; label: string }[] = [
  { id: "female", label: "دخترانه" },
  { id: "male", label: "پسرانه" },
];

export function isAvatarPreset(src: string | null | undefined): boolean {
  if (!src) return false;
  return AVATAR_PRESETS.some((p) => p.src === src);
}
