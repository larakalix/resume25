import * as THREE from 'three'
import type { GlobeArtist } from '../globe/art-kit.ts'
import type { ModelLibrary } from '../globe/model-library.ts'
import { buildBuildingSign } from '../globe/building-signs.ts'
import { buildIvanHomeExterior } from '../globe/home-exterior.ts'
import type { WeatherState } from '../globe/weather.ts'
import type { CompiledWorld } from './compile.ts'
import type { CompiledBuilding, CompiledRoad, RoadPoint, MapPoint } from './types.ts'
import type { KayKitLibrary } from './kaykit-assets.ts'
import type {JapanesePropsLibrary} from './japanese-props.ts'
import {buildArchipelagoCliffs} from './cliffs.ts'
import type {DistrictAssets} from './district-assets.ts'

/** Exact compiled widths/heights become radial ribbon geometry, including the dateline crossing. */
export function archipelagoRoadGeometry(world: CompiledWorld, road: CompiledRoad, across: [number, number] = [-road.width / 2, road.width / 2], lift = 0, bottom?: (t: number) => number) {
    const vertices: number[] = [], indices: number[] = [], rows = road.points.length, tangent = new THREE.Vector3(), normal = new THREE.Vector3(), lateral = new THREE.Vector3()
    const point = (value: RoadPoint, side: number, height: number, direction: THREE.Vector3) => {
        const n = world.normalAt(value.x, value.z), angle = side / world.RADIUS
        normal.set(n.x, n.y, n.z).multiplyScalar(Math.cos(angle)).addScaledVector(direction, Math.sin(angle))
        return normal.multiplyScalar(world.RADIUS + height).toArray()
    }
    for (let i = 0; i < rows; i++) {
        const at = road.points[i]!
        let first = Math.max(0, i - 1), last = Math.min(rows - 1, i + 1)
        while (first > 0 && world.distance(road.points[first]!, at) < .00001) first--
        while (last < rows - 1 && world.distance(road.points[last]!, at) < .00001) last++
        const before = world.normalAt(road.points[first]!.x, road.points[first]!.z), after = world.normalAt(road.points[last]!.x, road.points[last]!.z), n = world.normalAt(at.x, at.z)
        tangent.set(after.x - before.x, after.y - before.y, after.z - before.z); normal.set(n.x, n.y, n.z)
        if (tangent.lengthSq() < 1e-12) tangent.set(Math.cos(at.x / world.RADIUS), -Math.sin(at.x / world.RADIUS), 0)
        lateral.crossVectors(normal, tangent).normalize()
        const high = at.height + lift, low = high - (bottom ? bottom(i / Math.max(1, rows - 1)) : .055)
        for (const [side, height] of [[across[0], high], [across[1], high], [across[1], low], [across[0], low]]) vertices.push(...point(at, side!, height!, lateral))
        if (i) {
            const a = (i - 1) * 4, b = i * 4
            for (let face = 0; face < 4; face++) { const next = (face + 1) % 4; indices.push(a + face, b + face, a + next, a + next, b + face, b + next) }
        }
    }
    const end = (rows - 1) * 4
    indices.push(0, 1, 2, 0, 2, 3, end, end + 2, end + 1, end, end + 3, end + 2)
    // Sharp authored junctions can reverse a small inner-corner triangle. Its visible face still
    // points away from the globe rather than disappearing when approached from above.
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3()
    for (let row = 0; row < rows - 1; row++) for (const triangle of [row * 24, row * 24 + 3]) {
        va.fromArray(vertices, indices[triangle]! * 3); vb.fromArray(vertices, indices[triangle + 1]! * 3); vc.fromArray(vertices, indices[triangle + 2]! * 3)
        if (vb.sub(va).cross(vc.sub(va)).dot(va) < 0) [indices[triangle + 1], indices[triangle + 2]] = [indices[triangle + 2]!, indices[triangle + 1]!]
    }
    const geometry = new THREE.BufferGeometry(); geometry.name = `compiled-road-${road.id}`; geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere()
    return geometry
}

