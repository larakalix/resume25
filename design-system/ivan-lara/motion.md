# Interaction motion

Motion adds continuity and tactile feedback to the approved design without page-wide entrances.

- Navbar: one persistent highlight travels between equal-width route targets, 280ms, `cubic-bezier(.22,1,.36,1)`. Focus and navigation are immediate; Blog remains active on article routes.
- Project previews: framed images lift 4px and tilt 2 degrees from the lower edge, 280ms. Text and card layout stay stable. Mouse hover is restricted to fine pointers; keyboard focus gets the same cue.
- Link arrows: two decorative icons on one 18px track roll diagonally on hover/focus, 240ms, and retarget on exit. Shared atom: `AtMotionArrow`.
- Project filters: Vue TransitionGroup moves surviving cards to their new positions in 280ms. Newly matching cards settle from a small tilted scale; removed items leave immediately so results and counts remain current. There is no initial grid entrance.
- Controls: immediate .97 press scale, existing 160ms release. Email copy confirms on the originating button and retains the announced status/failure fallback.
- Link rules draw from the leading edge over 240ms. No idle loops or sound were added. Removed the old whole-home fade/translation entrance.

Shared timing/curve tokens live in main.css. No animation library was added. Transform-based transitions retarget when interrupted. Reduced-motion CSS removes spatial transitions; controls, filtering, focus, and route state stay usable. Hover cues are never required to discover or activate an action.

Validation scope: local desktop browser and responsive viewport checks; physical touch devices and a slowed DevTools animation recording require separate verification.

Local verification: lint, typecheck, production build, 14 unit and 13 route tests passed. Computed keyboard-focus transforms confirmed the preview's perspective tilt and the arrow track's (18px, -18px) diagonal travel; navbar transition computed at 280ms. Rapid React/Next.js filtering and browser Back restored the correct query/count. Copy email displayed `Copied ✓` with announced feedback. All five pages had no horizontal overflow at 375, 768, 1024 and 1440px; mobile navbar targets measured at least 44px high. Browser warning/error log was empty. Reduced-motion branches were inspected in source, not exercised through OS emulation; no physical touch-device or slowed DevTools recording was performed.
