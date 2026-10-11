import { advance, separate, surfaceDistance, surfaceFrame, transport } from './planet.ts'
import type { MoveInput, WorldTargetId, WorldSimulation } from './types'
import { worldTargets, SPAWN } from './world-data.ts'
import { constrainWater } from './terrain.ts'

import { obstacles } from './village-layout.ts'
import { createPopulation } from './population.ts'
export { destinations } from './world-data.ts'
export { obstacles, treePositions, housePositions, streetPoles } from './village-layout.ts'
export const CAMERA_YAW = .28
const PLAYER_RADIUS = .36
const initialObjects = Array.from({ length: 9 }, (_, index) => ({ x: -3 + index % 3 * 1.1, z: 6 + Math.floor(index / 3) * 1.1, vx: 0, vz: 0, radius: .32 }))

/** Spherical locomotion and collision are independent of rendering, Vue, and content sources. */
export function createWorldSimulation(): WorldSimulation {
    const body = { ...SPAWN, y: 0, vy: 0, yaw: CAMERA_YAW, speed: 0 }, objects = structuredClone(initialObjects)
    const frame = surfaceFrame(body),population=createPopulation()
    let visited:WorldTargetId|null=null
    function constrain(point: { x: number; z: number }, radius: number) { for (let pass = 0; pass < 3; pass++) for (const obstacle of [...obstacles,...population.people.map(person=>({...person,radius:.36})),...population.animals.map(pet=>({...pet,radius:.23}))]) separate(point, obstacle, obstacle.radius + radius) }
    const simulation: WorldSimulation = {
        body, objects, frame,population,target:id=>population.target(id,body),setConversation:id=>population.setConversation(id),setReduced:value=>population.setReduced(value),interactPet:(id,action)=>population.interactPet(id,action),
        step(delta: number, input: MoveInput) {
            const dt = Number.isFinite(delta) ? Math.min(.05, Math.max(0, delta)) : 0
            population.step(dt,body)
            const ix = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, input.x)) : 0, iz = Number.isFinite(input.forward) ? Math.max(-1, Math.min(1, input.forward)) : 0
            const length = Math.max(1, Math.hypot(ix, iz)), speed = input.run ? 6 : 3.6
            const dx = (ix * Math.cos(CAMERA_YAW) - iz * Math.sin(CAMERA_YAW)) / length, dz = (-ix * Math.sin(CAMERA_YAW) - iz * Math.cos(CAMERA_YAW)) / length
            const previous = { x: body.x, z: body.z }, strength = Math.hypot(dx, dz)
            if (strength > .0001 && dt > 0) { Object.assign(body, advance(frame, dx, dz, speed * strength * dt)); constrain(body, PLAYER_RADIUS); constrainWater(body, previous, PLAYER_RADIUS); transport(frame, surfaceFrame(body).normal) }
            body.speed = dt && strength > 0 ? surfaceDistance(previous, body) / dt : 0
            if (strength > .01) { const target = Math.atan2(dx, dz), difference = Math.atan2(Math.sin(target - body.yaw), Math.cos(target - body.yaw)); body.yaw += difference * (1 - Math.exp(-dt * 15)) }
            if (body.y > 0 || body.vy > 0) { body.vy -= dt * 20; body.y = Math.max(0, body.y + body.vy * dt); if (!body.y) body.vy = 0 }
            for (const object of objects) {
                const distance = surfaceDistance(object, body), minimum = PLAYER_RADIUS + object.radius
                if (distance < minimum && body.y < .65) {
                    const ox = object.x, oz = object.z; separate(object, body, minimum)
                    const px = object.x - ox, pz = object.z - oz, scale = Math.hypot(px, pz) || 1
                    object.vx += px / scale * (body.speed * .85 + .2); object.vz += pz / scale * (body.speed * .85 + .2)
                }
                if (Math.hypot(object.vx, object.vz) > .0001) Object.assign(object, advance(surfaceFrame(object), object.vx, object.vz, Math.hypot(object.vx, object.vz) * dt))
                object.vx *= Math.exp(-dt * 3.1); object.vz *= Math.exp(-dt * 3.1); constrain(object, object.radius); constrainWater(object, object, object.radius)
            }
            for (let a = 0; a < objects.length; a++) for (let b = a + 1; b < objects.length; b++) {
                const one = objects[a]!, two = objects[b]!, distance = surfaceDistance(one, two), minimum = one.radius + two.radius
                if (distance < minimum && distance > .0001) { separate(one, two, (minimum + distance) / 2); separate(two, one, minimum) }
            }
        },
        jump() { if (body.y <= .001) body.vy = 7 },
        reset() { Object.assign(body, { ...SPAWN, y: 0, vy: 0, yaw: CAMERA_YAW, speed: 0 }); Object.assign(frame, surfaceFrame(body)); objects.splice(0, objects.length, ...structuredClone(initialObjects));population.reset();visited=null },
        visit(id: WorldTargetId) { const place = population.target(id,body); if (place) { Object.assign(body, { ...place.arrival, y: 0, vy: 0, yaw: Math.PI, speed: 0 }); Object.assign(frame, surfaceFrame(body));visited=id } },
        nearest() { const selected=visited&&population.target(visited,body);if(selected&&surfaceDistance(body,selected)<selected.radius)return selected.id;visited=null;return worldTargets.map(source=>population.target(source.id,body)!).map(place => ({ place, score: surfaceDistance(body, place) / place.radius })).filter(item => item.score < 1).sort((a, b) => a.score - b.score)[0]?.place.id ?? null },
    }
    return simulation
}
