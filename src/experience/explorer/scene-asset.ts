import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** Raw asset data has one world owner; actor clones borrow its geometry and images. */
export function disposeSceneAsset(asset: GLTF) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), skeletons = new Set<THREE.Skeleton>()
    asset.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material)
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
        }
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
    })
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => { value.dispose(); (value.source.data as ImageBitmap | undefined)?.close?.() }); skeletons.forEach(value => value.dispose())
    asset.scene.removeFromParent()
}

export async function loadSceneAsset(url: string, signal: AbortSignal, validate: (asset: GLTF) => boolean): Promise<GLTF | undefined> {
    let asset: GLTF | undefined
    try {
        const response = await fetch(url, { signal })
        if (!response.ok) throw new Error(`World asset: ${response.status}`)
        asset = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
        signal.throwIfAborted()
        if (!validate(asset)) throw new Error('Incomplete world asset')
        return asset
    } catch (error) {
        if (asset) disposeSceneAsset(asset)
        if (signal.aborted) throw error
        return undefined
    }
}
