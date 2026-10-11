---
name: "Ivan Lara"
description: "An original explorable meadow planet with conversational portfolio content and preserved shared routes."
colors:
  primary: "#0066cc"
  background: "#ffffff"
  title: "#1d1d1f"
  paragraph: "#64646c"
  surface: "#f5f5f7"
  surface-muted: "#edf3fb"
  border: "#dcdce1"
  accent-soft: "#e8f2ff"
  primary-dark: "#72b6ff"
  background-dark: "#101114"
  title-dark: "#f5f5f7"
  paragraph-dark: "#b0b3bc"
  surface-dark: "#1b1d23"
  surface-muted-dark: "#1b293d"
  border-dark: "#383c46"
  accent-soft-dark: "#182f4d"
  world-paper: "#fffdf3"
  world-ink: "#263f38"
  world-muted: "#51675e"
  world-blue: "#245a50"
  world-line: "#ced8c7"
  world-soft: "#eef3e6"
  world-paper-dark: "#213b38"
  world-ink-dark: "#f1f4df"
  world-muted-dark: "#c2d4c6"
  world-blue-dark: "#b5dfb6"
  world-line-dark: "#54766b"
  world-soft-dark: "#2b4942"
  street-atmosphere: "#b9e4f1"
  street-night: "#243d6c"
  street-blue: "#427eea"
  street-ink: "#263e59"
  street-cream: "#fff0ce"
  street-sand: "#e4bd8e"
  street-grass: "#98cfa1"
  street-green: "#468b65"
  street-mint: "#b9e3c2"
  street-wood: "#a77050"
  street-gold: "#f8c760"
  street-pale: "#9edbdc"
  street-skin: "#f2c6a1"
  street-hair: "#37415a"
  street-coral: "#ed8c76"
  street-red: "#d85569"
  street-violet: "#9b8bc9"
  street-sign-ink: "#29455d"
  street-sign-paper: "#fff5dc"
  street-stick: "#fff9edde"
  street-stick-line: "#536b6c66"
  street-stick-knob: "#427eea"
  street-identity-shadow: "#34414920"
  street-control-shadow: "#34414925"
  street-surface-shadow: "#24363d25"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(3.5rem, 7vw, 5.5rem)"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-.04em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.035em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".875rem"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "normal"
  world-identity:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.025em"
  world-content-heading:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-.025em"
  world-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".9375rem"
    fontWeight: 400
    lineHeight: 1.75
  world-action:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".8125rem"
    fontWeight: 400
  world-caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".6875rem"
    fontWeight: 400
  world-loading:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  world-dialogue:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  world-resident-heading:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-.025em"
  world-pet-heading:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.1
  world-pet-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".9375rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  card: "16px"
  image: "8px"
  tag: "6px"
  pill: "9999px"
  world-pill: "999px"
  street-key: "4px"
  street-control: "14px"
  street-container: "12px"
  street-panel: "14px"
spacing:
  section: "7rem"
  section-mobile: "4.5rem"
  gutter: "2rem"
  gutter-mobile: "1.25rem"
  grid-gap: "1.5rem"
  street-gutter: "1.15rem"
  street-gutter-mobile: "1rem"
  street-panel: "1.3rem"
  street-panel-mobile: "1rem"
  street-control-gap: ".6rem"
  street-control-gap-mobile: ".45rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-outline:
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-ghost:
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    height: "44px"
  technology-tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.paragraph}"
    rounded: "{rounded.tag}"
    padding: ".2rem .65rem"
  project-image:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "1.25rem"
  navigation-link:
    textColor: "{colors.paragraph}"
    height: "44px"
  text-action:
    textColor: "{colors.primary}"
    height: "44px"
  disclosure:
    height: "56px"
  street-hud-button:
    backgroundColor: "{colors.world-paper}"
    textColor: "{colors.world-ink}"
    rounded: "{rounded.street-control}"
    height: "46px"
    width: "46px"
  street-hud-hover:
    backgroundColor: "{colors.world-soft}"
    textColor: "{colors.world-blue}"
    rounded: "{rounded.street-control}"
  street-prompt:
    backgroundColor: "{colors.world-paper}"
    textColor: "{colors.world-ink}"
    rounded: "{rounded.world-pill}"
    typography: "{typography.world-action}"
    height: "44px"
    padding: ".5rem .85rem"
  street-identity:
    backgroundColor: "{colors.world-paper}"
    textColor: "{colors.world-ink}"
    rounded: "{rounded.street-container}"
    padding: ".65rem .85rem"
  street-dropdown:
    backgroundColor: "{colors.world-paper}"
    rounded: "{rounded.street-container}"
    padding: "1rem"
    width: "min(265px, calc(100vw - 5.7rem))"
  street-panel:
    backgroundColor: "{colors.world-paper}"
    textColor: "{colors.world-ink}"
    rounded: "{rounded.street-panel}"
    width: "min(390px, calc(100% - 110px))"
  world-skill:
    backgroundColor: "{colors.world-soft}"
    textColor: "{colors.world-ink}"
    rounded: "{rounded.world-pill}"
    padding: ".3rem .65rem"
  world-hat-select:
    rounded: "{rounded.world-pill}"
    height: "44px"
    width: "100%"
  world-pet-action:
    rounded: "{rounded.world-pill}"
    height: "44px"
