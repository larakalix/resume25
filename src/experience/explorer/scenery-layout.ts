import { villagePaths, worldTargets } from './world-data.ts'
import { housePositions } from './village-layout.ts'
import { isWater, nearPath, river, riverX, bridge } from './terrain.ts'
import { surfaceDistance } from './planet.ts'
import type { Point2 } from './types.ts'

export interface SceneryPlacement extends Point2 { kind: 'shrub' | 'grass' | 'rock'; scale: number; yaw: number }
export function naturePlacements(): SceneryPlacement[] {
    const points: SceneryPlacement[] = []
    function add(point: Point2, kind: SceneryPlacement['kind'], seed: number, scale: number) {
        if (isWater(point, .3) || nearPath(point, 1.25) || worldTargets.some(target => surfaceDistance(target, point) < (target.kind === 'place' ? 3 : 2.2)) || housePositions.some(house => surfaceDistance(house, point) < 2.5)) return
        points.push({ ...point, kind, scale, yaw: seed * 2.39996 })
    }
    villagePaths.forEach((path, index) => {
        for (let section = 0; section < path.length - 1; section++) {
            const start = path[section]!, end = path[section + 1]!, length = Math.hypot(end.x - start.x, end.z - start.z), dx = (end.x - start.x) / length, dz = (end.z - start.z) / length
            for (let distance = 2; distance < length - 1; distance += 3.8) for (const side of [-1, 1]) {
                const seed = index * 17 + section * 7 + distance + side
                add({ x: start.x + dx * distance - dz * side * 1.7, z: start.z + dz * distance + dx * side * 1.7 }, 'shrub', seed, .32 + (Math.floor(seed) % 3) * .09)
            }
        }
    })
    for (let i = 0; i < 40; i++) {
        const z = river.from + 1 + i / 39 * (river.to - river.from - 2)
        if (Math.abs(z - bridge.z) < 2.7) continue
        for (const side of [-1, 1]) add({ x: riverX(z) + side * (river.halfWidth + 1.15), z }, i % 5 ? 'grass' : 'rock', i * 3 + side, i % 5 ? .38 + i % 3 * .1 : .35 + i % 3 * .08)
    }
    return points
}
