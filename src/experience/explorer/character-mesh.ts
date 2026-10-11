import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ArtKit } from './art-kit'

/** One colored mesh and one ink hull per articulated group, rather than per detail. */
export function mergeCharacterParts(kit: ArtKit, parts: THREE.Mesh[], parent: THREE.Object3D) {
    if (!parts.length) return
    parent.updateWorldMatrix(true, true)
    const inverse = parent.matrixWorld.clone().invert()
    const pieces = parts.map(part => {
        const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone()
        geometry.deleteAttribute('uv'); geometry.applyMatrix4(inverse.clone().multiply(part.matrixWorld))
        const color = (part.material as THREE.MeshToonMaterial).color, values = new Float32Array(geometry.getAttribute('position').count * 3)
        for (let i = 0; i < values.length; i += 3) { values[i] = color.r; values[i + 1] = color.g; values[i + 2] = color.b }
        geometry.setAttribute('color', new THREE.BufferAttribute(values, 3)); part.removeFromParent(); return geometry
    })
    const geometry = mergeGeometries(pieces)!
    pieces.forEach(piece => piece.dispose()); kit.geometries.push(geometry)
    const material = kit.coloredMaterial(true)
    kit.extras.push(material)
    const body = new THREE.Mesh(geometry, material)
    body.castShadow = body.receiveShadow = true; parent.add(body)
    if(kit.shading==='toon'){
        const ink=new THREE.MeshBasicMaterial({color:kit.palette.navy,side:THREE.BackSide}),hull=new THREE.Mesh(geometry,ink)
        kit.extras.push(ink);hull.scale.setScalar(1.018);parent.add(hull)
    }
}
