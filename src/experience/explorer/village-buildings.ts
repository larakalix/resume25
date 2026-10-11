import * as THREE from 'three'
import { destinations } from './world-data'
import { housePositions, streetPoles } from './village-layout'
import { surfacePoint } from './planet'
import type { ArtKit, ArtColor as Color } from './art-kit'
import { buildVillageDetails } from './village-details'

export function buildVillage(kit: ArtKit) {
    const { surface, mesh, batch, staticMeshes, scene, box, cylinder, sphere, cone, torus, leaf, geometries } = kit
    const windows: THREE.Matrix4[] = [], lamps: THREE.Matrix4[] = [], windowParts: THREE.Mesh[] = []
    const roofGeometry = new THREE.BufferGeometry()
    const vertices = [-.5,0,.5,.5,0,.5,0,.8,.5, .5,0,-.5,-.5,0,-.5,0,.8,-.5, -.5,0,-.5,-.5,0,.5,0,.8,.5, -.5,0,-.5,0,.8,.5,0,.8,-.5, 0,.8,-.5,0,.8,.5,.5,0,.5, 0,.8,-.5,.5,0,.5,.5,0,-.5]
    roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3)); roofGeometry.computeVertexNormals(); geometries.push(roofGeometry)
    function house(x: number, z: number, index: number, large = false) {
        const start = staticMeshes.length, root = surface(x, z), color: Color = index % 3 === 0 ? 'mint' : index % 3 === 1 ? 'cream' : 'sand', height = large ? 3.8 : index % 4 === 0 ? 3.8 : 2.3 + index % 3 * .35, width = large ? 3.6 : 2.4
        root.rotateY(index * .61)
        mesh(box, color, [0, height / 2, 0], [width, height, 2.45], root)
        const roof = mesh(roofGeometry, index % 3 === 0 ? 'blue' : 'coral', [0, height, 0], [width + .5, 1.3, 2.95], root); roof.rotation.y = 0
        const halfRoof=(width+.5)/2
        for(const side of [-1,1]) {
            const rafter=mesh(box,'wood',[side*halfRoof/2,height+.52,1.49],[Math.hypot(halfRoof,1.04),.065,.075],root)
            rafter.rotation.z=-side*Math.atan2(1.04,halfRoof)
            mesh(box,'wood',[side*(width/2+.06),height-.04,0],[.08,.13,2.8],root)
        }
        mesh(box, 'wood', [0, .75, 1.24], [.65, 1.5, .07], root)
        for(const side of [-1,1])mesh(box,'navy',[side*.37,.79,1.3],[.065,1.6,.09],root)
        mesh(box,'navy',[0,1.57,1.3],[.8,.07,.09],root)
        mesh(sphere,'gold',[.2,.76,1.31],[.035,.035,.035],root,false,false)
        for (const y of height > 3.3 ? [1.35, 2.8] : [1.35]) for (const side of [-1, 1]) { mesh(box, 'navy', [side * .77, y, 1.25], [.5, .67, .06], root); const window = mesh(box, 'gold', [side * .77, y, 1.32], [.35, .51, .03], root); windowParts.push(window); mesh(box, 'cream', [side * .77, y, 1.32], [.04, .55, .03], root) }
        mesh(box, 'pale', [0, .08, 0], [width + .15, .16, 2.6], root)
        if (index % 4 === 0) { for (const x of [-width / 2 + .05, width / 2 - .05]) mesh(box, 'wood', [x, height / 2, 1.25], [.08, height, .08], root) }
        mesh(box, 'cream', [0, .12, 1.55], [1, .22, .65], root)
        mesh(box, 'coral', [.7, height + .6, -.3], [.45, 1, .5], root)
        mesh(box,'navy',[.7,height+1.13,-.3],[.55,.08,.6],root)
        if(index%3===0)for(let i=0;i<5;i++) {
            const awning=mesh(box,i%2?'cream':'blue',[-.6+i*.3,1.85,1.61],[.3,.065,.8],root)
            awning.rotation.x=.15
        }
        for (const side of [-1, 1]) {
            mesh(box, 'wood', [side * .77, .92, 1.35], [.65, .15, .3], root)
            for (let i = 0; i < 3; i++) mesh(leaf, i % 2 ? 'mint' : 'green', [side * .77 + (i - 1) * .2, 1.05, 1.36], [.16, .2, .16], root, false, false)
        }
        if (index % 2) { mesh(cylinder, 'navy', [-.7, height + 1.1, 0], [.025, 1.2, .025], root); mesh(box, 'navy', [-.7, height + 1.5, 0], [.8, .03, .03], root) }
        scene.updateMatrixWorld(true); windowParts.splice(0).forEach(part => { const matrix = part.matrixWorld.clone(); const offset = new THREE.Matrix4().makeTranslation(0, 0, 1); matrix.multiply(offset); windows.push(matrix) })
        batch(staticMeshes.splice(start), true)
        return root
    }
    housePositions.forEach((point, i) => house(point.x, point.z, i))
    const home = destinations.find(place => place.id === 'about')!; house(home.x, home.z, 1, true)
    // Four recognizable places: home, maker's workshop, observatory, and harbor office.
    const workshopStart = staticMeshes.length, workshop = surface(14, -10)
    mesh(box, 'cream', [0, 1.2, 0], [3.2, 2.4, 2.5], workshop)
    mesh(box, 'blue', [0, 2.65, .3], [3.8, .2, 3.8], workshop)
    for (let i = 0; i < 7; i++) mesh(box, i % 2 ? 'cream' : 'blue', [-1.65 + i * .55, 2.57, 2.1], [.55, .3, .7], workshop)
    mesh(box, 'wood', [0, .7, 1.8], [2.6, .15, .8], workshop)
    const mobile = new THREE.Group(); mobile.position.set(0, 3.8, 0); workshop.add(mobile)
    mesh(torus, 'gold', [0, 0, 0], [.85, .85, .85], mobile, true)
    for (let i = 0; i < 4; i++) { const blade = mesh(box, i % 2 ? 'coral' : 'cream', [Math.sin(i * Math.PI / 2) * .6, Math.cos(i * Math.PI / 2) * .6, 0], [.25, 1.1, .08], mobile, true); blade.rotation.z = -i * Math.PI / 2 }
    batch(staticMeshes.splice(workshopStart), true)
    const observatoryStart = staticMeshes.length, observatory = surface(18, 10)
    mesh(cylinder, 'cream', [0, 1.6, 0], [1.75, 3.2, 1.75], observatory)
    mesh(sphere, 'blue', [0, 3.25, 0], [1.9, 1.15, 1.9], observatory)
    mesh(box, 'navy', [0, 1.3, 1.73], [.7, 1.7, .09], observatory)
    const dish = new THREE.Group(); dish.position.set(.7, 4.3, 0); dish.rotation.z = -.4; observatory.add(dish)
    mesh(cylinder, 'wood', [0, 0, 0], [.08, 1.5, .08], dish)
    mesh(cone, 'gold', [0, .6, 0], [.75, .4, .75], dish)
    batch(staticMeshes.splice(observatoryStart), true)
    const contactStart = staticMeshes.length, contact = surface(-15, 15)
    mesh(box, 'mint', [0, 1.35, 0], [3.2, 2.7, 2.2], contact)
    mesh(box, 'coral', [0, 2.85, 0], [3.8, .28, 2.8], contact)
    for (let i = 0; i < 7; i++) mesh(box, 'wood', [-1.7 + i * .56, .12, 2.3], [.5, .24, 2.6], contact)
    mesh(box, 'blue', [0, 1.45, 1.15], [1.2, 1.25, .7], contact)
    mesh(box, 'cream', [0, 1.6, 1.53], [.8, .09, .03], contact)
    const flag = mesh(box, 'gold', [.8, 2, 1.3], [.08, .7, .5], contact, true)
    batch(staticMeshes.splice(contactStart), true)
    for (let i = 0; i < 16; i++) {
        const root = surface(-77 + i * 10, -29.5)
        mesh(cylinder, 'navy', [0, 1.2, 0], [.06, 2.4, .06], root)
        const lamp = mesh(box, 'cream', [0, 2.5, 0], [.4, .55, .4], root)
        scene.updateMatrixWorld(true); lamps.push(lamp.matrixWorld.clone())
    }
    streetPoles.forEach(point => { const root = surface(point.x, point.z); mesh(cylinder, 'wood', [0, 2.4, 0], [.07, 4.8, .07], root); mesh(box, 'navy', [0, 4.8, 0], [.55, .08, .12], root) })
    buildVillageDetails(kit)
    const middle = { x: (streetPoles[0]!.x + streetPoles[1]!.x) / 2, z: -1.8 }
    const points = [surfacePoint(streetPoles[0]!,4.85),surfacePoint(middle,4.1),surfacePoint(streetPoles[1]!,4.85)]
    const cable = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x,p.y,p.z))),20,.02,4,false); geometries.push(cable); mesh(cable,'navy',[0,0,0],[1,1,1],scene,false,false)
    return { mobile, flag, windows, lamps }
}
