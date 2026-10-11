import { loadCharacterAsset } from './character-asset.ts'

/** One optional shared rig; all environment and pet geometry is original and generated locally. */
export async function loadWorldAssets(signal: AbortSignal) {
    return { character: await loadCharacterAsset(signal) }
}
