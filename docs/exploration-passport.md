# Visit passport, optional trails and small discoveries

The passport uses authored target IDs and semantic activities. It never stores professional facts, positions, screenshots, permissions or a world clock. Professional notes are derived from the profile, current role summaries and skill groups supplied to the UI.

## Ownership and events

`createPassport(targets, storage?)` is owned by the world component. Initialize it on the client, then publish its `snapshot()` to both the passport component and the scene's progress hook. The snapshot is a fresh value; mutating its arrays cannot alter the controller. `record(event)` reports whether progress changed and whether a trail has just completed. Save writes are synchronous after meaningful changes, with one versioned local key and an 8 KiB upper bound. Storage errors leave the current session usable.

Supported events:

- `discover`: an existing non-exit target has actually been visited or interacted with.
- `conversation`: `ivan` after a real reply; `rue` after choosing a career/history reply.
- `activity`: `workshop-complete`, `feed-ducks`, `return-wave`, or `light-campfire` after the corresponding deliberate action succeeds.
- `secret`: one of the three authored secret IDs after E interaction.

The shared `world-events.ts` union also describes transient `footstep`, `interaction` and `trail-progress` notifications. These cross the existing scene callback and do not require a runtime event bus. The passport explicitly ignores them: a footfall, an opened panel or a reported progress count cannot award or persist a stamp. Existing imports of `WorldEvent` from the passport module remain supported by a type re-export.

The two three-checkpoint trails accept actions in any order, including before tracking a trail. Duplicate events never award a second stamp or repeat a completion celebration. Photo poses and lighting presets must not emit these gameplay events.

Restart the simulation before resetting passport progress, or guard the reset generation, so a late publish of the old simulation's discovered set cannot restore cleared stamps. There is no deferred passport save to cancel. Reset retains the storage removal handle even after a quota write failure. Dispose prevents further recording and writing.

## Guidance

`createTrailGuidance(targets, safe)` reuses the world's existing path planner. Its only change to that planner is an additive `path(from, to)` method. Prepare the graph during loading if possible; guidance does not need a separate pathfinding algorithm or a player auto-walk controller.

Call `update(visit, {x, z, inside}, liveTargetResolver)` at a modest publication rate, such as 10 Hz. Indoors, pass the actual `sim.player()` coordinates rather than the minimap's exterior home/room anchor. The live resolver retains roaming residents' real arrivals. The helper selects the next unfinished checkpoint and walks the authored room graph through doors and floor landings. Outdoor routes terminate at clear arrivals; indoor grid connectors sample existing furniture clearance. Guidance never opens doors or writes movement input.

The result contains a label, next target, route points, atlas-safe split `segments`, a short-distance `firefly` point, and explicit arrived/door-wait/unreachable states. Indoor routes intentionally have no outdoor atlas segments. An unavailable path produces a Places suggestion instead of a false line through water or buildings.

`createGuideFirefly(outdoors, rooms)` owns one three-point shader draw and no light. Feed it the latest guidance, world time, reduced-motion flag and drawing-buffer height. Hide it by passing `null` in overview, conversations and photo mode. Its explicit `dispose()` releases its own geometry and material once.

## Authored surprises and presentation

`secretTargets` adds a small trophy in Pixel Arcade, a shell in Tideglass Cave and a folded plane in Cloudtop Garden. Each has a clear arrival and a readable interaction radius. `buildSecretArt(art, room?)` uses original geometry and the surrounding art owner. Build outdoor art before its batch is finished; for an already constructed room, finish the newly added room art afterward. `secretMessage(id)` supplies the discovery line. These objects must be intercepted before the generic campfire/environment dialogue.

`MlGlobePassport` is presentation-only. Give it the current snapshot, target registry, profile, roles and skill groups; handle its `track`, `travel` and `close` events in the world component. It fits inside the shared world dialog. Unfound surprise cards send visitors to the relevant room/garden, while collected cards may revisit the actual object. All ordinary portfolio links remain available independently of progress.

Scoped evidence is provided by `tests/passport.test.mjs` and `tests/trail-guidance.test.mjs`: persistence and malformed storage, reset after quota failure, content-driven notes, any-order trail completion, safe world/room routes, atlas seam splitting, real secret arrivals, bounded original geometry and exact firefly/art resource ownership. Browser focus, final scene rendering and overall production checks belong to the root integration review.
