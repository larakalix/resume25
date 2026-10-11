import * as THREE from 'three'
import type { ArtKit } from '../explorer/art-kit.ts'
import { characterSocket } from '../explorer/character-sockets.ts'

/** Original Ivan details follow the supplied Head bone; the underlying CUTES face stays intact. */
export function addCutesPortrait(kit: ArtKit, head: THREE.Object3D, sourceHeight: number) {
    const socket = characterSocket(head, new THREE.Vector3(0, sourceHeight * .735, .10))
    socket.name = 'Ivan-portrait-accessories'
    const material = (hex: number) => { const value = kit.materials.hair.clone(); value.color.setHex(hex); kit.extras.push(value); return value }
    const hair = material(0x3a302e), beard = material(0x72513d), glasses = material(0x29383e)
    const part = (geometry: THREE.BufferGeometry, position: [number, number, number], scale: [number, number, number], surface: THREE.Material) => {
        const mesh = new THREE.Mesh(geometry, surface); mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; socket.add(mesh); return mesh
    }
    // A cropped rounded cap follows the same broad, soft box silhouette as the source head.
    part(kit.rounded, [0, .425, -.035], [1.135, .26, .99], hair)
    for (const side of [-1, 1]) {
        part(kit.rounded, [side * .528, .23, -.015], [.075, .31, .83], hair)
        part(kit.rounded, [side * .52, -.06, .32], [.055, .20, .075], hair)
        const lock = part(kit.rounded, [side * .18, .40, .437], [.36, .105, .12], hair); lock.rotation.z = side * -.10
    }
    // Close beard with a curved, rounded lower edge; no unrelated full-face replacement.
    const positions: number[] = [], point = (u: number, v: number) => {
        const x = (u - .5) * .88, y = -.35 + v * .20 + .045 * (Math.abs(x) / .44) ** 2
        return [x, y, .491 - .07 * (Math.abs(x) / .44) ** 5 - .035 * (1 - v) ** 3]
    }
    for (let row = 0; row < 6; row++) for (let col = 0; col < 24; col++) {
        if (row > 3 && col > 7 && col < 16) continue
        const a = point(col / 24, row / 6), b = point((col + 1) / 24, row / 6), c = point((col + 1) / 24, (row + 1) / 6), d = point(col / 24, (row + 1) / 6)
        positions.push(...a, ...b, ...c, ...a, ...c, ...d)
    }
    const jaw = new THREE.BufferGeometry(); jaw.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); jaw.computeVertexNormals(); kit.geometries.push(jaw)
    part(jaw, [0, 0, 0], [1, 1, 1], beard)
    for (const side of [-1, 1]) {
        const moustache = part(kit.rounded, [side * .075, -.165, .51], [.15, .035, .035], beard); moustache.rotation.z = side * -.10
        const curve = new THREE.EllipseCurve(0, 0, .19, .225, 0, Math.PI * 2, false, 0)
        const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(32).map(value => new THREE.Vector3(value.x, value.y, 0)), true), 32, .014, 6, true)
        kit.geometries.push(rim); part(rim, [side * .245, .015, .535], [1, 1, 1], glasses)
        part(kit.rounded, [side * .46, .025, .31], [.03, .03, .48], glasses)
    }
    part(kit.rounded, [0, .03, .543], [.115, .027, .026], glasses)
    return socket
}

/** Add a selective garment attribute. Authored UVs, map, face and source topology are unchanged. */
export function applyIvanOutfit(mesh: THREE.SkinnedMesh, material: THREE.MeshToonMaterial) {
    const geometry = mesh.geometry.clone(), count = geometry.attributes.position!.count, values = new Float32Array(count * 4)
    const position = new THREE.Vector3(), color = new THREE.Color(), skin = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight')
    let changed = false
    for (let i = 0; i < count; i++) {
        let bodyWeight = 0
        for (let axis = 0; axis < 4; axis++) if (mesh.skeleton.bones[skin.getComponent(i, axis)]?.name === 'Body') bodyWeight += weights.getComponent(i, axis)
        if (bodyWeight < .8) continue
        mesh.getVertexPosition(i, position).applyMatrix4(mesh.matrixWorld)
        const stripe = Math.floor((position.x + .36) / .14) % 2 === 0
        color.setHex(stripe ? 0x7db6d9 : 0xf6f3e7)
        values.set([color.r, color.g, color.b, 1], i * 4); changed = true
    }
    if (!changed) { geometry.dispose(); return undefined }
    geometry.setAttribute('cutesAccent', new THREE.BufferAttribute(values, 4)); mesh.geometry = geometry
    material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 cutesAccent;\nvarying vec4 vCutesAccent;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCutesAccent=cutesAccent;')
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vCutesAccent;').replace('#include <map_fragment>', '#include <map_fragment>\nfloat clothGradient=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),.55,1.);\ndiffuseColor.rgb=mix(diffuseColor.rgb,vCutesAccent.rgb*mix(.82,1.,clothGradient),vCutesAccent.a);')
    }
    material.customProgramCacheKey = () => 'cutes-ivan-cloth-v1'
    return geometry
}
