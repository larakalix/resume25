# Actual city model acquisition

Reviewed November 5, 2026. Source files are local preparation inputs, not public model-pack downloads in this repository.

## SimplePolygon Simple House Pack

User-supplied model: [Free Simple House Pack](https://sketchfab.com/3d-models/free-simple-house-pack-asset-pack-a6410823481348d3b4ac1bb3b198adf0). The [creator's official download page](https://simplepolygon.itch.io/simple-houses-lowpoly-pack) provides the actual FBX and colour palette separately. The FBX was downloaded through that page's Download control without account login or purchase.

- Local source: `/tmp/resume25-city-assets/SimplePolygon_HousePack.fbx` (original browser download also remains in the user's Downloads folder).
- Downloaded source size: 211,276 bytes; 13,124 triangles including the small loose prop.
- SHA-256: `bebd082b26fed49eddc6948e9e9b82c04f105d88b8cf1072efcc70aab5a1bbcc`.
- Creator's displayed terms allow personal/commercial projects, require attribution, and prohibit redistribution or resale. Keep the raw pack outside the public repository; any use should be integrated into the portfolio rather than offered as a standalone asset pack.
- Required visible credit: **3D Assets made by SimplePolygon**, linked to [SimplePolygon](https://simplepolygon.net/).

Installed Three.js `FBXLoader` parses seven building meshes and one small loose prop. Every mesh has positions, normals and UVs, using one `SimplePolygonPalette` material whose diffuse map references `SimplePolygon_MultiColorPalette.png`.

| Source mesh | Triangles |
| --- | ---: |
| Cube008 | 626 |
| Cube009 | 2,596 |
| Cube004 | 2,030 |
| Cube015 | 3,230 |
| Cube010 | 1,634 |
| Cube012 | 1,490 |
| Cube013 | 1,484 |
| Cube016 (small prop) | 34 |

The FBX arranges models at different world positions with authored transforms. Preparation must bake each mesh's world matrix, then normalize that mesh individually; the whole-pack bounds are not a building footprint. Exact source bounds and transforms are recorded in the temporary `house-meshes.json` beside the local FBX.

The palette is a separate creator download (upload ID `19402932`; FBX upload ID `19402931`). Its browser download showed the creator's thank-you message but did not produce a local PNG during acquisition. Public CLI requests were rate-limited, and retries were stopped. The thank-you dialog supplied no fallback link; the public page asset inventory did not include the palette or a signed file URL. Preparation can retain the actual source geometry while explicitly replacing its UV-region colours; do not claim the creator's original texture colours are retained without the PNG.

## Prepared portfolio use

`scripts/prepare-city-houses.mjs` produces the same-origin `public/models/city-street/simple-houses.glb` (848,540 bytes, 13,090 source triangles). It excludes the small loose prop, retains the seven actual building meshes, bakes source transforms and frontage, normalizes width without stretching, and indexes coincident vertices. The source palette is explicitly replaced with authored wall/roof/trim/window colours using its UV regions and face orientation; `sourceColorsRetained` is false. The manifest records source and output hashes and exact normalized bounds. All 18 Little City buildings and all six original village buildings now use these actual source meshes. Each placement is uniformly fitted to its former footprint; no procedural façade is substituted. The ten Komorebi buildings use a separate [imported Japanese pack](japanese-model-sources.md). No CG Lads, Korean demo or user-supplied Japanese reference mesh is claimed as imported.

Visible credit is under Settings → World credits. The integrated GLB has a neighbouring `NOTICE.md`; raw source FBX remains outside the repository. The home, workshop, library, café and bookshop interiors and residents remain original complementary artwork and simulation. All five entrance positions are measured from the imported door panels. Shared model loading validates bounds and vertex colours, and releases both source packs on failure or teardown.

## CG Lads City Game Ready Free

The supplied [City Game ready free](https://sketchfab.com/3d-models/city-game-ready-free-9095f8bcff1e4c9088ea98a306d5887d) page was opened in the normal browser. It identifies CG Lads as creator, lists CC Attribution with the CC BY 4.0 link, and describes modular storefronts and props. Its Download 3D Model control opened Sketchfab's login dialog. No sign-in, account creation, payment or model extraction was performed. No CG Lads geometry was downloaded.

This distinguishes actual acquisition from reference-only use; do not describe the SimplePolygon buildings as the CG Lads kit.