---

## Current surface: meadow planet

The active homepage is `MlGlobeWorld` and `src/experience/globe/`. The user explicitly requested a newly built, larger spherical world, interactive animals and buildings, real interiors, conversational information and run/jump/crouch/wave controls. This supersedes the earlier street-only constraints below. See [the current world contract](docs/meadow-world.md) for colors, controls, architecture, content boundaries and validation. The shared blue portfolio design still governs other routes and lower-homepage content. Earlier street/village sections are historical and do not certify this implementation.


# Design System: Ivan Lara

## Overview

**Creative North Star: "Ivan's little world"**

The homepage is an original, playable workshop neighborhood. The user’s Adeleine reference establishes short three-head proportions, large expressive eyes, soft clothing and chunky footwear; the subject remains Ivan. Rounded cream cottages, blue/coral/violet roofs, planted paving, a stream and an arched blue bridge use the same soft PBR material language. The previous realistic-headed cel street and elevated globe are superseded visual baselines.

Shared routes retain their established Apple-inspired blue actions, platform typography, cool neutrals and source-backed previews. The new scene replaces the artwork, not content acquisition: all professional copy remains HTML and projects remain in the independent gallery below.

**Key characteristics:** original geometry and seven authored motion clips, a compact front-facing opening greeting, a lower follow camera, Mira and Patch, six direct Places, preserved seasonal hats, independent day/night and HTML themes, and keyboard/touch/text alternatives. No fan-art mesh, textures or downloaded rig ship in this neighborhood.

## Colors

### Primary

Action Blue and its dark Sky Blue partner retain the shared-route accent. The homepage uses the local World Blue pair for readable actions and focus. These are separate from the scene's cornflower-blue material color.

### Neutral

Shared white/ink/gray and dark neutral pairs retain their existing roles. On the homepage, World Paper, Ink, Muted, Line and Soft each have an explicit dark counterpart extracted from `ml-street-world.vue`. The scene pairs warm cream plaster and paving with blue/coral/violet roofs, mint planting, turquoise water and Ivan’s blue jacket; daylight is the initial lighting mode. The HTML theme and scene Day/Night/Auto control are independent.

The street atmosphere token is both the stage fallback and day sky/fog. The stick knob and translucent stick/line tokens are deliberate touch-control treatments. Identity, control and surface-shadow colors are literal source values, not additional brand accents. Scene palettes are scoped to `/`; ordinary content below the stage and all other routes retain their shared reading ground.

**The Action Blue Rule.** Use the shared theme accent outside the homepage and the local semantic blue for its HTML actions, focus and links; scene materials do not define text contrast.

## Typography

Display and body retain the user-pinned platform stack. Shared introductory text uses the body token; project/article summaries use .9375rem, navigation .875rem, tags .75rem and article text 1.0625rem/1.85. Project descriptions cap at 65ch and the article column at 760px. Page titles use clamp(2.75rem, 6vw, 4.5rem), with a 3rem mobile override. Preserve mixed case and heading order.

Self-hosted Bricolage Grotesque supplies the compact street identity and shared world-content headings. It preloads only on `/`, with swap and weights 600–700. Identity subcopy, hints and footer links use the small world-caption role; identity subcopy hides below 768px. The action role serves prompt/dropdown copy and key labels. Resident dialogue retains its explicit fictional badge and existing heading/body roles; Patch retains the pet heading/body roles. The small UI steps do not replace the shared reading scale. Professional facts remain selectable HTML; original CanvasTexture shop lettering is scenery only.

## Layout

