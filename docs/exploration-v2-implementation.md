# Exploration V2 implementation record

Approved plan: November 5, 2026. Baseline: `587b5e025cdbb611d17dd53f6e8b6fb0b714fc6c` (clean working tree before this work). Deployment is outside this task.

## Required delivery

- [x] Continuous spherical movement and camera-relative controls; whole-globe orbit/zoom, recenter, multi-pointer routing, legacy comparison.
- [x] Preserve footprints, water/grass, eleven rooms, collisions, NPC/pet/conversation behavior, hats, quality, audio, scroll exits and content contracts.
- [x] Auto/Clear/Breezy/Drizzle weather; bounded precipitation and shared wind/fire/water response.
- [x] Mira/Sol/Nico activity routines; returned waves and workshop pet response.
- [x] Locally saved passport, two any-order trails, safe room-aware guidance and three secrets.
- [x] Photo mode with temporary poses/light, correctly colored bounded local PNG export and complete state restoration.
- [x] Roomier accessible settings modal, passport modal, camera controls/minimap heading.
- [x] Fresh unit/site/lint/typecheck/build/generate checks; browser routes and responsive checks; screenshots/postcards/recordings and explicit device limits.

## Evidence

Artifacts go in `.impeccable/review/exploration-v2/`. Command logs go in `/tmp/exploration-v2-*.log`. This checklist is updated only after integration and verification.

## Architecture and control rules

- `surface-motor.ts` accepts the visible camera's world forward/right vectors, projects them onto the ground tangent, transports heading/velocity along great-circle steps and asks the existing collision system about bounded substeps. The longitude/latitude atlas is an adapter, not the movement authority. Legacy two-argument simulation calls remain available for rollback.
- `camera-director.ts` owns outdoor orbit, zoom, transition, inertia and recentering. The existing perspective and clearance stay in the renderer. Ground contact uses the actual surface normal independently of camera roll. The canvas look router owns up to two look/pinch pointers, separately from the joystick pointer.
- The scene owns one render loop and supplies active delta time to simulation, weather, footsteps and presentation. Hidden/offscreen/paused worlds reset the timestamp. Photo mode supplies zero simulation delta while permitting camera time; it has no catch-up step.
- Settings and passport use the same Nuxt UI modal surface. They trap focus and block gameplay while the world continues behind them. Closing restores focus to the invoker; travel and photo actions run after the modal leaves. Main menu/Places, blur, visibility changes, cancelled gestures and disposal release input.
- `weather.ts` defines Clear/Breezy/Drizzle and 180-second Auto stages, with eight-second blends. `weather-art.ts` owns one fixed precipitation buffer, no new lights and no particle position uploads. Grass, foliage, water and campfire consume shared weather values. Battery saver, interiors and overview omit drops; Calm holds weather time.
- `resident-activities.ts` gives Mira, Sol and Nico separate safe schedules, shelter/night pauses, visitor yielding and eight-second reciprocal-wave cooldowns. City merging retains a safe one-way flow. Calm uses a static acknowledgement for deliberate waves. Patch's workshop response waits until the visitor comes outside.
- `world-events.ts` is a typed callback boundary for footsteps, interactions, discoveries and trail progress. Only semantic, successful gameplay actions earn passport entries. Professional facts remain derived from current portfolio data.
- `passport.ts` saves stable IDs under `ivan-world-visit-v1`, capped at 8 KiB. No location, photo, clock, permission or professional copy is stored. Failures retain session progress; Restart clears both the simulation and the persisted visit without a deferred write race. See `exploration-passport.md` for trail/guidance/secret ownership.
- Photo presentation never changes physics, NPC reactions, progress or user preferences. A detached camera snapshot restores the view; a zero-time semantic pose reset restores a paused character. Temporary light values are presentation-only. Capture encodes the default framebuffer immediately after its existing render, then composes an optional caption in a separate 2D canvas. It preserves aspect ratio, never upscales and releases bitmap/canvas resources on success, failure or cancellation.

## Local comparison and rollback

V2 is the default at `/`. The explicit comparison URL is `/?controls=v2`; the temporary rollback is `/?controls=legacy`. Query overrides are applied after hydration so generated HTML and initial client markup agree. Promotion changes only the default selection; both controllers retain the same content, doors, collisions and renderer. No deployment is performed by this change.

## Verification distinctions

The pure suites cover movement/camera response at 30/60/120 Hz, seams and both poles, parapets and furniture; weather timing/budgets; mixed-cast routines and explicit Calm actions; passport persistence/reset/corruption; safe guidance and real secret prompts; capture cancellation/resource ownership and actual character pose restoration. Browser captures establish local visual/interaction behavior, not physical-phone performance. Physical multi-touch ergonomics remain a separate device check.

The temporary `recorder.html` fixture in the ignored review directory captures the actual rendered canvas using MediaRecorder. It is not part of the portfolio source or a public route; copy it to the local static output only when collecting review clips, then remove it from output.


## Final local result

- Default `/` reports `controls=v2`; `/?controls=legacy` reports `controls=legacy`. Both loaded without captured warning/error logs. The local preview is `http://127.0.0.1:4173/`; no deployment was performed.
- Fresh checks: **383 unit tests**, **16 production site regressions**, lint, Nuxt typecheck, production build and static generation of **26 routes** all passed. Command output is in `/tmp/exploration-v2-{unit,site,lint,typecheck,build,generate}.log`.
- Browser checks covered 375 × 812, 768 × 1024, 1024 × 768 and 1440 × 900, plus 812 × 375 landscape. No horizontal page overflow; tablet prompt/action overlap was corrected. Keyboard focus stays in dialogs and returns to the invoker; conversations resume movement without an extra click.
- The original bridge spawn was confirmed at `(0, -4.05)`. Returning from World view retained the current `(-17.916, 23.570)` position. All eleven rooms, both home floor changes, city shop/cave entrances and exterior returns were exercised across the browser review.
- Both trails completed through real UI interactions, including a returned wave in Calm and kindness actions performed out of the listed order. All three secrets were reached by walking and E interaction. Twenty earned stamps and both completed trails survived a reload. Restart followed by reload showed zero stamps and the bridge spawn.
- Photo export samples are nonblank, correctly oriented and visually match the renderer: 1920 × 1080 desktop and 375 × 812 mobile. A paused-world night/wave photo returned to daytime/idle while keeping the weather clock at `238.767` before and after exit. Capture error/abort/bitmap ownership are covered by the export tests.
- Real-browser navigation from the passport to Projects now leaves both overflow styles empty and permits scrolling (`scrollY=900`). `world-page-scroll.test.mjs` reproduces the ownership handoff with the installed VueUse and Reka locks. Dialog body ownership stays suspended until both content and overlay have left; an owned MutationObserver avoids relying on their animation timings.
- OS reduced-motion precedence and live media-query changes were exercised against the actual compiled scene component; Calm was also checked in the browser. Simulated multi-pointer tests cover simultaneous stick/look/pinch and cancellation. Physical-phone multi-touch ergonomics, hardware frame rates and OS/browser combinations remain separate checks.
- Main light/dark text, muted and accent token pairs were calculated at 5.97:1 or higher against their respective surfaces. This is a token check, not a claim about every pixel of the 3D scene.
- Final comparable bridge sample: 60 fps / 17.1 ms p95 versus baseline 57.3 fps / 24.1 ms p95. See `performance.md` for the single-sample limits.
- Review media is in `.impeccable/review/exploration-v2/`: four responsive captures, short landscape/settings/passport captures, two PNG postcards and two real canvas recordings (6.000 and 5.983 seconds, 1280 × 720). The temporary recording page is absent from generated public output.
