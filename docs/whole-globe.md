# Whole-globe exploration

The meadow planet now has connected destinations beyond the original town-facing hemisphere. Existing homes, interiors, city models, neighborhoods, pond and harbor keep their identities. New land extends around the back of the sphere and toward its polar gardens; oceans and riverbanks remain meaningful boundaries rather than walkable water.

## River crossings

Four white-stone crossings share one bridge specification and renderer:

| Crossing | Longitude coordinate | Connects |
| --- | ---: | --- |
| Meadow Bridge | 0 | The original meadow and northern paths |
| Komorebi Bridge | -30 | The western meadow and Komorebi approach |
| Garden Bridge | 28 | The eastern meadow and gardener's side |
| Far Meadow Bridge | 110 | The two banks of the far-side continent |

`bridge.ts` supplies the deck height, footprint, vegetation exclusion, landscape cutout and solid parapet bounds. `stone-bridge.ts` renders those same dimensions. Each crossing has open bank entrances and collidable sides, including player clearance around the ends of the parapets. Connected approach paths make the crossings discoverable on foot.

## Destinations around the planet

`world-expansion.ts` defines the new land, routes, trees and destination records. The destination arrival remains clear of its art and nearby tree trunks.

| Destination | Character |
| --- | --- |
| Sunlit Orchard | A fruit tree beside a striped harvest cart |
| Star Garden | A small domed observatory, telescope and softly glowing stars |
| Northwind Lookout | A cairn, compass and trail flag beside the northern path |
| Cloudtop Garden | A flowering pergola and a quiet garden bench |

`world-expansion-art.ts` builds original decorations with the existing art kit and shared sign atlas. Their exact prop centers and footprint dimensions come from `world-expansion-obstacles.ts`, which is also consumed by walking collision. Tall landmarks participate in the same camera transparency system as the town's buildings. Reduced motion holds the flag and star pulses while deliberate walking remains available.

Additional equal-area woodland candidates populate the far hemisphere. A bounded set of groves is selected only on dry ground, away from paths, props, destination arrivals and their camera sightlines. The existing canopy instances and wind system render those trees.

## Spherical navigation

The world uses a radius of 40 map units. Longitude spans one complete circumference, approximately 251.33 units, and wraps at ±125.66. Routes crossing that seam are explicitly split into two map segments. The rendered globe remains continuous; the atlas shows those segments at its left and right edges.

Exploration V2 moves in a world-space tangent frame, transports velocity and heading on the sphere and adapts the result back to atlas coordinates. It crosses the longitude seam and both poles without a latitude cap. WASD and joystick directions follow the visible camera. The temporary legacy controller retains its previous wrapped-longitude movement and near-pole cap; see `exploration-v2-implementation.md` for the rollout and comparison URLs.

The minimap is an equirectangular atlas of the complete sphere. It includes the existing city and harbor, all four river crossings, the far-side destinations and the visitor's current position. The compass stays north-up. A jump in the atlas marker at the left/right seam represents crossing the same continuous location on the 3D globe.

Overview dragging rotates around the globe's actual polar axis, exposing the back hemisphere. Returning to World view aligns that orbit above the explorer's current longitude, keeping the camera transition outside the planet and its blended up vector valid.

Tangent-plane building and round-prop collision rejects the opposite hemisphere before testing its local footprint. This is essential on a full sphere: an object and its antipode otherwise project to the same tangent coordinates.

`world-follow.ts` provides a companion route graph built from the authored paths. Physical spatial buckets join intersecting routes and opposite edges of the longitude seam. Path stitching and connections to the companion/owner sample collision and wetness; cached Dijkstra routes reuse waypoints until the owner moves. Graph preparation can run during world loading, avoiding a cold graph build during active walking. The same routing can choose the nearest western or eastern river crossing instead of forcing every companion through the original center bridge. Companion movement still takes ordinary bounded walking steps and never teleports.

## Grass and resource ownership

Grass retains the existing instanced curved blades, wind and player displacement. A bounded visitor-centered streaming region supplies nearby blades as the explorer travels around the globe, instead of spreading the old fixed patch too thinly across the entire planet. Automatic quality controls still choose the active blade count and draw distance. Distant areas use the terrain's meadow colors until detailed blades are nearby.

