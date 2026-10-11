import * as THREE from 'three'
import type { ArtKit } from './art-kit.ts'
import { villageBenches } from './world-data.ts'

/** Original street furniture: quiet evidence that this is a village people use. */
export function buildVillageDetails(kit: ArtKit) {
    const { surface, mesh, box, cylinder, torus } = kit
    for (const point of villageBenches) {
        const root = surface(point.x, point.z); root.rotateY(point.yaw)
        for (let i = 0; i < 3; i++) mesh(box, i === 1 ? 'sand' : 'wood', [0, .55, (i - 1) * .21], [1.9, .1, .18], root)
        for (const x of [-.72, .72]) {
            mesh(box, 'navy', [x, .28, 0], [.09, .56, .6], root)
            mesh(box, 'navy', [x, .85, -.26], [.07, .78, .07], root)
        }
        for (const y of [.85, 1.1]) mesh(box, 'wood', [0, y, -.27], [1.9, .17, .09], root)
    }
    const bicycle = surface(15.8, -6.3); bicycle.rotateY(.4)
    for (const x of [-.52, .52]) {
        mesh(torus, 'navy', [x, .4, 0], [.37, .37, .16], bicycle)
        mesh(torus, 'cream', [x, .4, 0], [.31, .31, .045], bicycle)
    }
    const axis = new THREE.Vector3(0, 1, 0)
    function bar(from: [number, number, number], to: [number, number, number], color: 'coral' | 'navy') {
        const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), middle = a.clone().add(b).multiplyScalar(.5), direction = b.sub(a)
        const beam = mesh(cylinder, color, middle.toArray(), [.025, direction.length(), .025], bicycle)
        beam.quaternion.setFromUnitVectors(axis, direction.normalize())
    }
    for (const [a, b] of [[[-.52, .4, 0], [-.1, .4, 0]], [[-.52, .4, 0], [-.21, .88, 0]], [[-.21, .88, 0], [-.1, .4, 0]], [[-.21, .88, 0], [.33, .94, 0]], [[-.1, .4, 0], [.33, .94, 0]], [[.33, .94, 0], [.52, .4, 0]]] as const) bar([...a], [...b], 'coral')
    bar([.33, .94, 0], [.27, 1.14, 0], 'navy'); bar([.27, 1.14, 0], [.1, 1.14, 0], 'navy')
    mesh(box, 'navy', [-.21, .94, 0], [.25, .06, .12], bicycle)
    for (const [x, z, yaw] of [[-16.9, 17.3, .4], [12.2, -8.2, -.2]]) {
        const root = surface(x!, z!); root.rotateY(yaw!)
        for (let i = 0; i < 3; i++) {
            const y = i === 2 ? .8 : .27, dx = i === 0 ? -.29 : i === 1 ? .29 : .07
            mesh(box, 'wood', [dx, y, 0], [.5, .5, .5], root)
            for (const side of [-1, 1]) mesh(box, 'sand', [dx + side * .18, y, .26], [.05, .45, .025], root)
        }
    }
}
