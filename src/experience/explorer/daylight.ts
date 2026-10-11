import type { TimeMode } from './types.ts'
export const DAY_LENGTH = 240
/** A calm four-minute cycle. Reduced motion keeps automatic lighting in daylight. */
export function daylight(elapsed: number, mode: TimeMode, reduced = false) {
    if (mode === 'day' || (reduced && mode === 'cycle')) return 1
    if (mode === 'night') return 0
    const altitude = Math.sin(((Number.isFinite(elapsed) ? elapsed : 0) / DAY_LENGTH + .15) * Math.PI * 2)
    const t = Math.max(0, Math.min(1, (altitude + .25) / .65))
    return t * t * (3 - 2 * t)
}
