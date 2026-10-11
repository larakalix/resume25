# New archipelago scenery

`src/experience/archipelago/art.ts` consumes the compiled world rather than the previous globe layout. Roads, bridge railings, dock decks and facade foundations use the same world coordinate frames, widths and heights as movement. Building models keep their source geometry and uniform proportions. Every building has one sign and an independent transparency group.

The harbor uses actual **KayKit City Builder Bits** models and their original UV gradient atlas, licensed CC0 by Kay Lousberg. The maker/orchard buildings use the previously acquired SimplePolygon geometry; Japanese buildings use the previously acquired reodesuxz source models. Existing creator attribution requirements still apply.

The new Japanese scenery additionally uses six actual models from [Low Poly Japanese Town Pack by reodesuxz](https://reodesuxz.itch.io/low-poly-japanese-town-pack), from the already acquired creator archive. These source models have original material colours rather than texture maps. The preparation preserves source transforms, normals, triangle topology and linear material colours, centers the complete bounds in X/Z and bases them at Y=0.

| Source model | Source triangles |
| --- | ---: |
| torii_gate | 104 |
| stone_lantern | 82 |
| sakura_tree | 136 |
| vending_machine | 108 |
| lantern_string | 172 |
| bamboo_cluster | 268 |

The six-model file is 80,252 bytes. Individual source hashes and fitted source dimensions are recorded in `public/models/japanese-props/manifest.json`. All instances use uniform scaling; their locations are authored world placements with matching colliders. No runtime external asset service is involved.

Reproduce the adapted subset from the downloaded creator pack:

```sh
node scripts/prepare-japanese-props.mjs /path/to/LowPolyJapaneseTown_v1.0/GLB
```

The creator permits personal/commercial project use and modification, prohibits standalone redistribution/resale and AI training, and makes attribution optional. The raw creator archive stays outside the repository. These adapted files are used as part of the portfolio world.

The coastal rock faces reuse the actual previously prepared [SimplePolygon Layered Cliffs](https://simplepolygon.itch.io/layered-cliffs) subset. The new archipelago places eight source-derived cliff groups in one merged draw; dry vertices are recessed below the compiled terrain so art does not invent unsupported walking ledges. Credit: **3D Assets made by SimplePolygon**, [simplepolygon.net](https://simplepolygon.net/).

`tests/archipelago-art.test.mjs` checks spherical deck heights and widths, source asset topology/UV/material retention, uniform fitting, independent transparency, scenery budgets, dry cliff bounds and resource ownership.
