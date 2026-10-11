import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { surfaceFrame, surfacePoint } from './planet.ts'
import { celStyle } from './render-style.ts'

const defaultPalette = { blue: 0x275e90, navy: 0x273a36, cream: 0xf3eed6, sand: 0xd8c7a3, grass: 0x9eaf70, green: 0x628b66, mint: 0xb7cf8d, coral: 0xde8369, wood: 0x936e4b, gold: 0xe8bc59, pale: 0xbec6ad, skin: 0xd8ac8b, hair: 0x303b3d, red: 0xb93d40, violet: 0x66528b }
export type ArtColor = keyof typeof defaultPalette
export function createArtKit(scene: THREE.Scene, options: { palette?: Partial<Record<ArtColor, number>>; bands?: readonly number[]; shading?: 'toon' | 'soft' } = {}) {
    const palette = { ...defaultPalette, ...options.palette }

    type Color = keyof typeof palette
    const shading=options.shading ?? 'toon'
    const coloredMaterial=(vertexColors=false)=>shading==='soft'?new THREE.MeshStandardMaterial({vertexColors,roughness:.76,metalness:0}):new THREE.MeshToonMaterial({vertexColors,gradientMap:ramp})
    const ramp = new THREE.DataTexture(new Uint8Array(options.bands ?? celStyle.bands), 4, 1, THREE.RedFormat)
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true
    const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, shading==='soft'?new THREE.MeshStandardMaterial({color,roughness:.76,metalness:0}):new THREE.MeshToonMaterial({ color, gradientMap: ramp })])) as Record<Color, THREE.MeshToonMaterial | THREE.MeshStandardMaterial>
    const box = new THREE.BoxGeometry(1, 1, 1), rounded = new RoundedBoxGeometry(1, 1, 1, 2, .12), cylinder = new THREE.CylinderGeometry(1, 1, 1, 12)
    const sphere = new THREE.SphereGeometry(1, shading==='soft'?24:12, shading==='soft'?16:8), leaf = new THREE.SphereGeometry(1, 7, 5), cone = new THREE.ConeGeometry(1, 1, 8), torus = new THREE.TorusGeometry(1, .12, 6, 24)
    const geometries: THREE.BufferGeometry[] = [box, rounded, cylinder, sphere, leaf, cone, torus]
    const instances: THREE.InstancedMesh[] = []
    const extras: THREE.Material[] = [], staticMeshes: THREE.Mesh[] = []
    const occluders: { meshes: THREE.Mesh[]; materials: THREE.Material[] }[] = []
    const outline = new THREE.LineBasicMaterial({ color: palette.navy, transparent: true, opacity: .95 }); extras.push(outline)
    const basis = new THREE.Matrix4(), east = new THREE.Vector3(), normal = new THREE.Vector3(), south = new THREE.Vector3()
    function surface(x: number, z: number, height = 0) {
        const group = new THREE.Group(), frame = surfaceFrame({ x, z }), point = surfacePoint({ x, z }, height)
        group.position.set(point.x, point.y, point.z); east.set(frame.east.x, frame.east.y, frame.east.z); normal.set(frame.normal.x, frame.normal.y, frame.normal.z); south.set(frame.south.x, frame.south.y, frame.south.z)
        basis.makeBasis(east, normal, south); group.quaternion.setFromRotationMatrix(basis); scene.add(group); return group
    }
    function mesh(geometry: THREE.BufferGeometry, color: Color, position: [number, number, number], scale: [number, number, number], parent: THREE.Object3D = scene, dynamic = false, ink = true) {
        const value = new THREE.Mesh(geometry, materials[color]); value.position.set(...position); value.scale.set(...scale); value.castShadow = value.receiveShadow = true; value.userData.ink = ink; parent.add(value)
        if (!dynamic) staticMeshes.push(value)
        return value
    }
    // Merge static vertex colors into one mesh, and authored edges into one ink draw.
    function batch(parts: THREE.Mesh[], fade = false) {
        scene.updateMatrixWorld(true)
        const triangles: THREE.BufferGeometry[] = [], lines: THREE.BufferGeometry[] = []
        for (const part of parts) {
            const material = part.material as THREE.MeshToonMaterial, geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone()
            geometry.deleteAttribute('uv'); geometry.applyMatrix4(part.matrixWorld)
            const colors = new Float32Array(geometry.getAttribute('position').count * 3)
            for (let i = 0; i < colors.length; i += 3) { colors[i] = material.color.r; colors[i + 1] = material.color.g; colors[i + 2] = material.color.b }
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); triangles.push(geometry)
            if (part.userData.ink) { const edge = new THREE.EdgesGeometry(part.geometry, 28); edge.applyMatrix4(part.matrixWorld); if (edge.getAttribute('position').count) lines.push(edge); else edge.dispose() }
            part.removeFromParent()
        }
        const result = { meshes: [] as THREE.Mesh[], materials: [] as (THREE.MeshToonMaterial | THREE.MeshStandardMaterial | THREE.LineBasicMaterial)[] }
        if (triangles.length) {
            const geometry = mergeGeometries(triangles)!, material = coloredMaterial(true)
            material.transparent=fade;material.side=THREE.DoubleSide;triangles.forEach(value => value.dispose()); geometries.push(geometry); extras.push(material)
            if (fade) result.materials.push(material)
            const value = new THREE.Mesh(geometry, material); value.castShadow = value.receiveShadow = true; scene.add(value); result.meshes.push(value)
        }
        if (lines.length) {
            const geometry = mergeGeometries(lines)!, material = fade ? outline.clone() : outline
            lines.forEach(value => value.dispose()); geometries.push(geometry); scene.add(new THREE.LineSegments(geometry, material))
            if (fade) { extras.push(material); result.materials.push(material) }
        }
        if (fade) occluders.push(result)
        return result
    }
    return { scene, palette, ramp, shading, coloredMaterial, materials, box, rounded, cylinder, sphere, leaf, cone, torus, geometries, instances, extras, staticMeshes, occluders, surface, mesh, batch,
        dispose() { instances.forEach(value => value.dispose()); geometries.forEach(value => value.dispose()); Object.values(materials).forEach(value => value.dispose()); extras.forEach(value => value.dispose()); ramp.dispose() },
    }
}
export type ArtKit = ReturnType<typeof createArtKit>
