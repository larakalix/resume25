import { separate, surfaceDistance } from './planet.ts'
import type { Point2 } from './types.ts'
import { villagePaths } from './world-data.ts'

export const bridge = { x: 6.2, z: 5, halfLength: 5, halfWidth: 1.45 }
export const lakes = [{ x: 7, z: -22, radius: 4.2 }, { x: 8, z: 25, radius: 5.5 }, { x: -30, z: -20, radius: 5 }, { x: -22, z: 23, radius: 5.2 }]
export const river = { from: -23, to: 25, halfWidth: 1.8 }
export function riverX(z: number) { return bridge.x + Math.sin((z - bridge.z) * .16) * 1.1 }
export function onBridge(point: Point2) { return Math.abs(point.x - bridge.x) <= bridge.halfLength + 1e-6 && Math.abs(point.z - bridge.z) <= bridge.halfWidth - .3 + 1e-6 }
export function isWater(point: Point2, margin = 0) { return lakes.some(lake => surfaceDistance(point, lake) < lake.radius + margin) || (point.z >= river.from && point.z <= river.to && Math.abs(point.x - riverX(point.z)) < river.halfWidth + margin) }
export function groundHeight(point: Point2) { return onBridge(point) ? .08 + Math.max(0, Math.sin((point.x - bridge.x + bridge.halfLength) / (bridge.halfLength * 2) * Math.PI)) * .65 : 0 }
export function nearPath(point: Point2, margin = 1.3) {
    return villagePaths.some(path => path.some((a, i) => {
        const b = path[i + 1]; if (!b) return false
        const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)))
        return Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz) < margin
    })) || Math.abs(point.z + 32) < margin
}
export function constrainWater(point: Point2, previous: Point2, radius: number) {
    for (const lake of lakes) separate(point, lake, lake.radius + radius)
    if (onBridge(point)) return
    if (point.z >= river.from && point.z <= river.to && Math.abs(point.x - riverX(point.z)) < river.halfWidth + radius) {
        if (onBridge(previous)) point.z = Math.max(bridge.z - bridge.halfWidth + .3, Math.min(bridge.z + bridge.halfWidth - .3, point.z))
        else point.x = riverX(point.z) + (previous.x < riverX(previous.z) ? -1 : 1) * (river.halfWidth + radius)
    }
}