The same 42,000-instance ceiling serves 64 reusable spherical tile slots, with spatially interleaved quality prefixes. Only distant tiles are recycled; terrain and grass tint blend continuously at the longitude seam. Grass excludes the exact shared footprints of new landmark props. All four stone bridges together remain within the existing 10,000-triangle guard.

`world-trails.ts` paints fine spherical ribbons over the new routes in one owned draw. Their physical width stays consistent at high latitudes, and they stop at bridge decks and existing paved districts. Shallow lift, polygon offset and disabled depth writes preserve the walking surface and sand impressions. Coarse terrain path coloring remains limited to the original town paths, avoiding a blocky fringe around the new ribbons.

New fixed decorations batch through the shared art kit. Signs share an atlas, the additional bridge geometry shares material ownership, and camera fading uses per-object material copies. Scene teardown owns the new geometry, materials and animations through the existing cleanup path.

## Exploring

- Choose **Explore the world** to start on the middle of Meadow Bridge. Ivan's house remains accessible through Places or its front door. Returning from World view resumes the current location; resetting the world returns the next entry to the bridge.
- Use **Places** for direct travel to a crossing or one of the new destinations, or follow the connected paths on foot.
- Walk with WASD or arrows; hold Shift to run. Space jumps, C crouches and F waves. Touch devices retain the movement stick and action buttons.
- E interacts with the nearest discovery or doorway. Escape closes an interaction or leaves an interior.
- **Settings → World view** returns to the globe overview. Settings also retains day/night lighting, Calm world, seasonal hats, sound and graphics quality.
- Projects and the text version remain available independently of the 3D world.

## Southern coast, hills and caves

Horizon Causeway adds an east-west coastal crossing from the Old Quarter extension to the far-side continent. Its endpoint routes, arched deck height, footprint and parapet clearance come from `coastal-crossing.ts`; `wild-land-art.ts` renders the same dimensions. It supplements the four river bridges rather than replacing them. Beyond the Blue adds a lookout bench on the city-side approach. The minimap distinguishes this coastal route and the two enterable cave mouths.

Five bounded hill heightfields in `wild-land.ts` give selected empty land a higher silhouette while retaining the established town locations. Firefly Grotto and Tideglass Cave have original stone entrances, warning signs, marked arrivals and separately rendered walkable galleries. Their physical mouths and warning posts share collision footprints; E enters and Escape returns to the corresponding outdoor arrival.

The connected world also includes Ivan’s three-floor imported home and four open city shops. The home’s living room, gaming studio and rooftop lounge are connected by explicit E-key stair landings, not continuous vertical climbing; direct room travel keeps the minimap anchored at the real exterior home door. The new scenery and furnishings reuse existing rendering/resource owners and introduce no external asset or dependency.

## Validation scope

Regression checks should cover every bridge and the coastal causeway’s deck and side collision, dry approach paths, landmark arrivals, traversal of the longitude seam, safe polar movement, antipodal collision rejection, companion following, camera fading, cave entry/exit, home floor transitions, shop entrances and mobile atlas/control layout. Check the new destinations in day and night modes and with Calm world enabled. Browser checks and automated geometry/simulation tests are separate from physical-device frame-rate measurements; no deployment or real-device performance result is implied by this document.

The asset provenance for all 24 imported village/city exteriors is in [city-model-sources.md](city-model-sources.md), and the ten imported Komorebi exteriors are documented in [japanese-model-sources.md](japanese-model-sources.md). The new landmark decorations are original procedural geometry and introduce no additional external model license.

## Open sea

Three regional gulfs now interrupt empty rear land: Westward Gulf, the seam-crossing Back Ocean, and Southern Back Bay. The original forward shoreline also recedes outside the protected harbor approach and route/district envelopes. The retained paths still provide full-globe exploration, while empty headlands become open water. Smooth physical-distance buffers preserve all existing destination supports and the newly imported Bluebird Lighthouse. Water uses seam-free three-dimensional wave/color fields, with no added image assets or rendering passes.
