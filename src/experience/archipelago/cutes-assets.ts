import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { disposeSceneAsset } from '../explorer/scene-asset.ts'

export const CUTES_MODELS = ['generic-male', 'generic-female', 'citizen-one', 'citizen-two', 'citizen-three', 'food-worker'] as const
export type CutesModelId = typeof CUTES_MODELS[number]
export const CUTES_CLIPS = ['Idle', 'Walk', 'Sprint', 'Jump', 'Grounded'] as const
export const CUTES_VARIANTS = {
    visitor: 'generic-male', ivan: 'generic-male', mira: 'generic-female', theo: 'citizen-one',
    lina: 'citizen-two', kenji: 'citizen-three', emma: 'food-worker',
} as const satisfies Record<string, CutesModelId>
export type CutesVariant = keyof typeof CUTES_VARIANTS

/** Required authored assets fail explicitly; the world must never silently substitute a different cast. */
export async function parseCutesAsset(buffer: ArrayBuffer, signal?: AbortSignal): Promise<GLTF> {
    let asset: GLTF | undefined
    try {
        signal?.throwIfAborted()
        asset = await new GLTFLoader().parseAsync(buffer, '')
        signal?.throwIfAborted()
        let skinned = 0
        asset.scene.traverse(object => { if (object instanceof THREE.SkinnedMesh && object.geometry.attributes.uv && object.geometry.attributes.skinWeight) skinned++ })
        if (skinned !== 2 || !asset.scene.getObjectByName('Head') || !asset.scene.getObjectByName('CORE') ||
            !CUTES_CLIPS.every(name => asset!.animations.some(clip => clip.name.endsWith(`|${name}`)))) throw new Error('Incomplete CUTES character asset')
        return asset
    } catch (error) {
        if (asset) disposeSceneAsset(asset)
        throw error
    }
}

export function createCutesFamily(assets: ReadonlyMap<CutesModelId, GLTF>) {
    for (const id of CUTES_MODELS) if (!assets.has(id)) throw new Error(`Missing CUTES model: ${id}`)
    let disposed = false
    return {
        get(variant: CutesVariant): GLTF {
            if (disposed) throw new Error('CUTES family is disposed')
            return assets.get(CUTES_VARIANTS[variant])!
        },
        dispose() {
            if (disposed) return
            disposed = true
            new Set(assets.values()).forEach(disposeSceneAsset)
        },
    }
}
export type CutesFamily = ReturnType<typeof createCutesFamily>

/** One family owns source buffers/images; actors borrow those buffers and own independent rigs. */
export async function loadCutesFamily(signal: AbortSignal): Promise<CutesFamily> {
    const assets = new Map<CutesModelId, GLTF>()
    // Settled loading prevents late requests from leaking after a sibling asset fails.
    const results = await Promise.allSettled(CUTES_MODELS.map(async id => {
        const response = await fetch(`/models/cutes/${id}.glb`, { signal })
        if (!response.ok) throw new Error(`CUTES ${id}: ${response.status}`)
        const asset = await parseCutesAsset(await response.arrayBuffer(), signal)
        assets.set(id, asset)
    }))
    const failed = results.find(result => result.status === 'rejected')
    if (failed?.status === 'rejected' || signal.aborted) {
        assets.forEach(disposeSceneAsset)
        signal.throwIfAborted()
        throw failed?.status === 'rejected' ? failed.reason : new Error('CUTES loading failed')
    }
    return createCutesFamily(assets)
}
