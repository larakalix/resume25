import * as THREE from 'three'
import { PLANET_RADIUS, surfaceFrame, surfacePoint } from './planet'
import { bridge, groundHeight, isWater, lakes, nearPath, river, riverX } from './terrain'
import { villagePaths, worldTargets } from './world-data'
import { housePositions, treePositions } from './village-layout'
import type { ArtKit } from './art-kit'
import type { createNatureArt } from './nature-art'

export function createLandscape(kit: ArtKit, nature?: ReturnType<typeof createNatureArt>) {
    const { scene, geometries, extras, instances, ramp, palette, materials, mesh, surface, box, cylinder, sphere } = kit
    const globeGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 112, 72), positions = globeGeometry.getAttribute('position'), colors: number[] = []
    const green = new THREE.Color(palette.grass), sand = new THREE.Color(palette.sand), pale = new THREE.Color(palette.pale)
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) / PLANET_RADIUS, y = positions.getY(i) / PLANET_RADIUS, z = positions.getZ(i) / PLANET_RADIUS
        const field = Math.sin(x * 8 + z * 3) + Math.cos(z * 9 - y * 4) + Math.sin(x * 37 + y * 26) * Math.cos(z * 41 + x * 8) * .22
        const color = green.clone().lerp(field < -1.35 ? sand : pale, field < -1.35 ? .3 : .06 + Math.max(0, field) * .045); colors.push(color.r, color.g, color.b)
    }
    globeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometries.push(globeGeometry)
    const ground = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp }); extras.push(ground)
    const globe = new THREE.Mesh(globeGeometry, ground); globe.receiveShadow = true; scene.add(globe)
    function grid(rows: number, columns: number, at: (row: number, column: number) => { x: number; y: number; z: number }, reverse = false) {
        const vertices: number[] = [], indices: number[] = []
        for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) { const p = at(row / rows, col / columns); vertices.push(p.x, p.y, p.z) }
        for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) { const a = row * (columns + 1) + col, b = a + columns + 1; indices.push(...(reverse ? [a, a + 1, b, a + 1, b + 1, b] : [a, b, a + 1, a + 1, b, b + 1])) }
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometries.push(geometry); return geometry
    }
    const waterTime = { value: 0 }, waterColor = { value: new THREE.Color('#58b5c1') }
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: waterTime, uColor: waterColor },
        vertexShader: 'varying vec3 vWorld; void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'uniform float uTime;uniform vec3 uColor;varying vec3 vWorld;void main(){float wave=sin(vWorld.x*3.+vWorld.z*2.-uTime*1.8)*sin(vWorld.z*4.+uTime*.7);float glint=pow(max(0.,sin(vWorld.x*6.+vWorld.z*3.-uTime)),20.)*.045;float ribbon=smoothstep(.96,1.,sin(vWorld.x*2.8+vWorld.z*.75-uTime*.45))*smoothstep(.4,.9,sin(vWorld.z*2.3+uTime*.2));gl_FragColor=vec4(uColor+wave*.012+glint+ribbon*.045,1.);\n#include <colorspace_fragment>\n}',
        side: THREE.DoubleSide,
    }); extras.push(waterMaterial)
    function waterMesh(geometry: THREE.BufferGeometry, shore = false) { const value = new THREE.Mesh(geometry, shore ? materials.sand : waterMaterial); value.receiveShadow = shore; scene.add(value) }
    for (const shore of [true, false]) {
        const width = river.halfWidth + (shore ? .65 : 0)
        waterMesh(grid(160, 10, (r, c) => { const z = river.from + (river.to - river.from) * r; return surfacePoint({ x: riverX(z) + (c * 2 - 1) * width, z }, shore ? .028 : .085) }), shore)
        for (const lake of lakes) waterMesh(grid(14, 96, (r, c) => surfacePoint({ x: lake.x + Math.cos(c * Math.PI * 2) * (lake.radius + (shore ? .6 : 0)) * r, z: lake.z + Math.sin(c * Math.PI * 2) * (lake.radius + (shore ? .6 : 0)) * r }, shore ? .03 : .09), true), shore)
    }
    function road(points: { x: number; z: number }[], width = 1.65) {
        const vertices: number[] = [], indices: number[] = []
        points.forEach((point, index) => {
            const next = points[Math.min(points.length - 1, index + 1)]!, prev = points[Math.max(0, index - 1)]!, dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1
            for (const side of [-1, 1]) { const p = surfacePoint({ x: point.x - dz / length * width * side / 2, z: point.z + dx / length * width * side / 2 }, .04); vertices.push(p.x, p.y, p.z) }
            if (index < points.length - 1) { const a = index * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
        })
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometries.push(geometry)
        mesh(geometry, 'cream', [0, 0, 0], [1, 1, 1], scene, false, false)
    }
    villagePaths.forEach(path => {
        const points = path.flatMap((point, index) => { const next = path[index + 1]; return next ? Array.from({ length: 32 }, (_, i) => ({ x: point.x + (next.x - point.x) * i / 32, z: point.z + (next.z - point.z) * i / 32 })) : [point] }); road(points)
    })
    road(Array.from({ length: 241 }, (_, i) => ({ x: -Math.PI * PLANET_RADIUS + i / 240 * Math.PI * PLANET_RADIUS * 2, z: -32 })))
    // Each plank and railing follows the sphere and the walkable deck's same arch profile.
    for (let i = 0; i < 22; i++) {
        const x = bridge.x - bridge.halfLength + i / 21 * bridge.halfLength * 2, root = surface(x, bridge.z), height = groundHeight({ x, z: bridge.z })
        mesh(box, i % 4 ? 'wood' : 'sand', [0, height - .07, 0], [.5, .14, 2.9], root)
    }
    const bridgeLamps: THREE.Matrix4[] = []
    for (const side of [-1, 1]) {
        const railPoints: THREE.Vector3[] = []
        for (let i = 0; i <= 20; i++) { const x = bridge.x - bridge.halfLength + i / 20 * bridge.halfLength * 2, p = surfacePoint({ x, z: bridge.z + side * 1.5 }, groundHeight({ x, z: bridge.z }) + 1.1); railPoints.push(new THREE.Vector3(p.x, p.y, p.z)) }
        const rail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints), 40, .055, 5, false); geometries.push(rail); mesh(rail, 'wood', [0, 0, 0], [1, 1, 1], scene, false, false)
        for (let i = 0; i < 5; i++) {
            const x = bridge.x - bridge.halfLength + i / 4 * bridge.halfLength * 2, root = surface(x, bridge.z + side * 1.5), height = groundHeight({ x, z: bridge.z })
            mesh(cylinder, 'wood', [0, height + .55, 0], [.075, 1.1, .075], root)
            const bulb = mesh(sphere, 'gold', [0, height + 1.2, 0], [.16, .2, .16], root)
            scene.updateMatrixWorld(true); bridgeLamps.push(bulb.matrixWorld.clone())
        }
    }
    const blade = new THREE.BufferGeometry()
    blade.setAttribute('position', new THREE.Float32BufferAttribute([-.08,0,0,.015,0,0,-.07,.23,.018, .015,0,0,-.07,.23,.018,-.13,.38,.03, -.025,0,-.04,.045,0,.035,.04,.3,.02, .045,0,.035,.04,.3,.02,.1,.45,.03, -.02,0,.02,.035,0,-.04,-.015,.28,-.065], 3)); blade.computeVertexNormals(); geometries.push(blade)
    const grassTime = { value: 0 }, grassMaterial = new THREE.MeshToonMaterial({ gradientMap: ramp, side: THREE.DoubleSide })
    grassMaterial.onBeforeCompile = shader => { shader.uniforms.uGrassTime = grassTime; shader.vertexShader = 'uniform float uGrassTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(uGrassTime*1.4+instanceMatrix[3].x*.7+instanceMatrix[3].z*.5)*position.y*position.y*.24;') }
    grassMaterial.customProgramCacheKey = () => 'village-grass-1'; extras.push(grassMaterial)
    const points: { x: number; z: number; seed: number }[] = []
    for (let i = 0; i < 4400; i++) {
        const point = { x: (i * 37.173 % (Math.PI * PLANET_RADIUS * 2)) - Math.PI * PLANET_RADIUS, z: Math.sin(i * 2.39996) * 36, seed: i }
        if (!isWater(point, .8) && !nearPath(point, 1.3) && !worldTargets.some(target => Math.hypot(point.x - target.x, point.z - target.z) < 2.6) && !housePositions.some(house => Math.hypot(point.x - house.x, point.z - house.z) < 2.5)) points.push(point)
    }
    const grass = new THREE.InstancedMesh(blade, grassMaterial, points.length), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), basis = new THREE.Matrix4(), color = new THREE.Color()
    points.forEach((point, i) => {
        const frame = surfaceFrame(point), p = surfacePoint(point, .015)
        basis.makeBasis(new THREE.Vector3(frame.east.x, frame.east.y, frame.east.z), new THREE.Vector3(frame.normal.x, frame.normal.y, frame.normal.z), new THREE.Vector3(frame.south.x, frame.south.y, frame.south.z)); rotation.setFromRotationMatrix(basis).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), point.seed))
        matrix.compose(new THREE.Vector3(p.x,p.y,p.z), rotation, new THREE.Vector3(1, .65 + (point.seed % 5) * .15, 1)); grass.setMatrixAt(i,matrix); color.set(point.seed % 3 ? palette.green : palette.grass); grass.setColorAt(i,color)
    })
    grass.receiveShadow = true; scene.add(grass); instances.push(grass)
    treePositions.forEach((point,index) => {
        if(nature){nature.tree(point,index);return}
        const root = surface(point.x,point.z), height = 2.7 + index % 3 * .55
        mesh(cylinder,'wood',[0,height/2,0],[.16,height,.16],root)
        const crowns: THREE.Mesh[] = [], color = index % 7 === 0 ? 'coral' : index % 3 ? 'green' : 'mint'
        for(let i=0;i<3;i++) crowns.push(mesh(kit.leaf,color,[Math.sin(i*2.1)*.5,height+i*.3,Math.cos(i*2.1)*.4],[1.15,1.45,1.1],root,true,false))
        kit.batch(crowns,true)
    })
    return { waterTime, waterColor, grassTime, bridgeLamps }
}
