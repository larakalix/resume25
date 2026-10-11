import * as THREE from 'three'
import { locomotionWeights, type CharacterMotionInput } from '../explorer/character-motion.ts'

export interface CutesMotionInput extends CharacterMotionInput { crouching?: boolean }
const names = ['idle', 'walk', 'run', 'jumpStart', 'jumpAir', 'land'] as const
type Motion = typeof names[number]

/** Keep the supplied motion and rig intact while simulation owns all root travel and jump height. */
export function cutesClips(source: THREE.AnimationClip[]) {
    const authored = (name: string) => {
        const clip = source.find(value => value.name.endsWith(`|${name}`))
        if (!clip) throw new Error(`Missing authored CUTES animation: ${name}`)
        const copy = clip.clone()
        copy.tracks = copy.tracks.filter(track => !/^(?:CORE|Armature|RootNode)\.position$/u.test(track.name))
        return copy
    }
    const idle = authored('Idle'), walk = authored('Walk'), run = authored('Sprint'), jump = authored('Jump'), land = authored('Grounded')
    idle.name = 'idle'; walk.name = 'walk'; run.name = 'run'; jump.name = 'jumpStart'; land.name = 'land'
    // Hold the creator's actual takeoff endpoint in the air, with no added translation.
    const air = new THREE.AnimationClip('jumpAir', 1, jump.tracks.map(track => {
        const value = track.values.slice(-track.getValueSize()), copy = track.clone()
        copy.times = new Float32Array([0, 1]); copy.values = new Float32Array([...value, ...value])
        return copy
    }))
    return [idle, walk, run, jump, air, land]
}

export function createCutesMotion(root: THREE.Object3D, source: THREE.AnimationClip[], options: { phase?: number; scale?: number; resident?: boolean } = {}) {
    const clips = cutesClips(source), mixer = new THREE.AnimationMixer(root)
    const actions = Object.fromEntries(clips.map(clip => {
        const action = mixer.clipAction(clip)
        if (clip.name === 'jumpStart' || clip.name === 'land') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
        action.time = (options.phase ?? 0) * clip.duration; action.play()
        return [clip.name, action]
    })) as Record<Motion, THREE.AnimationAction>
    const weights: Record<Motion, number> = { idle: 1, walk: 0, run: 0, jumpStart: 0, jumpAir: 0, land: 0 }
    const body = root.getObjectByName('Body')!, left = root.getObjectByName('HandL')!, right = root.getObjectByName('HandR')!
    const overlays = [body, left, right].map(object => ({ object, position: object.position.clone(), quaternion: object.quaternion.clone() }))
    const save = () => overlays.forEach(({ object, position, quaternion }) => { position.copy(object.position); quaternion.copy(object.quaternion) })
    const restore = () => overlays.forEach(({ object, position, quaternion }) => { object.position.copy(position); object.quaternion.copy(quaternion) })
    const rotation = new THREE.Quaternion(), euler = new THREE.Euler()
    let disposed = false, airborne = false, landing = 0, stride = options.phase ?? 0, wave = 0, waveTime = 0, crouch = 0
    let state: Motion = 'idle', reduced = false
    function applyPosture(blend: number) {
        crouch = THREE.MathUtils.clamp(blend, 0, 1)
        restore()
        // This intentionally compact rig has free hands and feet rather than elbow/knee chains.
        // Offsets are in the creator's 100x armature units and preserve the planted feet.
        body.position.y -= .0018 * crouch
        body.quaternion.multiply(rotation.setFromEuler(euler.set(.13 * crouch, 0, 0)))
        left.position.y -= .0011 * crouch; right.position.y -= .0011 * crouch
        if (wave > .0001) {
            const flutter = reduced ? 0 : Math.sin(waveTime * Math.PI * 5)
            right.position.x += .0012 * wave
            right.position.y += (.0086 + flutter * .0002) * wave
            right.position.z += .0023 * wave
            right.quaternion.premultiply(rotation.setFromEuler(euler.set(.15 * wave, flutter * .30 * wave, -.55 * wave)))
        }
    }
    function update(dt: number, input: CutesMotionInput) {
        if (disposed) return
        restore()
        const delta = Math.min(.05, Math.max(0, dt)), flight = input.y > .001 || input.vy > 0
        if (airborne && !flight) { landing = .25; actions.land.reset().play() }
        if (!airborne && flight) { actions.jumpStart.reset().play(); actions.jumpAir.reset().play() }
        airborne = flight; landing = Math.max(0, landing - delta); reduced = input.reduced
        const speed = Math.max(0, Number.isFinite(input.speed) ? input.speed : 0)
        const gait = locomotionWeights(speed, 2.5, 4.2, options.resident ? .18 : .65)
        const targets: Record<Motion, number> = { ...gait, jumpStart: 0, jumpAir: 0, land: 0 }
        if (flight || landing > 0) { names.forEach(name => { targets[name] = 0 }); targets[flight ? input.vy > 1 ? 'jumpStart' : 'jumpAir' : 'land'] = 1 }
        const blend = reduced ? 1 : 1 - Math.exp(-delta * 15)
        state = names.reduce((a, b) => targets[a] >= targets[b] ? a : b)
        // The 2.5 s source loops contain three strides; phase follows measured travel, not key state.
        const strideDistance = THREE.MathUtils.lerp(3.6, 5.4, gait.run) * (options.scale ?? 1)
        if (!reduced && !flight) stride = (stride + speed * delta / strideDistance) % 1
        wave += ((input.waving ? 1 : 0) - wave) * blend
        if (!reduced && input.waving) waveTime += delta
        else if (!input.waving && wave < .001) waveTime = 0
        for (const name of names) {
            weights[name] += (targets[name] - weights[name]) * blend
            const action = actions[name]
            action.setEffectiveWeight(weights[name]); action.setEffectiveTimeScale(name === 'jumpStart' ? 1.4 : name === 'land' ? 1.35 : 1)
            if (name === 'walk' || name === 'run') { action.time = stride * action.getClip().duration; action.setEffectiveTimeScale(0) }
            if (reduced) { action.time = name === 'jumpAir' ? .5 : 0; action.setEffectiveTimeScale(0) }
        }
        mixer.update(reduced ? 0 : delta)
        save()
        applyPosture(input.crouching ? 1 : 0)
    }
    update(0, { speed: 0, y: 0, vy: 0, waving: false, reduced: false })
    return { update, posture: applyPosture, clips, get state() { return state }, snapshot: () => ({ ...weights, wave, crouch, stride }), dispose() { if (disposed) return; disposed = true; restore(); mixer.stopAllAction(); mixer.uncacheRoot(root) } }
}