The shared centered shell caps at 1184px including gutters. Preserve the established section/gutter tokens, three/two/one project and writing grids at 1024px/540px, and two/one home writing grid. Experience/resume columns stack below 768px. Shared navigation wraps into a second visible row on mobile, preserving all five destinations.

Only `/` omits the shared navbar. Its street stage fills 100svh with a 540px minimum; heights up to 540px use a 360px minimum. A compact identity sits at top left; Menu and six-target Places stack at top right. Stage insets use the street gutter tokens. The desktop prompt is centered above the footer. Below 768px, the prompt moves into the upper-left reserve at 76px with touch-specific help; movement stick, Hop/Wave, settings and footer occupy separate lower regions. Fine-pointer desktop walking buttons/stick are visually hidden; keyboard movement remains available. Coarse-pointer tablets retain the stick and action buttons even above 768px, with touch help and settings clearance.

Desktop reading panels sit right 80px, top 100px and bottom 80px, with a 390px maximum width and independent body scrolling. Below 768px they become 1rem-inset bottom panels, bottom 48px and maximum height 52svh, with 1rem body padding. Close occupies the subject-heading edge; a separate focusable action title is screen-reader-only, leaving one visible subject heading. Dropdowns scroll within 75svh. All controls remain at least 44px high; desktop icon controls are 46px.

The native four-place text disclosure is server rendered open, closes when graphics initialize and reopens on failure. Its two-column reading grid stacks below 768px. Projects, writing, contact and footer stay in ordinary shared page flow. Preserve scrolling and direct links; the canvas does not lock the page.

## Elevation & Depth

