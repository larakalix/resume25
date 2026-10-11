# Original neighborhood artwork

The active world needs no asset preparation or model download. Its original geometry, physically based materials and seven authored animation clips are built from `src/experience/street/` when the lazy scene initializes. Character shape and motion live in `character.ts`; buildings in `architecture.ts`; paving, planting and stream in `landscape.ts`; the pure dry-bank/bridge rules in `level.ts`; ownership and batching in `art-kit.ts` and `scene.ts`.

The prior street’s GLB and preparation pipeline are retired. Do not regenerate them for the active homepage. Historical Quaternius/Mesh2Motion files and licenses remain under `public/models/engineer` for legacy regression coverage only. Current provenance is documented in `docs/asset-provenance.md`.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`, `pnpm test:site` and `pnpm generate` for local validation. Site tests start a temporary localhost production server. Review evidence is `.impeccable/review/storybook/`; no previous visual verdict automatically applies.
