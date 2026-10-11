# CUTES character family

Actual models from [CUTES Part One](https://poly.pizza/bundle/CUTES-Part-One-WD91WrT0gx) by [J-Toastie](https://poly.pizza/u/J-Toastie), distributed through Poly Pizza under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

The creator credits **Kay Lousberg** for the modified gradient atlas supplied with these models. Retain that acknowledgement alongside J-Toastie's credit.

The normal **Download GLTF** control exposed this free public bundle URL:
`https://static.poly.pizza/list/WD91WrT0gx-glb-1330409802.zip`.
The archive was downloaded locally; no account, API key, private viewer extraction or generated substitute was used.

## Retained source

`public/models/cutes/manifest.json` records each model's individual source URL, SHA-256, byte size, material identity, topology counts, bounds, atlas hash and authored clip names. Six source GLBs total 1,645,080 bytes and are copied byte-for-byte from the creator's bundle. UVs, embedded 1024 px gradient atlas, skin weights and the compact hand/foot rig remain intact.

| Portfolio character | Actual source |
| --- | --- |
| Visitor | Generic Male |
| Ivan | Generic Male, with original custom details |
| Mira and Aya | Generic Female |
| Theo and Kit | Citizen 1 |
| Sol, Ben and Mara | Citizen 2 |
| June, Rue and Rowan | Citizen 3 |
| Nico and Pip | Food Worker |

The source pack has a deliberately playful, large soft-box head and separate hands and feet. The runtime retains those authored proportions instead of substituting the prior procedural body.

## Adaptations

Runtime uniform height normalization is applied outside the source scene. Toon materials retain the real source atlas, source UVs and material names. Ivan adds original cropped hair, a close beard and glasses attached to the supplied animated Head bone. A selective garment shader mask gives only Ivan's torso blue and warm-white stripes, without logos; it retains the underlying source atlas and UV coordinates. Other cast members keep their distinct authored meshes and source colours.

Idle, Walk, Sprint, Jump and Grounded are the creator's actual clips. Root translation is removed from playback so movement/collisions and jump physics remain authoritative. Walk/run phase follows actual measured travel, including blocked movement. The airborne pose holds the source Jump endpoint. Wave and crouch are original overlays on the same supplied rig, leaving locomotion feet independent. All seasonal hats use a head socket and cached wardrobe geometry.

The family owns source geometry, images and materials. Every actor owns cloned skeletons, playback and replacement lighting materials; Ivan additionally owns his garment-mask geometry clone. Accessory geometry and wardrobe resources belong to the world's ArtKit. Dispose actors before the family and ArtKit. Failed or aborted required family loading reports an error and frees completed sibling loads; it never silently switches character styles.

## Reproduction

Download the free GLTF bundle through the creator page, extract to a local directory, then run:

```sh
node scripts/prepare-cutes.mjs /path/to/extracted-bundle
node --test tests/cutes-character.test.mjs
```

The preparation script only reads model data and copies selected GLBs. It does not execute code from the downloaded archive.

Suggested visible credit: **CUTES Part One by J-Toastie (CC BY 3.0), via Poly Pizza. Modified gradient atlas by Kay Lousberg. Adapted for Ivan Lara's portfolio.**
