import * as THREE from 'three'
import type { MotionName } from './character-asset.ts'

export interface CharacterMotionInput { speed: number; y: number; vy: number; waving: boolean; reduced: boolean }
type BaseMotion = Exclude<MotionName, 'wave'>
const BASES: BaseMotion[] = ['idle', 'walk', 'run', 'jumpStart', 'jumpAir', 'land']
const greetingBone = /^(?:upperarm_r|lowerarm_r|hand_r|(?:index|middle|pinky|ring|thumb)_\d\d_r)\./

/** Animation follows actual travel, including collisions; simulation alone owns position and jump height. */
export function locomotionWeights(speed: number, runStart=3.6, runFull=6,walkFull=.8) {
    const walk = THREE.MathUtils.clamp(speed / walkFull, 0, 1), run = THREE.MathUtils.clamp((speed - runStart) / (runFull-runStart), 0, 1)
    return { idle: 1 - walk, walk: walk * (1 - run), run }
}

interface CharacterGait {walkStride:number;runStride:number;runStart:number;runFull:number;waveRate:number;walkFull?:number}

export function createCharacterMotion(root: THREE.Object3D, clips: THREE.AnimationClip[], phase = 0, gait:CharacterGait = {walkStride:4.95,runStride:7,runStart:3.6,runFull:6,waveRate:2.65}) {
    const mixer = new THREE.AnimationMixer(root), weights: Record<BaseMotion, number> = { idle: 1, walk: 0, run: 0, jumpStart: 0, jumpAir: 0, land: 0 }
    const byName = Object.fromEntries(clips.map(clip => [clip.name, clip])) as Record<MotionName, THREE.AnimationClip>
    // Separate the greeting arm so waving never freezes walking or steals weight from the legs.
    const actions = Object.fromEntries(BASES.map(name => {
        const clip = byName[name], lower = mixer.clipAction(new THREE.AnimationClip(`${name}:body`, clip.duration, clip.tracks.filter(track => !greetingBone.test(track.name))))
        const upper = mixer.clipAction(new THREE.AnimationClip(`${name}:arm`, clip.duration, clip.tracks.filter(track => greetingBone.test(track.name))))
        if (name === 'jumpStart' || name === 'land') for (const action of [lower, upper]) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
        lower.time = upper.time = THREE.MathUtils.euclideanModulo(phase, 1) * clip.duration
        lower.play(); upper.play(); return [name, { lower, upper }]
    })) as Record<BaseMotion, { lower: THREE.AnimationAction; upper: THREE.AnimationAction }>
    const waveClip = new THREE.AnimationClip('wave:arm', byName.wave.duration, byName.wave.tracks.filter(track => greetingBone.test(track.name)))
    const wave = mixer.clipAction(waveClip); wave.setLoop(THREE.LoopOnce, 1); wave.clampWhenFinished = true; wave.play()
    let airborne = false, landing = 0, waveWeight = 0, wasWaving = false, disposed = false, stride = 0
    let state: BaseMotion = 'idle'
    function update(dt: number, input: CharacterMotionInput) {
        if (disposed) return
        const delta = Math.min(.05, Math.max(0, dt)), flight = input.y > .001 || input.vy > 0
        if (airborne && !flight) { landing = .22; actions.land.lower.reset(); actions.land.upper.reset() }
        if (!airborne && flight) { actions.jumpStart.lower.reset(); actions.jumpStart.upper.reset(); actions.jumpAir.lower.reset(); actions.jumpAir.upper.reset() }
        airborne = flight; landing = Math.max(0, landing - delta)
        const locomotion = locomotionWeights(input.speed,gait.runStart,gait.runFull,gait.walkFull), targets: Record<BaseMotion, number> = { ...locomotion, jumpStart: 0, jumpAir: 0, land: 0 }
        if (!input.reduced && !flight) stride = (stride + input.speed * delta / THREE.MathUtils.lerp(gait.walkStride,gait.runStride,locomotion.run)) % 1
        if (flight || landing > 0) {
            for (const name of BASES) targets[name] = 0
            targets[flight ? input.vy > 1 ? 'jumpStart' : 'jumpAir' : 'land'] = 1
        }
        const blend = input.reduced ? 1 : 1 - Math.exp(-delta * (flight || landing ? 20 : 14))
        if (input.waving && !wasWaving) wave.reset().play()
        wasWaving = input.waving
        waveWeight += ((input.waving ? 1 : 0) - waveWeight) * blend
        wave.setEffectiveWeight(waveWeight); wave.setEffectiveTimeScale(gait.waveRate)
        state = BASES.reduce((a, b) => targets[a] >= targets[b] ? a : b)
        for (const name of BASES) {
            weights[name] += (targets[name] - weights[name]) * blend
            const { lower, upper } = actions[name]
            lower.setEffectiveWeight(weights[name]); upper.setEffectiveWeight(weights[name] * (1 - waveWeight))
            const rate = name === 'walk' ? Math.max(.35, input.speed / 3.6) : name === 'run' ? Math.max(.6, input.speed / 6) : name === 'jumpStart' ? 3.4 : name === 'land' ? 3.8 : 1
            lower.setEffectiveTimeScale(rate); upper.setEffectiveTimeScale(rate)
            if (name === 'walk' || name === 'run') { lower.time = upper.time = stride * byName[name].duration; lower.setEffectiveTimeScale(0); upper.setEffectiveTimeScale(0) }
            if (input.reduced) lower.time = upper.time = name === 'jumpAir' ? .7 : name === 'jumpStart' ? 1.2 : name === 'land' ? .5 : 0
        }
        if (input.reduced) wave.time = input.waving ? 1.65 : 0
        mixer.update(input.reduced ? 0 : delta)
    }
    update(0, { speed: 0, y: 0, vy: 0, waving: false, reduced: false })
    return { update, get state() { return state }, snapshot: () => ({ ...weights, wave: waveWeight }), dispose() { disposed = true; mixer.stopAllAction(); mixer.uncacheRoot(root) } }
}
