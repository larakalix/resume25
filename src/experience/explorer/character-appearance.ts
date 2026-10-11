import * as THREE from 'three'
import type { ArtColor, ArtKit } from './art-kit.ts'
import type { ResidentId } from './types.ts'

export interface CharacterAppearance { coat: ArtColor; trousers: ArtColor; skin: ArtColor; hair: ArtColor; glasses: boolean; satchel: boolean; style: 'parted' | 'bob' | 'puff' | 'beanie'; height: number; width: number }
export const playerAppearance: CharacterAppearance = { coat: 'blue', trousers: 'navy', skin: 'skin', hair: 'hair', glasses: true, satchel: true, style: 'parted', height: .7, width: .96 }
export const residentAppearances: Record<ResidentId, CharacterAppearance> = {
    mira: { coat: 'coral', trousers: 'navy', skin: 'skin', hair: 'wood', glasses: false, satchel: true, style: 'bob', height: .65, width: .96 },
    theo: { coat: 'mint', trousers: 'navy', skin: 'sand', hair: 'hair', glasses: true, satchel: false, style: 'puff', height: .73, width: .9 },
    sol: { coat: 'gold', trousers: 'blue', skin: 'wood', hair: 'hair', glasses: false, satchel: false, style: 'beanie', height: .64, width: 1.12 },
}

/** Recolor the prepared clothing regions in the shader; all actors share the original vertex buffers. */
export function applyCharacterAppearance(material: THREE.MeshToonMaterial, kit: ArtKit, appearance: CharacterAppearance) {
    const regions = [
        ['shirt', 'blue', appearance.coat], ['trousers', 'navy', appearance.trousers], ['skin', 'skin', appearance.skin],
    ] as const
    const source = regions.map(([, from]) => new THREE.Color(kit.palette[from]))
    const destination = regions.map(([, , to]) => new THREE.Color(kit.palette[to]))
    material.onBeforeCompile = shader => {
        source.forEach((color, index) => { shader.uniforms[`uCharacterFrom${index}`] = { value: color }; shader.uniforms[`uCharacterTo${index}`] = { value: destination[index] } })
        shader.fragmentShader = regions.map((_, i) => `uniform vec3 uCharacterFrom${i};uniform vec3 uCharacterTo${i};`).join('\n') + '\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + regions.map((_, i) => `diffuseColor.rgb = mix(diffuseColor.rgb, uCharacterTo${i}, 1. - step(.012, distance(vColor.rgb, uCharacterFrom${i})));`).join('\n'))
    }
    material.customProgramCacheKey = () => 'village-character-appearance-1'
}