/** Outdoor composition uses this world contract only; no legacy geography or layout is consulted. */
export function buildArchipelagoArt(a: GlobeArtist, world: CompiledWorld, cityModels: ModelLibrary, kaykit: KayKitLibrary, japaneseProps?:JapanesePropsLibrary) {
    const { kit } = a, windows: THREE.Mesh[] = [], nightMaterials: THREE.MeshStandardMaterial[] = [], pennants: THREE.Object3D[] = [], buildingRoots:THREE.Group[]=[]
    const staged=cityModels as ModelLibrary&Partial<Pick<DistrictAssets,'watch'>>
    const ownMaterial = (hex: number, roughness = .96) => { const material = new THREE.MeshStandardMaterial({ color: hex, roughness }); kit.extras.push(material); return material }
    const pavement = ownMaterial(0xd7d4bc), sand = ownMaterial(0xd8c296), oak = ownMaterial(0xb68a5b), ivory = ownMaterial(0xf1f0df), stoneEdge = ownMaterial(0xd9e2d7), mortar = ownMaterial(0xb5c5ba)
    const roadMesh = (geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, name: string) => {
        kit.geometries.push(geometry)
        const mesh = a.mesh(geometry, 'cream', [0, 0, 0], [1, 1, 1], a.scene); mesh.material = material; mesh.name = name; mesh.userData.compiledSurface = true
        return mesh
    }
    const worldPosition = (point: MapPoint, height: number) => { const n = world.normalAt(point.x, point.z); return new THREE.Vector3(n.x, n.y, n.z).multiplyScalar(world.RADIUS + height) }
    function routeRoot(road: CompiledRoad, index: number, side = 0, height = 0) {
        const point = road.points[index]!, before = road.points[Math.max(0, index - 1)]!, after = road.points[Math.min(road.points.length - 1, index + 1)]!, n = world.normalAt(point.x, point.z)
        const direction = worldPosition(after, 0).sub(worldPosition(before, 0)).normalize(), across = new THREE.Vector3().crossVectors(new THREE.Vector3(n.x, n.y, n.z), direction).normalize(), angle = side / world.RADIUS
        const normal = new THREE.Vector3(n.x, n.y, n.z).multiplyScalar(Math.cos(angle)).addScaledVector(across, Math.sin(angle)), position = world.mapAt(normal)
        const group = a.root(position.x, position.z, height, point.height)
        // Local +Z follows the route; every post stands on the same radial deck as collision.
        group.updateWorldMatrix(true, false)
        group.rotateY(Math.atan2(direction.dot(new THREE.Vector3().setFromMatrixColumn(group.matrixWorld, 0)), direction.dot(new THREE.Vector3().setFromMatrixColumn(group.matrixWorld, 2))))
        return group
    }
    function native(name: string, root: THREE.Object3D, scale: number) {
        const object = kaykit.get(name), meshes: THREE.Mesh[] = []
        object.scale.multiplyScalar(scale); root.add(object)
        object.traverse(child => {
            if (!(child instanceof THREE.Mesh)) return
            child.geometry = child.geometry.clone(); kit.geometries.push(child.geometry)
            const materials = (Array.isArray(child.material) ? child.material : [child.material]).map(source => {
                const material = source.clone() as THREE.MeshStandardMaterial
                material.roughness = .94; material.metalness = 0; kit.extras.push(material); nightMaterials.push(material)
                return material
            })
            child.material = Array.isArray(child.material) ? materials : materials[0]!
            child.castShadow = child.receiveShadow = true; child.userData.sourceAsset = name; meshes.push(child)
        })
        return { object, meshes }
    }
    function foundation(building: CompiledBuilding, root: THREE.Group) {
        root.updateWorldMatrix(true, false)
        const ring: [number, number][] = [], count = 20, vertices: number[] = [], indices: number[] = [], radius = root.position.length(), sample = new THREE.Vector3()
        for (let side = 0; side < 4; side++) for (let step = 0; step < 5; step++) { const t = step / 5, w = building.width / 2, d = building.depth / 2; ring.push(side === 0 ? [-w + t * w * 2, -d] : side === 1 ? [w, -d + t * d * 2] : side === 2 ? [w - t * w * 2, d] : [-w, d - t * d * 2]) }
        for (const [x, z] of ring) vertices.push(x, .035, z)
        for (const [x, z] of ring) {
            let level = 0
            for (let i = 0; i < 4; i++) { sample.set(x, level, z).applyMatrix4(root.matrixWorld); const ground = world.RADIUS + world.heightAt(world.mapAt(sample)); level = Math.sqrt(Math.max(0, ground * ground - x * x - z * z)) - radius }
            vertices.push(x, Math.min(.01, level - .08), z)
        }
        vertices.push(0, .035, 0)
        for (let i = 0; i < count; i++) { const next = (i + 1) % count; indices.push(count * 2, next, i, i, next, i + count, next, next + count, i + count) }
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); kit.geometries.push(geometry)
        a.mesh(geometry, 'sand', [0, 0, 0], [1, 1, 1], root).name = `foundation-${building.id}`
    }
    function buildingSign(building: CompiledBuilding, root: THREE.Group, meshes: THREE.Mesh[]) {
        const side = building.modelFront === 'east' ? 1 : building.modelFront === 'west' ? -1 : 0, span = side ? building.depth : building.width
        const y = Math.min(3.1, building.height * .61), width = Math.min(2.55, span * .64), sample = new THREE.Vector3()
        let mount = (side ? building.width : building.depth) / 2
        root.updateWorldMatrix(true, true)
        // Mount once against real facade vertices, rather than placing a second sign in front of it.
        for (const mesh of meshes) {
            const p = mesh.geometry.getAttribute('position'), matrix = root.matrixWorld.clone().invert().multiply(mesh.matrixWorld)
            for (let i = 0; i < p.count; i++) { sample.fromBufferAttribute(p, i).applyMatrix4(matrix); const across = side ? sample.z : sample.x; if (Math.abs(across) < width / 2 + .08 && Math.abs(sample.y - y) < .40) mount = Math.max(mount, side ? sample.x * side : sample.z) }
        }
        const plaque = buildBuildingSign(a, building.name, { position: side ? [side * (mount + .10), y, 0] : [0, y, mount + .10], width, theme: building.enter ? 'navy' : 'cream' }, root)
        plaque.rotation.y = side * Math.PI / 2
        plaque.name = `sign-${building.id}`
    }
    for (const building of world.buildings) {
        const root = a.root(building.x, building.z), meshes: THREE.Mesh[] = []
        root.name = `archipelago-building-${building.id}`; root.rotateY(building.yaw); root.userData.buildingId = building.id;root.userData.district=building.area;buildingRoots.push(root)
        if (building.assetId.startsWith('kay-')) {
            const source = kaykit.spec(building.assetId)
            if (!source) throw new Error(`Unknown native harbor building ${building.assetId}`)
            meshes.push(...native(building.assetId, root, building.width / source.width).meshes)
        } else {
            const geometry = cityModels.get(building.assetId).clone(), material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .97, flatShading: true, side: THREE.DoubleSide })
            kit.geometries.push(geometry); kit.extras.push(material); nightMaterials.push(material)
            const mesh = a.mesh(geometry, 'cream', [0, 0, 0], [building.width, building.width, building.width], root, true); mesh.material = material; mesh.name = building.assetId; mesh.userData.sourceAsset = building.assetId; meshes.push(mesh)
            staged.watch?.(building.assetId,mesh,kit)
        }
        // Rear elevations face the sea approach too: add quiet complementary windows,
        // while retaining every vertex and UV of the native building underneath.
        if (building.assetId.startsWith('kay-')) {
            root.updateWorldMatrix(true,true)
            let rear=Infinity
            const inverse=root.matrixWorld.clone().invert(),sample=new THREE.Vector3()
            for(const part of meshes){const position=part.geometry.getAttribute('position'),matrix=inverse.clone().multiply(part.matrixWorld);for(let i=0;i<position.count;i++){sample.fromBufferAttribute(position,i).applyMatrix4(matrix);if(sample.y>.3&&sample.y<building.height*.72)rear=Math.min(rear,sample.z)}}
            const glass:number[]=[],index:number[]=[],floors=Math.max(2,Math.round(building.height/1.65))
            for(let floor=0;floor<floors;floor++)for(const side of [-1,1]){
                const x=side*building.width*.23,y=.85+floor*(building.height-.8)/floors,w=Math.min(.68,building.width*.16),h=.78
                a.block('cream',[x,y,rear-.035],[w+.18,h+.18,.12],root)
                a.block('navy',[x,y,rear-.105],[w,h,.025],root)
                a.block('cream',[x,y-.49,rear-.09],[w+.24,.10,.27],root)
                const base=glass.length/3;glass.push(x-w/2,y-h/2,rear-.121,x+w/2,y-h/2,rear-.121,x+w/2,y+h/2,rear-.121,x-w/2,y+h/2,rear-.121);index.push(base,base+2,base+1,base,base+3,base+2)
            }
            const panes=new THREE.BufferGeometry();panes.setAttribute('position',new THREE.Float32BufferAttribute(glass,3));panes.setIndex(index);panes.computeVertexNormals();kit.geometries.push(panes)
            const light=a.mesh(panes,'gold',[0,0,0],[1,1,1],root,true);light.visible=false;windows.push(light)
        }
        foundation(building, root)
        buildingSign(building, root, meshes)
        if (building.enter === 'home') buildIvanHomeExterior(a, building, root)
        // Modest facade planters remain inside the existing collision footprint.
        if (building.style !== 'japanese') for (const side of [-1, 1]) {
            const x = side * (building.width * .37), z = building.depth / 2 - .13
            a.mesh(kit.cylinder, 'coral', [x, .23, z], [.22, .46, .22], root)
            a.mesh(kit.leaf, 'green', [x, .64, z], [.25, .40, .22], root)
        }
        a.fadeable(building.id, root, meshes)
        // Fade batching produces world-space meshes. Preserve their transforms while parenting
        // them to the lot so horizon culling hides the complete facade, planter and foundation.
        const fadeGroup=a.occlusionGroups.at(-1)!
        for(const visual of fadeGroup.visuals??[])if(visual.parent===a.scene)root.attach(visual)
    }
    for (const road of world.roads) {
        if (road.points.length < 2) continue
        const bridge = road.kind === 'bridge', wood = road.surface === 'wood', raised = bridge || road.kind === 'dock'
        roadMesh(archipelagoRoadGeometry(world, road, undefined, 0, bridge ? t => .28 + .68 * (1 - Math.sin(t * Math.PI)) : () => raised ? .20 : .045), bridge && !wood ? ivory : wood ? oak : road.surface === 'sand' ? sand : pavement, `surface-${road.id}`)
        if (road.surface === 'stone' && !bridge && road.kind !== 'trail') {
            for (const side of [-1, 1]) { const edge = side * road.width / 2; roadMesh(archipelagoRoadGeometry(world, road, [edge - .10, edge + .10], .025), stoneEdge, `curb-${road.id}-${side}`) }
        }
        if (!raised) continue
        for (const side of [-1, 1]) {
            const edge = side * (road.width / 2 - .13)
            if (!wood) {
                roadMesh(archipelagoRoadGeometry(world, road, [edge - .10, edge + .10], .66, () => .66), mortar, `parapet-${road.id}-${side}`)
                roadMesh(archipelagoRoadGeometry(world, road, [edge - .15, edge + .15], .74, () => .12), ivory, `stone-cap-${road.id}-${side}`)
            }
            const step = Math.max(1, Math.round(3.0 / (road.length / Math.max(1, road.points.length - 1))))
            let previous: THREE.Vector3 | undefined
            for (let i = 0; i < road.points.length; i++) {
                if (i % step && i !== road.points.length - 1) continue
                const post = routeRoot(road, i, edge)
                post.name = `${wood ? 'wood' : 'stone'}-post-${road.id}`
                if (wood) {
                    a.block('wood', [0, .50, 0], [.15, 1.0, .15], post)
                    a.mesh(kit.sphere, 'gold', [0, 1.04, 0], [.10, .10, .10], post)
                    const position = new THREE.Vector3(0, .84, 0).applyMatrix4(post.matrixWorld)
                    if (previous) a.beam(previous, position, .045, 'wood')
                    previous = position
                } else {
                    a.block('cream', [0, .43, 0], [.34, .86, .34], post)
                    a.block('cream', [0, .91, 0], [.43, .13, .43], post)
                }
            }
        }
        if (wood) {
            // Fine transverse joints read as planks while the single exact deck remains gap-free.
            const spacing = Math.max(1, Math.round(.65 / (road.length / Math.max(1, road.points.length - 1))))
            for (let i = 1; i < road.points.length - 1; i += spacing) { const joint = routeRoot(road, i, 0, .007); a.block('wood', [0, 0, 0], [road.width - .1, .012, .018], joint) }
        }
    }
    function pot(root: THREE.Object3D, x: number, z: number, color: 'coral' | 'blue' | 'gold' = 'coral') {
        a.mesh(kit.cylinder, color, [x, .24, z], [.23, .48, .23], root)
        for (let i = 0; i < 4; i++) { const leaf = a.mesh(kit.leaf, i % 2 ? 'mint' : 'green', [x + Math.sin(i * 2.4) * .10, .65, z + Math.cos(i * 2.4) * .09], [.12, .40, .08], root); leaf.rotation.z = Math.sin(i * 2.4) * .35 }
    }
    const placements = new Map(world.definition.placements.map(placement => [placement.id, placement]))
    const placementRoot = (id: string) => { const placement = placements.get(id); if (!placement) return undefined; const point = world.localToMap(placement.at.frame, placement.at.x, placement.at.z),root=a.root(point.x, point.z);root.name=`placement-${id}`;root.userData.placementId=id;return root }
    const lanterns: THREE.Mesh[] = [], glow = new THREE.MeshStandardMaterial({ color: 0xffefc5, emissive: 0xffd688, emissiveIntensity: .1, roughness: .55 }); kit.extras.push(glow)
    for (const frame of ['harbor', 'komorebi-market', 'maker-heights', 'orchard-village', 'tideglass-coast']) for (const side of [-1, 1]) {
        const root=placementRoot(`${frame}-streetlight-${side<0?'west':'east'}`)
        if (!root) continue
        if (frame === 'harbor') native('kay-streetlight', root, 3.8)
        else {
            a.beam(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.7, 0), .055, 'wood', root)
            a.block('wood', [.23, 2.68, 0], [.56, .09, .09], root)
        }
        const bulb = a.mesh(kit.sphere, 'gold', [frame === 'harbor' ? .18 : .35, frame === 'harbor' ? 3.45 : 2.43, 0], [.095, .17, .095], root, true)
        bulb.material = glow; lanterns.push(bulb)
    }
    for (const frame of ['komorebi-market', 'orchard-village']) {
        const string=placementRoot(`${frame}-pennants`),supports=[-1,1].map(side=>placementRoot(`${frame}-pennant-post-${side<0?'west':'east'}`))
        if(!string||supports.some(support=>!support))continue
        string.updateWorldMatrix(true,false)
        const ends=supports.map(support=>{a.beam(new THREE.Vector3(0,0,0),new THREE.Vector3(0,3.5,0),.045,'wood',support!);support!.updateWorldMatrix(true,false);return string.worldToLocal(support!.localToWorld(new THREE.Vector3(0,3.5,0)))})
        const middle=ends[0]!.clone().lerp(ends[1]!,.5);middle.y-=.26
        a.tube([ends[0]!.toArray(),middle.toArray(),ends[1]!.toArray()], .015, 'wood', string)
        for (let i = 0; i < 9; i++) {
            const pennant = new THREE.Group(),t=.5+(i-4)*.55/5.2; pennant.position.copy(ends[0]!).lerp(ends[1]!,t);pennant.position.y-=.26*(1-Math.abs(t*2-1)); string.add(pennant)
            const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.15, 0, 0, .15, 0, 0, 0, -.35, 0], 3)); geometry.computeVertexNormals(); kit.geometries.push(geometry)
            const material = kit.materials[i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'coral' : 'gold'].clone(); material.side = THREE.DoubleSide; kit.extras.push(material)
            const cloth = a.mesh(geometry, 'cream', [0, 0, 0], [1, 1, 1], pennant, true); cloth.material = material; pennants.push(pennant)
        }
    }
    if(japaneseProps)for(const[id,name,scale]of [['market-torii','torii_gate',1.2],['market-lantern-a','stone_lantern',.85],['market-lantern-b','stone_lantern',.85],['market-sakura','sakura_tree',1.1],['market-vending','vending_machine',1],['market-bamboo','bamboo_cluster',1],['market-lantern-string','lantern_string',1]] as const){
        const root=placementRoot(id);if(!root)continue
        const geometry=japaneseProps.get(name).clone(),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,flatShading:true})
        kit.geometries.push(geometry);kit.extras.push(material);nightMaterials.push(material)
        const mesh=a.mesh(geometry,'cream',[0,0,0],[scale,scale,scale],root,true);mesh.material=material;mesh.name=`native-japanese-${name}`;mesh.userData.sourceAsset=name
        a.fadeable(id,root,[mesh])
    }
    const cliffs=buildArchipelagoCliffs(a,world)
    // Cargo and stall positions have authored colliders, so decoration never adds invisible rules.
    for (const [i, id] of ['harbor-cargo-a', 'harbor-cargo-b', 'harbor-cargo-c'].entries()) { const cargo = placementRoot(id); if (cargo) { cargo.rotateY((i - 1) * .12); native('kay-box-a', cargo, 2.7) } }
    const stall = placementRoot('market-stall')
    if (stall) {
        for (const side of [-1, 1]) a.block('wood', [side * .9, 1.0, -.35], [.07, 2.0, .07], stall)
        a.block('wood', [0, .73, .18], [1.95, .16, .75], stall)
        for (let i = 0; i < 7; i++) { const stripe = a.block(i % 2 ? 'cream' : 'coral', [-.98 + (i + .5) * 1.96 / 7, 2.02, .10], [1.96 / 7 + .01, .07, 1.22], stall); stripe.rotation.x = .18 }
        for (let i = 0; i < 5; i++) a.mesh(kit.sphere, i % 2 ? 'gold' : 'coral', [(i - 2) * .30, .91, .18], [.13, .12, .13], stall)
        for (const side of [-1, 1]) pot(stall, side * 1.08, .12)
    }
    const fountain = placementRoot('harbor-fountain'), fountainSpray = new THREE.Group()
    if (fountain) {
        a.mesh(kit.cylinder, 'cream', [0, .20, 0], [.98, .40, .98], fountain)
        const rim = a.mesh(kit.torus, 'cream', [0, .43, 0], [.90, .90, .90], fountain); rim.rotation.x = Math.PI / 2
        a.mesh(kit.cylinder, 'pale', [0, .40, 0], [.81, .035, .81], fountain)
        a.mesh(kit.cylinder, 'cream', [0, .74, 0], [.13, .66, .13], fountain)
        a.mesh(kit.sphere, 'gold', [0, 1.10, 0], [.18, .18, .18], fountain)
        fountain.add(fountainSpray)
        for (let i = 0; i < 4; i++) { const angle = i * Math.PI / 2, x = Math.sin(angle), z = Math.cos(angle); a.tube([[x * .12, .98, z * .12], [x * .37, 1.20, z * .37], [x * .63, .43, z * .63]], .018, 'pale', fountainSpray, true) }
    }
    for (const id of ['harbor-bench', 'orchard-bench']) { const root = placementRoot(id); if (root) native('kay-bench', root, 6) }
    const mill = placementRoot('windmill'), sails = new THREE.Group()
    if (mill) {
        a.mesh(kit.cylinder, 'cream', [0, 2, 0], [1.25, 4, 1.25], mill); a.mesh(kit.cone, 'blue', [0, 4.35, 0], [1.53, 1.5, 1.53], mill)
        sails.position.set(0, 3.25, 1.34); mill.add(sails)
        for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; sails.add(arm); a.block('wood', [0, 1.03, 0], [.10, 2.3, .13], arm, true); a.block('cream', [.27, 1.4, .025], [.55, 1.3, .09], arm, true) }
        a.mesh(kit.sphere, 'gold', [0, 0, .08], [.20, .20, .12], sails, true); a.fadeable('windmill', mill)
    }
    const bellRoot = placementRoot('bell'), bell = new THREE.Group()
    if (bellRoot) {
        for (const side of [-1, 1]) a.block('wood', [side * .62, 1.1, 0], [.14, 2.2, .14], bellRoot)
        a.block('wood', [0, 2.2, 0], [1.55, .14, .20], bellRoot); bellRoot.add(bell); bell.position.y = 1.84
        a.mesh(kit.cone, 'gold', [0, -.20, 0], [.32, .43, .32], bell, true); const rim = a.mesh(kit.torus, 'gold', [0, -.40, 0], [.30, .30, .30], bell, true); rim.rotation.x = Math.PI / 2
    }
    const postbox = placementRoot('postbox')
    if (postbox) { a.block('wood', [0, .54, 0], [.13, 1.08, .13], postbox); a.block('coral', [0, 1.25, 0], [.64, .62, .48], postbox); a.block('cream', [0, 1.59, 0], [.77, .12, .62], postbox); a.block('navy', [0, 1.32, .25], [.38, .045, .02], postbox) }
    const fire = placementRoot('campfire'), flames = new THREE.Group(), fireLight = new THREE.PointLight(0xffc875, 0, 7, 2)
    if (fire) {
        for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; a.mesh(kit.leaf, 'sand', [Math.cos(angle) * .66, .11, Math.sin(angle) * .66], [.18, .14, .18], fire) }
        for (const side of [-1, 1]) a.beam(new THREE.Vector3(-.45, .13, side * .26), new THREE.Vector3(.45, .13, -side * .26), .10, 'wood', fire)
        fire.add(flames); fireLight.position.y = .8; fire.add(fireLight)
        const flameMaterial = new THREE.MeshStandardMaterial({ color: 0xffd16c, emissive: 0xff9c32, emissiveIntensity: 1.1, roughness: .9 }); kit.extras.push(flameMaterial)
        for (let i = 0; i < 3; i++) { const flame = a.mesh(kit.leaf, 'gold', [(i - 1) * .17, .43, 0], [.14, .43, .15], flames, true); flame.material = flameMaterial }
    }
    for (const id of ['crystal-cave-door', 'tide-cave-door']) {
        const cave = placementRoot(id); if (!cave) continue
        for (let i = 0; i < 7; i++) { const angle = Math.PI * i / 6, rock = a.mesh(kit.leaf, i % 2 ? 'pale' : 'sand', [Math.cos(angle) * 1.55, .45 + Math.sin(angle) * 1.55, -.55], [.67, .78, .67], cave); rock.rotation.z = -angle }
        a.block('navy', [0, .87, -.78], [1.9, 1.8, .12], cave)
        for (const side of [-1, 1]) { const crystal = a.mesh(kit.cone, id === 'tide-cave-door' ? 'pale' : 'violet', [side * 1.4, .34, .1], [.22, .70, .22], cave); crystal.rotation.z = side * -.20 }
        a.fadeable(id, cave)
    }
    let previous = 0, wind = .7, rain = 0, bellCount = 0, bellAt = -10
    return {
        windows, lanterns, cliffs, triangles:cliffs.triangles,buildingRoots,
        setWeather(state: Pick<WeatherState, 'wind' | 'rain'>) { wind = THREE.MathUtils.clamp(state.wind, 0, 2); rain = THREE.MathUtils.clamp(state.rain, 0, 1) },
        setDaylight(day: number) { glow.emissiveIntensity = .10 + (1 - THREE.MathUtils.clamp(day, 0, 1)) * 1.7; for (const material of nightMaterials) { material.emissive.setHex(0xffe4bd); material.emissiveIntensity = (1 - THREE.MathUtils.clamp(day, 0, 1)) * .045 } },
        update(time: number, reduced: boolean, objects: { windmill: boolean; bell: number; campfire: boolean }) {
            const dt = Math.max(0, Math.min(.1, time - previous)); previous = time
            if (objects.bell !== bellCount) { bellCount = objects.bell; bellAt = time }
            if (!reduced && objects.windmill) sails.rotation.z += dt * .62 * wind
            bell.rotation.x = reduced ? 0 : Math.sin(time * 14) * Math.max(0, 1 - (time - bellAt) * 1.5) * .38
            flames.visible = objects.campfire; fireLight.intensity = objects.campfire ? 6 * (1 - rain * .12) : 0
            flames.scale.y = reduced ? 1 : (1 + Math.sin(time * 10) * .13) * (1 - rain * .1)
            fountainSpray.scale.y = reduced ? 1 : 1 + Math.sin(time * 2.7) * .025
            pennants.forEach((pennant, i) => { pennant.rotation.x = reduced ? 0 : Math.sin(time * 2.2 + i * .5) * .16 * wind })
        },
    }
}
