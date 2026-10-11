# Coastal world: the new archipelago

This is a new outdoor world definition for Ivan Lara’s portfolio, built around five distinct districts on a continuous spherical map. It shares the proven movement, interaction and portfolio systems with the previous world; the island geography, streets, building placements, coastal composition and cast are new.

## Default and comparison routes

- `/` selects the new archipelago by default after hydration.
- `/?world=archipelago` explicitly selects the new island world.
- `/?world=legacy` explicitly selects the preserved meadow world.
- `?controls=legacy` remains an independent control comparison switch.

The archipelago is promoted after the local production and browser gates passed. Both explicit world URLs remain available for comparison and rollback. Portfolio content and the text version remain available independently of WebGL. See [the local acceptance record](coastal-world-verification.md) for evidence and device limits.

## The world, as built

The loop runs **Aonami Harbor → Komorebi Market → Maker Heights → Tideglass Coast → Orchard Village → Harbor**, with three smaller stepping islands connecting the longer crossings. The Tideglass/Lantern crossing passes through the ±180° map seam; the sphere and route sampler keep it continuous.

The visitor begins on the white stone Meadow Bridge, looking toward the harbor. Maker Heights contains Ivan’s house and the workshop. Komorebi combines source Japanese houses, a shop, a shrine and original-colour Japanese scenery. The harbor uses actual KayKit city buildings rather than generated substitutes. Orchard Village includes the pond and duck dock; Tideglass contains a raised coastline, the lighthouse and a cave entrance.

The compiled definition currently contains eight islands, five principal districts, eighteen outdoor buildings, seven accessible buildings, eight connecting bridges, three dock routes and six outdoor residents. These are review-time counts rather than test constants: the exported map metadata is authoritative for the current definition.

Two small optional activities complement the portfolio:

- A workshop parcel can be collected, stamped at the market and delivered at the harbor. This is fictional world activity; it does not alter professional portfolio facts.
- The ferry follows an authored sampled water route between the harbor and orchard. Boarding and return targets sit on the outer pier decks, less than two metres from the moored boat, with a continuous dry approach from shore. Reduced motion can complete the crossing immediately; the ride also has a skip action.

## One source for geometry and movement

`src/experience/archipelago/definition.ts` authors local island coordinates, lots, roads, residents, decorative objects and ferry waypoints. `compile.ts` resolves these into one world contract. `terrain.ts` supplies the coastline, hills, tangent building pads, street grading and water/land boundaries.

`DistrictDefinition`, `AssetDefinition`, `CharacterDefinition` and `WorldDefinition` make the authoring boundaries explicit. The asset catalog reads exact prepared dimensions and provenance from source manifests; the compiler does not maintain a second set of approximate building sizes. Character definitions assign the visitor, Ivan and each resident or room host to the actual CUTES family without importing Three.js into the pure world compiler.

The same compiled data supplies:

- Surface heights, road and bridge widths, building footprints, prop collisions, door anchors and dry arrivals.
- Outdoor art, source model fitting, bridge walls and dock decks.
- Spawn and camera entry points, NPC routes, animals and activity destinations.
- Minimap roads, district navigation and the generated master map.

The existing scene accepts a world adapter instead of creating a second competing movement engine. Building and scenery clones keep their own transparency groups. Native models use uniform scale and source-aligned frontage. Doors and signs follow the compiled lot, including its yaw.

Grounded decorative supports also use that authority: ten streetlights and four pennant posts have authored collision placements, and their art roots use those same positions. Cables connect the authored support tops. Decorative colliders are not interaction targets or extra passport discoveries.

The character family is actual **CUTES Part One** geometry by J-Toastie. Visitor and residents retain source meshes, UVs, the supplied gradient atlas, rigs and authored Idle/Walk/Sprint/Jump/Grounded clips. Ivan adds original cropped hair, beard, glasses and an unbranded blue/white outfit mask. Wave and crouch adapt the same source rig. Actual travel drives locomotion, and simulation owns root movement and jump height. Seasonal hats remain attached to the animated head socket.

## Preserved systems

The world integration retains the existing portfolio content and CMS-facing types, readable text alternative, conversations and career data, movement actions, interior entry/exit, three-level home, workshop interactions, animal encounters, feeding, seasonal hats, day/night settings, weather, ambient sound, photo mode, quality controls, passport/trails, keyboard shortcuts, touch movement and focus recovery.

Preservation is a contract to test, not a claim that every browser/device path has been checked. The archipelago uses its own persistence key so preview discoveries do not replace legacy-world progress. Existing professional content remains the content layer’s responsibility; world errands and villagers are presentation, not invented employment claims.

## Asset sources and credits

