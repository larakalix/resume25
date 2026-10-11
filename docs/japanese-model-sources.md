# Imported Japanese building sources

Verified locally on November 5, 2026. The Komorebi replacements use actual downloaded creator models, not procedural approximations of the supplied reference images.

## Acquired pack

[Low Poly Japanese Town Pack — Free 3D Assets by reodesuxz](https://reodesuxz.itch.io/low-poly-japanese-town-pack) provides 31 individual models in GLB, FBX and OBJ formats, plus a Blender source scene. Its original flat-shaded models use material colors rather than textures.

The official **Download Now → No thanks, just take me to the downloads → Download** flow supplied `LowPolyJapaneseTown_v1.0.zip` without login, account creation, purchase or payment. No viewer-cache extraction was used.

- Archive size: 531,564 bytes.
- Archive SHA-256: `23deda4956bc026000cc33f389ddf17e881371e0e1ffb985db458fa6b4ea3c7a`.
- Local preparation input: `/tmp/resume25-japanese-assets/unpacked/LowPolyJapaneseTown_v1.0/GLB/`.
- Original browser download: `/Users/ivanlara/Downloads/LowPolyJapaneseTown_v1.0.zip`.
- Included license: `/tmp/resume25-japanese-assets/unpacked/LowPolyJapaneseTown_v1.0/LICENSE.txt`.

The creator's page and bundled license permit unlimited personal/commercial project use and modification. Attribution is optional; the requested credit is **Low Poly Japanese Town Pack by reodesuxz**. Standalone model redistribution, resale, sublicensing, inclusion in another asset pack/library, and AI training/fine-tuning are prohibited. Only the prepared portfolio subset is included in the application, not the raw pack or original individual GLBs.

## Source subset

| Source file | Source triangles | Original GLB bytes | Full native bounds, width × height × depth (m) |
| --- | ---: | ---: | --- |
| `japanese_house.glb` | 108 | 12,636 | 4.6 × 3.125 × 4.45 |
| `ramen_shop.glb` | 84 | 10,752 | 3.8 × 2.6 × 3 |
| `shrine_hall.glb` | 176 | 17,684 | 3.4 × 2.475 × 2.8 |
| `pagoda.glb` | 288 | 22,840 | 3.4 × 7.1 × 3.4 |
| `castle_tower.glb` | 78 | 9,484 | 5 × 6.25 × 5 |

All five source GLBs parse with the installed Three.js loader. Their native up axis is +Y. The house has an asymmetric front porch; preparation centers the full source bounds instead of assuming a symmetric wall box.

## Prepared application asset

Run:

```sh
node scripts/prepare-japanese-buildings.mjs /path/to/LowPolyJapaneseTown_v1.0/GLB /path/to/LowPolyJapaneseTown_v1.0.zip
```

The directory argument is mandatory. The optional archive argument verifies the exact acquired ZIP. The script checks every source-file hash and original triangle count before producing:

- `public/models/japanese-town/town-buildings.glb`: 11 actual source-derived variants, 1,644 triangles, 135,252 bytes.
- `src/experience/globe/assets/japanese-town.json`: creator/source/license metadata, archive and model hashes, output hash, orientation, complete source bounds and fitted dimensions.

Each source has `-east` (+π/2 about Y) and `-west` (−π/2) variants. `shrine_hall-front` retains its original +Z frontage. Source mesh transforms and the named rotations are baked first. Full rotated bounds are then centered in X/Z, based at Y=0 and uniformly normalized to width=1. Primitive material colors are baked as linear vertex colors while preserving source triangles and normals. The exported file is reloaded to validate all names, triangle counts and bounds. No replacement building geometry is generated.

## Earlier user references

The supplied [FM Polygon Japan Sensoji reference](https://sketchfab.com/3d-models/fm-polygon-japan-sensoji-b57471898c00466381b2395f0a204309) is a separate FrozenMistDev commercial scene, also [listed on Fab](https://www.fab.com/listings/d4e70338-ecc8-4efc-8206-bb2c92194487). Its source geometry was not downloaded or imported.

The supplied [Stylized Little Japanese Town Street reference](https://sketchfab.com/3d-models/stylized-little-japanese-town-street-200fc33b8a2b4da98e71590feeb255a8) is a separate 234.7k-triangle scene by Michał Solarek, listed with Creative Commons Attribution. It was not the acquired model pack. The reodesuxz models must not be described as either of those reference scenes.
