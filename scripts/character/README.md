# Engineer rig preparation

The lazy world loads one optional same-origin `/models/engineer/engineer.glb` (973,700 bytes; SHA-256 `b91d8460fdd36656b5557b4eedb49067edd944ff47322b80ab120e75bba11412`). It contains the adapted Quaternius weighted head, hairstyle and humanoid skeleton with seven retargeted Mesh2Motion clips. Source body anatomy, eye/brow meshes and bitmap images are removed. Ivan and the three villagers borrow shared source geometry with independent cloned skeletons, toon/ink materials and mixers. Original cartoon faces, garments, limbs, mittens, shoes and accessories attach at runtime; only Ivan has the seasonal wardrobe. No account, paid generation, animation service or external runtime request is required.

To reproduce the asset from locally acquired inputs:

1. Use **Universal Base Characters [Standard]** from [Quaternius's official pack page](https://quaternius.itch.io/universal-base-characters), including its supplied `License_Standard.txt` (CC0 1.0).
2. Put `Superhero_Male_FullBody.gltf`, its `.bin`, `Hair_SimpleParted.gltf` and its `.bin` in one input directory. Copy `License_Standard.txt` there as `LICENSE.txt`. No texture input is required.
3. From [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app) at revision `4f1316296660f2b9827ff46b4db10fb241ec2147`, put `static/assets/human/model.glb` in a second directory as `source-rig.glb`, plus `LICENSE-CC0.MD`. From `static/assets/human/animations/`, include `idle-a.glb`, `walk-relaxed.glb`, `jog.glb`, `jump-start.glb`, `jump-air.glb`, `jump-land.glb` and `greeting.glb`.
4. Run from the repository root:

   ```sh
   node scripts/character/prepare.mjs /absolute/path/to/character-inputs /absolute/path/to/motion-inputs
   ```

The offline script uses installed Three.js loaders, Meshopt decoder, skeleton retargeter and GLB exporter. It retains skin weights, normalizes the neutral rig to 2.6 units before trimming its body to `Engineer_Head`, binds the hairstyle and bakes motion at 24fps. Local X/Y hip travel is suppressed; Z-up bob remains. Game physics owns travel and jump height. The output includes two exact packaged CC0 licenses and a manifest with character input/output hashes and pinned motion filenames/revision; not every motion input is hashed. Source archives/PBR textures do not ship.

`character-garments.ts` supplies four original torso cuts (Ivan jacket, Mira flared poncho, Theo apron shirt, Sol split vest) and articulated rounded limbs, mittens and shoes. `character-sockets.ts` aligns forms in the neutral frame before their bones animate. `rigged-character.ts` adds original faces/hair/accessories/ink; Head scales 1.55, with actor Y scales .70/.65/.73/.64 and X/Z scales .96/.96/.90/1.12 for Ivan/Mira/Theo/Sol. These transforms are not final world-height measurements. `character-appearance.ts` owns the exact color/style choices.

`character-motion.ts` synchronizes walk/run stride and interrupts weight blends at exponential rates 14/20, with a separate greeting arm layer. Playback stops with the world; reduced motion holds fixed poses. Actors release their playback/materials/skeletons; the world removes them before releasing borrowed source geometry once, and the kit owns original runtime geometry. Abortable `character-asset.ts`/`scene-asset.ts` loading retains procedural recovery on optional failure.

## Original environment and retired pipeline

`nature-art.ts` now generates solid cartoon canopy clusters, shrubs, grass and rocks locally; `pet-art.ts` generates the articulated dog and cat. No nature GLB or texture is loaded. The former `/models/nature/village-nature.glb`, its licenses/manifest, `prepare-nature.mjs` and `glb-tools.mjs` are removed. Their exact historical selection/hash and older evidence remain in `docs/asset-provenance.md` and `.impeccable/review/explorer-cast/`; those reproduction commands no longer apply.

After changing this pipeline, run `pnpm test:unit`, `pnpm lint`, `pnpm typecheck` and `pnpm exec eslint scripts/character/prepare.mjs`; check actual desktop/mobile play, hats and transitions. The existing GLB guard remains 1.8 MB. These are validation instructions, not evidence that this documentation pass ran them.