Shared content stays mostly flat with whitespace, thin separators and tonal image wells. Project images retain their restrained shadow (0 12px 28px -12px #11182730). Shared sticky navigation retains blur(20px) saturate(150%), with opaque reduced-transparency and strong-edge increased-contrast fallbacks.

The active neighborhood uses real perspective mesh geometry and MeshStandardMaterial with roughness .76 and metalness 0. Water uses .22 roughness and .12 metalness. ACESFilmicToneMapping with exposure 1.1 gives the rounded forms soft highlights. Day sun/hemisphere intensities are 3.3/2.1, night .6/.85, with one 1536-square PCF shadow map. There is no structural ink, inverted hull, full-screen outline, bloom or external environment texture. The retained shared art kit’s default toon branch remains unchanged for historical modules/tests.

Opaque HTML surfaces have small structural shadows: identity (0 3px 6px with the identity-shadow token), controls (1px 3px 2px with the control-shadow token), dropdown (0 8px 24px) and panel (0 6px 28px), both using the surface-shadow token. The movement stick has no shadow.

The lower camera uses desktop/mobile FOV 48°/55°, damped follow rate 7 and a shared BVH obstruction query. A single paused GSAP timeline owns only entrance distance/height, from 5.7/2.75 to 4.95/2.55 over 1.1s with power2.out; render-owned totalTime prevents a second independent motion loop. Phones add .95 distance/.16 height and bounded two-subject framing near Patch. Reduced motion completes the entrance and applies camera updates immediately.

**The Functional Material Rule.** Keep reading and HUD surfaces opaque; use perspective, rounded silhouettes, soft PBR highlights and grounded shadows for scene depth.

## Shapes

Shared image wells, cards, tags, pill buttons and circular theme control retain their established shapes. The street introduces deliberate modest corners: the 14px street-control radius for icon buttons, street-container for identity/dropdowns, street-panel for reading panels and street-key for keycaps. The stage has square viewport edges; prompt, footer links, skill labels and hat select remain pills. These extracted radii and atmosphere/stick/shadow colors resolve all ten entries in the sole street detector report by documenting the actual source; the detector is not rerun and no ignores are added.

Original rounded cottages have arched windows, flared roofs, windowboxes and planted thresholds. Warm paving leads across the stream on a blue arched bridge. The entire cast is original: a three-head-tall Ivan with large eyes/glasses, sculpted hair, a blue coat, short legs and rounded boots; Mira has mint/coral clothes and a different hair silhouette. Articulated Object3D joints play seven locally authored clips through the shared interruption-safe mixer; the head’s eye groups blink independently. No imported skin/skeleton/anatomy remains in the active cast. Patch uses the shared original pet geometry with the same soft materials. Only Ivan receives the retained holiday hats; Everyday shows no hat.

## Components

Shared Nuxt UI primary, outline and ghost actions retain pill shapes and 44px targets. Navigation keeps muted labels, current-destination underline and accent feedback. Text actions retain the arrow; technology tags are passive labels, filters interactive. Project cards separate original imagery from title/copy/tags. The home gallery is independent, passes trackingVariant="studio" and lazy-loads previews. Shared disclosures keep native details/summary with a 56px summary target. The contact surface has no input form.

Shared focus uses a 2px accent outline offset by 5px; street focus uses 3px local blue offset by 4px. Shared action feedback is 160ms, press scale .97, project-image hover/focus 4px lift and 1.015 scale over 360ms. Entrance/shuffle uses 280ms/cubic-bezier(.22,1,.36,1). Shared reduced-motion CSS removes transitions, animations, smooth scrolling and press/preview transforms. Street icon press translates 1px; fine-pointer hover uses World Soft/Blue.

**The Content Truth Rule.** Preserve original project previews and professional facts; source replacement must not require presentation changes.

### Active street controls and reading

`OrHome` passes only profile and skillGroups to `MlStreetWorld`. Places contains About, Toolkit, Approach, Contact, Mira and Patch. The active scene hides projected labels; contextual prompt and Places provide access. Professional panels/text disclosure share `MlWorldContent` and retain source facts, every skill group, contact/copy behavior and resume links. Mira uses the existing explicitly fictional conversation; Patch exposes Pet, Play and Follow with polite feedback. Opening a panel blocks player input and focuses its title; closing restores canvas focus. E/Escape close; unmodified WASD from noninteractive panel content closes and forwards the held key. Arrows/Page/Home/End scroll the body; Tab, edited text, modified keys and buttons retain native behavior.

WASD/arrows belong to the focused canvas, Shift runs, Space hops, F waves and E/Enter interacts. The labelled stick alone captures touch movement; Hop/Wave remain separate. Blur, cancellation, pause, hidden/offscreen and blocked state stop input. Pause suspends the loop; explicit paused changes can force a zero-delta frame. Reset restores Ivan, Mira and Patch state while preserving hat/light selection. The street remains at street scale after Reset.

The lightweight level/simulation owns six targets, dry-bank/bridge ground, normalized movement and bounded .05s delta. One three-mesh-bvh tree serves capsule/static-wall contact and camera obstruction without prototype patching. Mira roams, faces/greets nearby and holds during conversation; Patch stays in the lane, reacts and follows. Reduced motion freezes ambient roaming and secondary animation, holds Auto at day and uses fixed rig poses while preserving explicit movement/actions. Seasonal rules and client Eastern-date refresh remain unchanged; the labelled Nuxt UI select offers Automatic and five previews with 44px targets. Valid ?hat= previews remain local; Reset retains appearance.

The active rig uses 1.25/1.9-unit walk/run strides, blends into a run over 2.6–4.2 units/s, and plays a 1.8-second greeting with 25 samples per clip. Legacy gait defaults remain unchanged.

The shared adapter lazy-imports the chosen scene after intersection, retains abortable loading, queues direct visits/lighting/hats and supplies graphics fallback. DPR caps remain 1.5 desktop/1.25 phone; 30fps ambient/60fps active are scheduling targets. Street teardown kills the GSAP timeline, disposes independent actor mixers and releases owned original geometry/materials, BVH collision geometry, CanvasTextures, shared ramp, shadows, renderer/context, observers, listeners and frames. Existing village modules/assets remain for regression coverage and recovery/reuse; the elevated globe is inactive on the homepage.

## Do's and Don'ts

### Do

- Do preserve the platform font stack for body text and shared routes; use Bricolage for homepage identity and content headings.
- Do use the documented local street palette and light/dark HTML pairs on the homepage.
- Do keep direct Places access, all five routes, project links and the native text version available without walking.
- Do keep controls at least 44px high with visible focus and explicit keyboard/touch ownership.
- Do retain original neighborhood/character/pet/accessory art. The legacy licensed cast and notices remain only for historical regression coverage.
- Do honor reduced motion with fixed decorative poses and immediate camera updates for explicit movement.
- Do keep source/backend interfaces and the independent project gallery separate from simulation state.

### Don't

- Don't copy reference-site assets, code, characters or world layouts, including Messenger by Abeto.
- Don't turn the active street into an elevated globe opening or a large landing-page card covering a small canvas.
- Don't require WebGL, keyboard movement, touch gestures or play to read portfolio content or navigate.
- Don't invent professional facts, testimonials, screenshots or capabilities absent from the source.
- Don't apply the street palette, typography or navigation replacement to other routes by default.
- Don't describe scheduling targets or local stills as measured device performance, continuous-motion quality or deployment proof.
