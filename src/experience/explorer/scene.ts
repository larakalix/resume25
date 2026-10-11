import * as THREE from 'three'
import { createWorldArt } from './art'
import { createWorldSimulation, CAMERA_YAW } from './simulation'
import { worldTargets, createObjectState } from './world-data'
import { groundHeight } from './terrain'
import { daylight } from './daylight'
import { activateObject } from './dialogue'
import { PLANET_RADIUS, surfaceDistance, surfaceFrame, surfacePoint } from './planet'
import type { ExplorerController, MoveInput, WorldOptions, WorldTargetId, TimeMode } from './types'
import type { HatId } from './seasonal-hats'
import { loadWorldAssets } from './world-assets'
import { celStyle } from './render-style'
import { disposeSceneAsset } from './scene-asset'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

export async function createExplorerScene(canvas: HTMLCanvasElement, options: WorldOptions, signal: AbortSignal): Promise<ExplorerController> {
    const assets = await loadWorldAssets(signal)
    try { signal.throwIfAborted(); return createScene(canvas, options, assets.character) }
    catch (error) { if (assets.character) disposeSceneAsset(assets.character); throw error }
}

function createScene(canvas: HTMLCanvasElement, options: WorldOptions, asset?: GLTF): ExplorerController {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, canvas.clientWidth < 768 ? 1.25 : 1.5))
    renderer.setClearColor(0x83c3c3); renderer.toneMapping = THREE.NoToneMapping
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(43, 1, .1, 260)
    const hemisphere = new THREE.HemisphereLight(0xfff7dd, 0x6d8c89, celStyle.day.hemisphere); scene.add(hemisphere)
    const sun = new THREE.DirectionalLight(0xfff5df, celStyle.day.sun); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: .5, far: 150 }); sun.shadow.normalBias = celStyle.shadow.normalBias; sun.shadow.bias = celStyle.shadow.bias
    scene.add(sun, sun.target)
    const fill = new THREE.DirectionalLight(0xd7e9e6, celStyle.day.fill); fill.position.set(15, 30, -10); scene.add(fill)
    const art = createWorldArt(scene, asset), simulation = createWorldSimulation()
    simulation.setReduced(options.reduced)
    const rimGeometry = new THREE.SphereGeometry(PLANET_RADIUS + .045, 64, 48), rimMaterial = new THREE.MeshBasicMaterial({ color: 0x394d43, side: THREE.BackSide })
    scene.add(new THREE.Mesh(rimGeometry, rimMaterial))
    const speckGeometry = new THREE.BufferGeometry(), positions: number[] = []
    for (let i = 0; i < 260; i++) { const a = i * 2.39996, y = 1 - i / 130, radius = Math.sqrt(1 - y * y); positions.push(Math.cos(a) * radius * 115, y * 115, Math.sin(a) * radius * 115) }
    speckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const speckMaterial = new THREE.PointsMaterial({ color: 0xe2efdc, size: .15, transparent: true, opacity: .6, depthWrite: false }); scene.add(new THREE.Points(speckGeometry, speckMaterial))
    scene.updateMatrixWorld(true)
    const occluderMeshes = art.occluders.flatMap(item => item.meshes), occluderIndices = new Map<THREE.Object3D, number>()
    art.occluders.forEach((item, index) => item.meshes.forEach(mesh => occluderIndices.set(mesh, index)))
    const ray = new THREE.Raycaster(), rayTarget = new THREE.Vector3(), rayDirection = new THREE.Vector3(), hidden = new Set<number>()
    const normal = new THREE.Vector3(), east = new THREE.Vector3(), south = new THREE.Vector3(), basis = new THREE.Matrix4(), orientation = new THREE.Quaternion(), yaw = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0)
    const focus = new THREE.Vector3(), desired = new THREE.Vector3(), desiredLook = new THREE.Vector3(), look = new THREE.Vector3(), projected = new THREE.Vector3(), labelPoint = new THREE.Vector3()
    let input: MoveInput = { x: 0, forward: 0, run: false }, active = true, disposed = false, reduced = options.reduced, overview = true
    let frame = 0, previous = 0, elapsed = 0, waveUntil = 1.6, lastRendered = 0, firstFrame = true, overviewOffset = 0
    let nearest: WorldTargetId | null = null, timeMode: TimeMode = 'cycle', objectState = createObjectState(), dayLevel = 1, bellUntil = 0, fountainLevel = 1, selectedHat: HatId = 'everyday'
    const sky = new THREE.Color(), daySky = new THREE.Color('#83c3c3'), nightSky = new THREE.Color('#132635'), duskSky = new THREE.Color('#b99a8a')
    const dayWater = new THREE.Color('#58b5c1'), nightWater = new THREE.Color('#12384e'), daySun = new THREE.Color('#fff5df'), nightSun = new THREE.Color('#9fbfff')
    const dayHemi = new THREE.Color('#fff7dd'), nightHemi = new THREE.Color('#839ed2'), dayGround = new THREE.Color('#6d8c89'), nightGround = new THREE.Color('#243844')
    const npcEast = new THREE.Vector3(), npcNormal = new THREE.Vector3(), npcSouth = new THREE.Vector3(), npcOrientation = new THREE.Quaternion(), boatBase = art.boat.quaternion.clone(), zAxis = new THREE.Vector3(0,0,1)
    function render(time: number, force = false) {
        if (!force) frame = 0
        if ((!active && !force) || disposed) return
        const dt = force ? 0 : Math.min(.05, Math.max(0, (time - (previous || time - 16)) / 1000)); previous = time; elapsed += dt
        simulation.step(dt, input)
        const body = simulation.body, moving = body.speed > .05
        if (moving && overview) { overview = false; options.onMove() }
        const nextNear = simulation.nearest()
        if (nextNear !== nearest) { nearest = nextNear; options.onNear(nearest) }
        normal.set(simulation.frame.normal.x, simulation.frame.normal.y, simulation.frame.normal.z); east.set(simulation.frame.east.x, simulation.frame.east.y, simulation.frame.east.z); south.set(simulation.frame.south.x, simulation.frame.south.y, simulation.frame.south.z)
        basis.makeBasis(east, normal, south); orientation.setFromRotationMatrix(basis)
        art.avatar.position.copy(normal).multiplyScalar(PLANET_RADIUS + groundHeight(body) + body.y); art.avatar.quaternion.copy(orientation).multiply(yaw.setFromAxisAngle(yAxis, body.yaw))
        const waving = elapsed < waveUntil
        art.motion.update(dt, { speed: body.speed, y: body.y, vy: body.vy, waving, reduced })
        art.playMeshes.forEach((mesh, index) => { const object = simulation.objects[index]!, point = surfacePoint(object, .33), local = surfaceFrame(object); mesh.position.set(point.x, point.y, point.z); basis.makeBasis(new THREE.Vector3(local.east.x, local.east.y, local.east.z), new THREE.Vector3(local.normal.x, local.normal.y, local.normal.z), new THREE.Vector3(local.south.x, local.south.y, local.south.z)); mesh.quaternion.setFromRotationMatrix(basis) })
        art.mobile.rotation.z = reduced ? 0 : elapsed * .28
        const targetDay = daylight(elapsed,timeMode,reduced)
        dayLevel = reduced || force ? targetDay : dayLevel + (targetDay-dayLevel)*(1-Math.exp(-dt*1.8))
        sky.copy(nightSky).lerp(daySky,dayLevel).lerp(duskSky,Math.sin(dayLevel*Math.PI)*.4); renderer.setClearColor(sky)
        hemisphere.color.copy(nightHemi).lerp(dayHemi,dayLevel); hemisphere.groundColor.copy(nightGround).lerp(dayGround,dayLevel); hemisphere.intensity=THREE.MathUtils.lerp(celStyle.night.hemisphere,celStyle.day.hemisphere,dayLevel)
        sun.color.copy(nightSun).lerp(daySun,dayLevel);sun.intensity=THREE.MathUtils.lerp(celStyle.night.sun,celStyle.day.sun,dayLevel);fill.intensity=THREE.MathUtils.lerp(celStyle.night.fill,celStyle.day.fill,dayLevel)
        art.waterTime.value=reduced?0:elapsed;art.grassTime.value=reduced?0:elapsed;art.waterColor.value.copy(nightWater).lerp(dayWater,dayLevel)
        art.windowGlow.opacity=(1-dayLevel)*.95;art.lampGlow.opacity=(1-dayLevel)*.95;art.bridgeGlow.opacity=objectState['bridge-lights'] ? .25+(1-dayLevel)*.75 : 0
        speckMaterial.opacity=.18+(1-dayLevel)*.72
        art.sails.rotation.z = reduced ? 0 : art.sails.rotation.z + dt*(objectState.windmill?1.7:.2)
        fountainLevel = reduced || force ? Number(objectState.fountain) : fountainLevel+(Number(objectState.fountain)-fountainLevel)*(1-Math.exp(-dt*6))
        art.jets.visible=fountainLevel>.01;art.jets.scale.y=Math.max(.001,fountainLevel)
        art.droplets.forEach((drop,i)=>{const phase=reduced ? .5 : (elapsed*.8+i/9)%1;drop.position.set(Math.cos(i*2.4)*phase*.9,.65+Math.sin(phase*Math.PI)*1.2,Math.sin(i*2.4)*phase*.9)})
        const bellRemaining=Math.max(0,bellUntil-elapsed)
        art.bell.rotation.z=bellRemaining ? (reduced ? .18 : Math.sin((3-bellRemaining)*12)*bellRemaining/3*.5) : 0
        art.rippleMaterial.opacity=bellRemaining/3*.55;art.ripples.forEach((ring,i)=>{ring.visible=bellRemaining>0;ring.scale.setScalar(reduced?1.3+i*.4:1+((3-bellRemaining)*.8+i*.5)%1.8)})
        art.flames.visible=objectState.campfire;art.flames.scale.y=reduced?1:.95+Math.sin(elapsed*9)*.08;art.fireLight.intensity=objectState.campfire?1.2+(1-dayLevel)*7:0
        const boatPoint=surfacePoint({x:-21,z:22},.15+(reduced?0:Math.sin(elapsed*1.4)*.035));art.boat.position.set(boatPoint.x,boatPoint.y,boatPoint.z);art.boat.quaternion.copy(boatBase).multiply(yaw.setFromAxisAngle(zAxis,reduced?0:Math.sin(elapsed*1.2)*.025))
        function placeActor(object:THREE.Object3D,actor:{x:number;z:number;yaw:number}) {
            const local=surfaceFrame(actor),point=surfacePoint(actor,groundHeight(actor))
            npcEast.set(local.east.x,local.east.y,local.east.z);npcNormal.set(local.normal.x,local.normal.y,local.normal.z);npcSouth.set(local.south.x,local.south.y,local.south.z)
            basis.makeBasis(npcEast,npcNormal,npcSouth);npcOrientation.setFromRotationMatrix(basis)
            object.position.set(point.x,point.y,point.z);object.quaternion.copy(npcOrientation).multiply(yaw.setFromAxisAngle(yAxis,actor.yaw))
        }
        art.villagers.forEach((villager,index)=>{
            const actor=simulation.population.people[index]!
            placeActor(villager.model.avatar,actor)
            villager.model.motion.update(dt,{speed:actor.speed,y:0,vy:0,waving:actor.greeting>0,reduced})
        })
        art.companions.forEach((pet,index)=>{const actor=simulation.population.animals[index]!;placeActor(pet.avatar,actor);pet.update(dt,actor,reduced,elapsed)})
        art.flag.rotation.z = nearest === 'contact' ? -.5 : 0
        art.birds.forEach((bird, index) => { const point = surfacePoint({ x: (reduced ? 0 : elapsed * 1.3) + index * 21, z: Math.sin(index * 3.1) * 14 }, 5 + index % 2); bird.position.set(point.x, point.y, point.z); bird.rotation.set(.2, reduced ? 0 : elapsed * .08, .4); bird.children.forEach((wing, i) => { wing.rotation.z = (i ? 1 : -1) * (reduced ? 1.1 : 1.1 + Math.sin(elapsed * 5 + index) * .3) }) })
        const small = canvas.clientWidth < 768
        let targetOffset = 0
        focus.copy(normal).multiplyScalar(PLANET_RADIUS + .95)
        if (overview || reduced) {
            const insets = overview && canvas.clientWidth < 768 && canvas.clientHeight > 540 ? options.overviewInsets?.() : undefined
            const heightRatio = insets ? Math.max(100, canvas.clientHeight - insets.top - insets.bottom) / canvas.clientHeight : 1
            const halfView = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(heightRatio, camera.aspect)), distance = (PLANET_RADIUS + 6) / Math.sin(halfView) * 1.03
            if (insets) targetOffset = (insets.top - insets.bottom) / 2
            desired.copy(normal).multiplyScalar(distance).addScaledVector(east, small ? 3 : 10).addScaledVector(south, 12); desiredLook.set(0, 0, 0)
        }
        else { desired.copy(normal).multiplyScalar(PLANET_RADIUS + (small ? 18 : 14)).addScaledVector(east, Math.sin(CAMERA_YAW) * (small ? 17 : 15)).addScaledVector(south, Math.cos(CAMERA_YAW) * (small ? 17 : 15)); desiredLook.copy(focus) }
        overviewOffset = firstFrame || reduced ? targetOffset : overviewOffset + (targetOffset - overviewOffset) * (1 - Math.exp(-dt * 3.6))
        if (Math.abs(overviewOffset) > .1) camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, 0, -overviewOffset, canvas.clientWidth, canvas.clientHeight)
        else camera.clearViewOffset()
        if (firstFrame || reduced) { camera.position.copy(desired); camera.up.copy(normal); look.copy(desiredLook); firstFrame = false }
        else { const blend = 1 - Math.exp(-dt * 3.6); camera.position.lerp(desired, blend); camera.up.lerp(normal, blend).normalize(); look.lerp(desiredLook, blend) }
        camera.lookAt(look)
        sun.position.copy(focus).addScaledVector(normal,46).addScaledVector(east,-24).addScaledVector(south,18); sun.target.position.copy(focus)
        hidden.clear()
        for (const height of [.45, 1.55, 2.55]) {
            rayTarget.copy(normal).multiplyScalar(PLANET_RADIUS + groundHeight(body) + body.y + height); rayDirection.copy(rayTarget).sub(camera.position)
            ray.far = Math.max(0, rayDirection.length() - .2); ray.set(camera.position, rayDirection.normalize())
            for (const hit of ray.intersectObjects(occluderMeshes, false)) { const index = occluderIndices.get(hit.object); if (index !== undefined) hidden.add(index) }
        }
        art.occluders.forEach((item, index) => {
            item.materials.forEach(material => { const target = hidden.has(index) && !overview ? .12 : 1; material.opacity = target === .12 || reduced || force ? target : material.opacity + (target - material.opacity) * (1 - Math.exp(-dt * 9)); if (material.opacity > .995) material.opacity = 1; material.depthWrite = material.opacity === 1 })
            item.meshes.forEach(mesh => { mesh.castShadow = !hidden.has(index) || overview })
        })
        const transitioning = camera.position.distanceToSquared(desired) > .01 || look.distanceToSquared(desiredLook) > .01 || Math.abs(targetOffset - overviewOffset) > .1, targetFps = moving || waving || body.y > 0 || transitioning ? 60 : 30
        if (force || time - lastRendered >= 1000 / targetFps - 1) {
            try { renderer.render(scene, camera) } catch { controller.dispose(); options.onFailure(); return }
            lastRendered = time
            canvas.dataset.frames = String(Number(canvas.dataset.frames ?? 0) + 1); canvas.dataset.playerX = body.x.toFixed(3); canvas.dataset.playerZ = body.z.toFixed(3); canvas.dataset.playerY = body.y.toFixed(3); canvas.dataset.view = overview ? 'overview' : 'walking'
            canvas.dataset.drawCalls = String(renderer.info.render.calls); canvas.dataset.triangles = String(renderer.info.render.triangles); canvas.dataset.geometries = String(renderer.info.memory.geometries); canvas.dataset.textures = String(renderer.info.memory.textures)
            canvas.dataset.cameraSettled = String(!transitioning)
            canvas.dataset.lightMode=timeMode;canvas.dataset.daylight=dayLevel.toFixed(3);canvas.dataset.radius=String(PLANET_RADIUS);canvas.dataset.objects=JSON.stringify(objectState);canvas.dataset.near=nearest??''
            canvas.dataset.hat=selectedHat
            canvas.dataset.character=art.source; canvas.dataset.motion=art.motion.state
            canvas.dataset.riggedCharacters=String((art.source==='quaternius'?1:0)+art.villagers.filter(villager=>villager.model.source==='quaternius').length)
            canvas.dataset.nature='illustrated'
            canvas.dataset.population=JSON.stringify(simulation.population.people.map(({id,x,z,mode,speed})=>({id,x,z,mode,speed})))
            canvas.dataset.pets=JSON.stringify(simulation.population.animals.map(({id,x,z,mode,following,affection})=>({id,x,z,mode,following,affection})))
            const occupied: {x:number;y:number;width:number;height:number}[]=[]
            if (!overview) {
                // Keep place labels clear of the face and the tallest accessory, in any camera view.
                let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity
                for (const height of [1.1,2.75]) for (const x of [-.55,.55]) for (const z of [-.45,.45]) {
                    labelPoint.copy(normal).multiplyScalar(PLANET_RADIUS+groundHeight(body)+body.y+height).addScaledVector(east,x).addScaledVector(south,z)
                    projected.copy(labelPoint).project(camera)
                    const px=(projected.x+1)*canvas.clientWidth/2,py=(1-projected.y)*canvas.clientHeight/2
                    left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py)
                }
                occupied.push({x:left-6,y:top-6,width:right-left+12,height:bottom-top+12})
            }
            for (const place of worldTargets.map(target=>simulation.target(target.id)!).sort((a,b)=>surfaceDistance(body,a)-surfaceDistance(body,b))) {
                const label = options.labels[place.id]; if (!label) continue
                const p = surfacePoint(place, place.kind==='resident'?2.2:place.kind==='pet'?1.2:place.kind==='object'?(place.id==='windmill'?5.8:3):5.7); labelPoint.set(p.x, p.y, p.z); projected.copy(labelPoint).project(camera)
                const x = (projected.x + 1) * canvas.clientWidth / 2, y = (1 - projected.y) * canvas.clientHeight / 2, outward = surfaceFrame(place).normal
                const facing = labelPoint.copy(camera.position).sub(new THREE.Vector3(p.x, p.y, p.z)).dot(new THREE.Vector3(outward.x, outward.y, outward.z)) > 0
                const rectangle={x:x-label.offsetWidth/2,y:y-label.offsetHeight,width:label.offsetWidth,height:label.offsetHeight}
                const overlaps=occupied.some(r=>rectangle.x<r.x+r.width+6&&rectangle.x+rectangle.width+6>r.x&&rectangle.y<r.y+r.height+6&&rectangle.y+rectangle.height+6>r.y)
                const visible = !overlaps && surfaceDistance(body,place)<(place.kind==='place'?32:12) && !overview && facing && projected.z < 1 && projected.z > -1 && x > label.offsetWidth / 2 + 12 && x < canvas.clientWidth - label.offsetWidth / 2 - 12 && y > label.offsetHeight + (small ? 76 : 104) && y < canvas.clientHeight - 185
                if(visible)occupied.push(rectangle)
                label.dataset.near=String(nearest===place.id)
                label.style.visibility = visible ? 'visible' : 'hidden'; label.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-100%)`
            }
        }
        if (!force) frame = requestAnimationFrame(render)
    }
    function start() { if (!disposed && active && !frame) frame = requestAnimationFrame(render) }
    function resize() { if (!canvas.clientWidth || !canvas.clientHeight || disposed) return; renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.fov = canvas.clientWidth < 768 ? 46 : 43; camera.updateProjectionMatrix(); if (!active) render(performance.now(), true) }
    function failure(event: Event) { event.preventDefault(); controller.dispose(); options.onFailure() }
    canvas.addEventListener('webglcontextlost', failure)
    const observer = new ResizeObserver(resize); observer.observe(canvas)
    const controller: ExplorerController = {
        setConversation(id) { simulation.setConversation(id) },
        interactPet(id,action) { const state=simulation.interactPet(id,action);if(!active)render(performance.now(),true);return state },
        setHat(hat) { selectedHat=hat;art.hats?.set(hat);if(!active)render(performance.now(),true) },
        setTimeMode(mode) { timeMode=mode;if(!active)render(performance.now(),true) },
        interactObject(id) { objectState=activateObject(objectState,id);if(id==='bell')bellUntil=elapsed+3;if(!active)render(performance.now(),true);return {...objectState} },
        explore() { if (overview) { overview = false; options.onMove() } },
        setInput(value) { input = value },
        setActive(value) { active = value; previous = 0; if (value) start(); else { cancelAnimationFrame(frame); frame = 0; input = { x: 0, forward: 0, run: false } } },
        setReduced(value) { reduced = value;simulation.setReduced(value) },
        visit(id) { simulation.visit(id); overview = false; waveUntil = elapsed + 1.3; options.onNear(id); nearest = id; if (!active) { firstFrame = true; render(performance.now(), true) } },
        jump() { controller.explore(); simulation.jump() },
        wave() { waveUntil = elapsed + 1.8; if (!active) render(performance.now(), true) },
        reset() { simulation.reset(); objectState=createObjectState();bellUntil=0;fountainLevel=1;overview = true; waveUntil = elapsed + 1.3; nearest = null; options.onNear(null); if (!active) { firstFrame = true; render(performance.now(), true) } },
        dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('webglcontextlost', failure); art.dispose(); rimGeometry.dispose(); rimMaterial.dispose(); speckGeometry.dispose(); speckMaterial.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss() },
    }
    resize(); start(); return controller
}
