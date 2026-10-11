import type { MoveInput } from '../explorer/types.ts'
export const gaitStride=(speed:number)=>1.25+.65*Math.max(0,Math.min(1,(speed-2.6)/1.6))
export interface Velocity { vx: number; vz: number }
/** Exact exponential integration keeps acceleration/braking consistent across display refresh rates. */
export function advanceVelocity(body: Velocity, input: MoveInput, speed: number, dt: number) {
    const x = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, input.x)) : 0
    const z = Number.isFinite(input.forward) ? -Math.max(-1, Math.min(1, input.forward)) : 0
    const length = Math.max(1, Math.hypot(x, z)), rate = x || z ? 20 : 28, decay = Math.exp(-rate * dt)
    const tx = x / length * speed, tz = z / length * speed
    const dx = tx * dt + (body.vx - tx) * (1 - decay) / rate, dz = tz * dt + (body.vz - tz) * (1 - decay) / rate
    body.vx = tx + (body.vx - tx) * decay; body.vz = tz + (body.vz - tz) * decay
    if (!x && !z && Math.hypot(body.vx, body.vz) < .008) body.vx = body.vz = 0
    return { dx, dz }
}
