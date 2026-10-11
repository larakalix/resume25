/** Shared art direction for the existing toon materials and day/night lighting. */
export const celStyle = {
    bands: [60, 60, 150, 255],
    day: { hemisphere: 1.1, sun: 2.6, fill: .15 },
    night: { hemisphere: .95, sun: .35, fill: .18 },
    shadow: { bias: -.0004, normalBias: .06 },
} as const
