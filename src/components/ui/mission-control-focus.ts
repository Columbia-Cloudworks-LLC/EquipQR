/**
 * Shared #635 focus-ring fragments for shadcn/Radix primitives.
 * WCAG: bright `ring` / `sidebar-ring` from `src/index.css` mission-control tokens.
 */
export const MC_FOCUS_VISIBLE_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" as const;

/** `focus:` (not `focus-visible`) for Radix close buttons, toast actions, badges */
export const MC_FOCUS_RING =
  "focus:outline-none focus:ring-[3px] focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" as const;

export const MC_FOCUS_VISIBLE_SIDEBAR =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" as const;