| Pack | Use and retained source | Credit / terms |
| --- | --- | --- |
| [CUTES Part One — J-Toastie](https://poly.pizza/bundle/CUTES-Part-One-WD91WrT0gx) | Six real character GLBs; original UV atlas, rig and clips; original portrait/accessory adaptations | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Credit J-Toastie, Poly Pizza and the modified **Kay Lousberg gradient atlas**. |
| [KayKit City Builder Bits — Kay Lousberg](https://kaylousberg.itch.io/city-builder-bits) | Harbor buildings and street furniture; original geometry, UVs and gradient atlas | CC0; creator acknowledgement retained. |
| [Simple House Pack — SimplePolygon](https://simplepolygon.itch.io/simple-houses-lowpoly-pack) | Actual acquired house geometry, adapted with replacement colours; original palette download was unavailable | Credit **“3D Assets made by SimplePolygon”**. Personal/commercial project use; no standalone redistribution/resale. |
| [Low Poly Japanese Town Pack — reodesuxz](https://reodesuxz.itch.io/low-poly-japanese-town-pack) | Actual buildings and six additional scenery types: torii, stone lantern, sakura, vending machine, lantern string and bamboo; original material colours retained | Personal/commercial project use and modification; no standalone redistribution/resale or AI training. Attribution optional; acknowledgement retained. |
| [Layered Cliffs — SimplePolygon](https://simplepolygon.itch.io/layered-cliffs) | Small actual source subset, newly placed and adapted to the coastal terrain | Credit **“3D Assets made by SimplePolygon”**; no standalone redistribution/resale. |
| [Lighthouse — CG ART Creation / Poly Pizza](https://poly.pizza/m/c1-hm3Zs-8U) | Actual source model and embedded texture; uniform fit, adapted beacon/glass lighting | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). |

The interiors, ferry, interactive props and complementary procedural scenery are original portfolio work. Only acquired, licensed source models are identified as imported assets. A referenced commercial or login-only scene is not described as imported when it was not acquired.

Detailed source hashes, preparation and ownership notes are in [cutes-model-source.md](./cutes-model-source.md), [city-model-sources.md](./city-model-sources.md), [japanese-model-sources.md](./japanese-model-sources.md) and [archipelago-native-scenery.md](./archipelago-native-scenery.md). Raw source archives stay outside the repository. Public model files are adapted subsets used by the portfolio, with applicable creator terms preserved.

## Editing the world

1. Change an island-local coordinate or lot in `definition.ts`, rather than adding coordinates independently to art and collision code. Keep stable IDs when preserving saved progress.
2. Use a source model ID that exists in its manifest. Lot width/depth/height constraints determine one uniform fit; frontage and yaw must agree with the source. Do not stretch a building to make a doorway larger.
3. Add an entrance through the lot’s `enter` value. The compiler owns door targets, arrivals and approach paths. Add interior content through the existing room factories.
4. Author physical ornaments as noninteractive placement colliders. Rendering an uncompiled obstacle produces a visible object the character can walk through. Torii and lantern-string posts have separate small colliders so their central passages stay open.
5. Keep roads, bridge endpoints, dry arrivals, NPC routes and ferry waypoints in the compiled definition. Road geometry consumes the exact sampled heights and widths. Do not move a visual bridge without moving its movement surface.
6. Regenerate the map and run the world/art/simulation/activity tests. Check the actual browser route, source-model frontage, doorway clearance, transparency and touch layout before shipping a world update.

## Reproducible master map

Run with the repository’s Node 24 environment:

```sh
node scripts/export-archipelago-map.mjs
```

The script writes ignored local review artifacts:

- `.impeccable/review/archipelago/master-map.svg`
- `.impeccable/review/archipelago/master-map.json`

The matching `.impeccable/review/archipelago/master-map.png` is a browser-rasterized review copy of the generated SVG, not a render of the playable 3D scene.

The SVG contains sampled terrain contours and bathymetry from `archipelagoWorld`, every compiled road/bridge/dock at its declared width, source collision footprints, doors, tree sites, ferry waypoints, the first bridge and Ivan’s house. It is north-up (`−Z`) across the full ±180° longitude range. The latitude band includes every authored coast; this is an equirectangular review map, with increasing polar distortion rather than a local equal-area survey. Continuation arrows make the seam crossing explicit.

The JSON records the definition SHA-256, projection extent, source sample grid, current counts, important locations and the actual sampled ferry/first-bridge routes. Generation is deterministic for the same compiled definition. Pass an output directory as the script’s first argument to keep a separate review revision.

The SVG was generated, parsed as XML and visually inspected in a local browser. It is evidence of the current map/artifact shape, not proof of walking, conversations, controller behavior or real-device performance.

## Verification status

Lint, typecheck, all **440 unit tests**, **16 site regressions**, production build and static generation (**26 routes**) passed. The local browser suite passed **101 assertions** covering the promoted root route, responsive/touch controls, all eleven rooms and stairs, pets/ducks, footprints, hats, Night/Calm, delivery persistence, photo/ferry restoration and storage-failure Reset behavior. Actual character/hat geometry also verifies the raised ferry canopy clearance and readable roof cutaway.

The master map was regenerated from the final definition, parsed as SVG/XML and visually inspected as a 1700 × 1080 PNG. Desktop/mobile screenshots, movement/ferry recordings, real day/night postcard exports and a matched legacy/new-world performance comparison are available locally. [The acceptance record](coastal-world-verification.md) documents exact commands, artifacts, measured loading tradeoffs and test scope.

Browser checks are the agreed device scope for this iteration. Physical-phone gestures and deployment remain separate.
