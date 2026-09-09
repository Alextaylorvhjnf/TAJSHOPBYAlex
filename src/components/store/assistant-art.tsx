import { useId } from "react";

/**
 * v32 (13-g) · CODE-DRAWN PREMIUM AI ASSISTANT — «the Concierge Robot»
 * --------------------------------------------------------------------
 * One tasteful inline-SVG persona (no external assets) used as the DEFAULT
 * art of the floating AI chat widget for every template family except
 * gaming-cyber (which keeps its photographic arcade persona).
 *
 * The design ADAPTS ITS ACCENT to the active template family: fills consume
 * the widget-skin custom properties --w-accent / --w-accent2 (set by
 * [data-wskin] in widget-skins.ts — tech=cyan/teal, gold=amber, warm=rose,
 * violet=purple, neutral=graphite, …). When no skin is active the accents
 * fall back to the site's --primary, so the robot always matches the store.
 *
 * Rendered at 40–56px (FAB / panel header / empty state). The eyes blink
 * softly (CSS in WIDGET_SKIN_CSS, prefers-reduced-motion safe). The visor
 * stays deep charcoal so it reads on both light and dark canvases.
 */
export function AssistantRobot({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const body = `ar-body-${uid}`;
  const visor = `ar-visor-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={body} x1="10" y1="6" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--w-accent, var(--primary, #D4AF37))" />
          <stop offset="1" stopColor="var(--w-accent2, var(--primary, #8C6A12))" />
        </linearGradient>
        <linearGradient id={visor} x1="15" y1="17" x2="49" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B0F17" />
          <stop offset="1" stopColor="#1A2230" />
        </linearGradient>
      </defs>

      {/* antenna + softly pulsing beacon */}
      <line x1="32" y1="5.5" x2="32" y2="10.5" stroke="var(--w-accent, var(--primary, #D4AF37))" strokeWidth="2" strokeLinecap="round" opacity=".85" />
      <circle cx="32" cy="5" r="2.6" fill="var(--w-accent2, var(--primary, #8C6A12))" className="cw-ar-pulse" />

      {/* head — accent gradient shell with a light top edge */}
      <rect x="10" y="10.5" width="44" height="33.5" rx="12" fill={`url(#${body})`} />
      <rect x="10.9" y="11.4" width="42.2" height="31.7" rx="11.1" stroke="rgba(255,255,255,.38)" strokeWidth="1" />

      {/* visor — deep charcoal band */}
      <rect x="15" y="17" width="34" height="20" rx="9" fill={`url(#${visor})`} />
      <rect x="15.7" y="17.7" width="32.6" height="18.6" rx="8.4" stroke="rgba(255,255,255,.10)" strokeWidth="1" />

      {/* eyes — soft ice glow, gentle blink */}
      <g className="cw-ar-eyes">
        <rect x="21" y="23.4" width="8" height="6.6" rx="3.3" fill="#EAF6FF" />
        <rect x="35" y="23.4" width="8" height="6.6" rx="3.3" fill="#EAF6FF" />
      </g>

      {/* accent cheek dots */}
      <circle cx="19.4" cy="37.6" r="1.4" fill="var(--w-accent2, var(--primary, #8C6A12))" opacity=".75" />
      <circle cx="44.6" cy="37.6" r="1.4" fill="var(--w-accent2, var(--primary, #8C6A12))" opacity=".75" />

      {/* neck + shoulders */}
      <rect x="28" y="44" width="8" height="5" rx="2.4" fill={`url(#${body})`} opacity=".9" />
      <path d="M12 60c2.6-7.2 10.4-11 20-11s17.4 3.8 20 11v1H12z" fill={`url(#${body})`} />
      {/* chest sigil */}
      <path d="M32 47.6l1.7 3.4 3.4.5-2.5 2.4.6 3.4-3.2-1.7-3.2 1.7.6-3.4-2.5-2.4 3.4-.5z" fill="#EAF6FF" opacity=".9" />
    </svg>
  );
}
