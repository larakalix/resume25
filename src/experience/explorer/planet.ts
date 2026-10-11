import type { Point2 } from './types.ts'

export const PLANET_RADIUS = 26
export interface Vector3 { x: number; y: number; z: number }
export interface SurfaceFrame { normal: Vector3; east: Vector3; south: Vector3 }
export const dot = (a: Vector3, b: Vector3) => a.x * b.x + a.y * b.y + a.z * b.z
export const cross = (a: Vector3, b: Vector3): Vector3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
export function normalize(v: Vector3): Vector3 { const length = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / length, y: v.y / length, z: v.z / length } }
function rotate(v: Vector3, axis: Vector3, angle: number): Vector3 {
    const c = Math.cos(angle), s = Math.sin(angle), d = dot(axis, v) * (1 - c), perpendicular = cross(axis, v)
    return { x: v.x * c + perpendicular.x * s + axis.x * d, y: v.y * c + perpendicular.y * s + axis.y * d, z: v.z * c + perpendicular.z * s + axis.z * d }
}
export function surfaceFrame(point: Point2): SurfaceFrame {
    const longitude = point.x / PLANET_RADIUS, latitude = point.z / PLANET_RADIUS
    return { normal: { x: Math.sin(longitude) * Math.cos(latitude), y: Math.cos(longitude) * Math.cos(latitude), z: Math.sin(latitude) }, east: { x: Math.cos(longitude), y: -Math.sin(longitude), z: 0 }, south: { x: -Math.sin(longitude) * Math.sin(latitude), y: -Math.cos(longitude) * Math.sin(latitude), z: Math.cos(latitude) } }
}
export function surfacePoint(point: Point2, height = 0): Vector3 { const n = surfaceFrame(point).normal, r = PLANET_RADIUS + height; return { x: n.x * r, y: n.y * r, z: n.z * r } }
export function coordinates(normal: Vector3): Point2 { return { x: Math.atan2(normal.x, normal.y) * PLANET_RADIUS, z: Math.asin(Math.max(-1, Math.min(1, normal.z))) * PLANET_RADIUS } }
export function surfaceDistance(a: Point2, b: Point2) { return Math.acos(Math.max(-1, Math.min(1, dot(surfaceFrame(a).normal, surfaceFrame(b).normal)))) * PLANET_RADIUS }
/** Parallel transport avoids camera/control flips when a walk crosses either geographic pole. */
export function transport(frame: SurfaceFrame, next: Vector3) {
    const axis = cross(frame.normal, next), length = Math.hypot(axis.x, axis.y, axis.z)
    if (length > 1e-9) {
        const unit = normalize(axis), angle = Math.atan2(length, dot(frame.normal, next))
        frame.east = normalize(rotate(frame.east, unit, angle)); frame.south = normalize(rotate(frame.south, unit, angle))
    }
    frame.normal = normalize(next)
}
export function advance(frame: SurfaceFrame, x: number, z: number, distance: number): Point2 {
    const direction = normalize({ x: frame.east.x * x + frame.south.x * z, y: frame.east.y * x + frame.south.y * z, z: frame.east.z * x + frame.south.z * z })
    const angle = distance / PLANET_RADIUS
    transport(frame, { x: frame.normal.x * Math.cos(angle) + direction.x * Math.sin(angle), y: frame.normal.y * Math.cos(angle) + direction.y * Math.sin(angle), z: frame.normal.z * Math.cos(angle) + direction.z * Math.sin(angle) })
    return coordinates(frame.normal)
}
export function separate(point: Point2, obstacle: Point2, minimum: number) {
    const distance = surfaceDistance(point, obstacle)
    if (distance >= minimum) return
    const frame = surfaceFrame(point), other = surfaceFrame(obstacle).normal, d = dot(frame.normal, other)
    const tangent = distance < 1e-5 ? frame.east : normalize({ x: frame.normal.x * d - other.x, y: frame.normal.y * d - other.y, z: frame.normal.z * d - other.z })
    const angle = (minimum - distance) / PLANET_RADIUS
    Object.assign(point, coordinates(normalize({ x: frame.normal.x * Math.cos(angle) + tangent.x * Math.sin(angle), y: frame.normal.y * Math.cos(angle) + tangent.y * Math.sin(angle), z: frame.normal.z * Math.cos(angle) + tangent.z * Math.sin(angle) })))
}
