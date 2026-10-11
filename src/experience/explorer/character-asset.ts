import { loadSceneAsset } from './scene-asset.ts'
export { disposeSceneAsset as disposeCharacterAsset } from './scene-asset.ts'

export const CHARACTER_URL = '/models/engineer/engineer.glb'
export const MOTION_NAMES = ['idle', 'walk', 'run', 'jumpStart', 'jumpAir', 'land', 'wave'] as const
export type MotionName = typeof MOTION_NAMES[number]

export function loadCharacterAsset(signal: AbortSignal) {
    return loadSceneAsset(CHARACTER_URL, signal, asset => !!asset.scene.getObjectByName('Head') && !!asset.scene.getObjectByName('spine_03') && MOTION_NAMES.every(name => asset.animations.some(clip => clip.name === name)))
}
