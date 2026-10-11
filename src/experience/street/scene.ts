import * as THREE from 'three'
import { gsap } from 'gsap'
import { createStreetArtKit } from './art-kit'
import { buildStreetArchitecture } from './architecture'
import { buildStreetLandscape } from './landscape'
import { createStreetCharacter } from './character'
import { createStreetCollision } from './collision'
import { createStreetSimulation } from './simulation'
import { groundY } from './level'
import { createPetArt } from '../explorer/pet-art'
import { createObjectState, pets } from '../explorer/world-data'
import { daylight } from '../explorer/daylight'
import type { ExplorerController, MoveInput, TimeMode, WorldOptions, WorldTargetId } from '../explorer/types'

export async function createExplorerScene(canvas:HTMLCanvasElement,options:WorldOptions,signal:AbortSignal):Promise<ExplorerController>{
        signal.throwIfAborted()
        const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
        const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.12,100),artist=createStreetArtKit(scene)
        scene.background=new THREE.Color(0xb9e4f1);scene.fog=new THREE.Fog(0xb9e4f1,38,75)
        const landscape=buildStreetLandscape(artist),architecture=buildStreetArchitecture(artist),staticArt=artist.finish(),collision=createStreetCollision(staticArt.collision),simulation=createStreetSimulation(collision.constrain)
        const hero=createStreetCharacter(artist.kit),villager=createStreetCharacter(artist.kit,true),pet=createPetArt(artist.kit,pets[0]!)
        pet.avatar.scale.setScalar(.60)
        const hemisphere=new THREE.HemisphereLight(0xe8f5ff,0xb4b28b,2.1),sun=new THREE.DirectionalLight(0xffe2b5,3.3);scene.add(hemisphere,sun,sun.target)
        sun.position.set(-16,25,15);sun.target.position.set(0,0,-6);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:75});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015
        const nightWindow=new THREE.MeshBasicMaterial({color:0xe8c67d});artist.kit.extras.push(nightWindow);architecture.windows.forEach(window=>{window.material=nightWindow})
        Object.values(options.labels).forEach(label=>{if(label)label.style.visibility='hidden'})
        const target=new THREE.Vector3(),look=new THREE.Vector3(),desired=new THREE.Vector3(),camDirection=new THREE.Vector3(),sky=new THREE.Color(),daySky=new THREE.Color(0xb9e4f1),nightSky=new THREE.Color(0x243d6c)
        const rig={distance:5.7,height:2.75},entry=gsap.timeline({paused:true}).to(rig,{distance:4.95,height:2.55,duration:1.1,ease:'power2.out'})
        let frame=0,previous=0,elapsed=0,entryTime=0,waveUntil=0,lastRender=0,active=true,disposed=false,first=true,entered=false,reduced=options.reduced,mode:TimeMode='day',day=1,nearest:WorldTargetId|null=null
        let input:MoveInput={x:0,forward:0,run:false}
        simulation.setReduced(reduced)
        function pose(object:THREE.Object3D,actor:{x:number;z:number;yaw:number},y=0){object.position.set(actor.x,groundY(actor.z)+y,actor.z);object.rotation.y=actor.yaw}
        function render(time:number,force=false){
            if(!force)frame=0;if(disposed||!active&&!force)return
            const dt=force?0:Math.min(.05,Math.max(0,(time-(previous||time-16))/1000));previous=time;elapsed+=dt
            simulation.step(dt,input);const {body,mira}=simulation
            if(body.speed>.02&&!entered)controller.explore()
            if(entered&&!reduced){entryTime+=dt;entry.totalTime(entryTime)}else if(reduced)entry.progress(1)
            pose(hero.avatar,body,body.y);pose(villager.avatar,mira);pose(pet.avatar,simulation.pet)
            hero.express(dt,reduced);villager.express(dt,reduced);landscape.update(elapsed,reduced)
            hero.motion.update(dt,{speed:body.speed,y:body.y,vy:body.vy,waving:elapsed<waveUntil||(!entered&&elapsed<1.1),reduced});villager.motion.update(dt,{speed:mira.speed,y:0,vy:0,waving:mira.greeting>0,reduced});pet.update(dt,simulation.pet,reduced,elapsed)
            const next=simulation.nearest();if(next!==nearest){nearest=next;options.onNear(next)}
            const desiredDay=daylight(elapsed,mode,reduced);day=force||reduced?desiredDay:THREE.MathUtils.lerp(day,desiredDay,1-Math.exp(-dt*1.8))
            sky.copy(nightSky).lerp(daySky,day);scene.background=sky;if(scene.fog)scene.fog.color.copy(sky)
            hemisphere.intensity=THREE.MathUtils.lerp(.85,2.1,day);sun.intensity=THREE.MathUtils.lerp(.6,3.3,day);sun.color.set(day>.5?0xffe2b5:0x9fbcff);architecture.windows.forEach(window=>{window.visible=day<.4})
            const small=canvas.clientWidth<768,petFraming=small&&nearest==='patch'?THREE.MathUtils.clamp((simulation.pet.x-body.x)*.4,-.6,.6):0,distance=rig.distance+(small?.95:0),ground=groundY(body.z)
            target.set(body.x+.08+petFraming,ground+1.12,body.z-1.5);desired.set(body.x+.48+petFraming,ground+rig.height+(small?.16:0),body.z+distance)
            const safe=collision.cameraDistance(target,desired);camDirection.copy(desired).sub(target).normalize();desired.copy(target).addScaledVector(camDirection,safe)
            if(first||reduced){camera.position.copy(desired);look.copy(target);first=false}else{const blend=1-Math.exp(-dt*7);camera.position.lerp(desired,blend);look.lerp(target,blend)}camera.lookAt(look)
            const settling=camera.position.distanceToSquared(desired)>.0025||look.distanceToSquared(target)>.0025
            const fps=body.speed>.02||body.y>0||elapsed<waveUntil||settling?60:30
            if(force||time-lastRender>=1000/fps-1){
                try{renderer.render(scene,camera)}catch{controller.dispose();options.onFailure();return}lastRender=time
                Object.assign(canvas.dataset,{scene:'storybook',frames:String(Number(canvas.dataset.frames??0)+1),view:'neighborhood',cameraSettled:String(!settling),playerX:body.x.toFixed(3),playerZ:body.z.toFixed(3),playerY:body.y.toFixed(3),character:hero.source,riggedCharacters:'2',villagers:'1',petCount:'1',population:JSON.stringify([mira]),pets:JSON.stringify([simulation.pet]),lightMode:mode,daylight:day.toFixed(3),near:nearest??'',drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),geometries:String(renderer.info.memory.geometries),textures:String(renderer.info.memory.textures),collision:'three-mesh-bvh',collisionTriangles:String(collision.triangleCount),hat:currentHat,motion:hero.motion.state})
            }
            if(!force)frame=requestAnimationFrame(render)
        }
        let currentHat='everyday'
        function start(){if(active&&!disposed&&!frame)frame=requestAnimationFrame(render)}
        function resize(){if(disposed||!canvas.clientWidth||!canvas.clientHeight)return;const small=canvas.clientWidth<768;renderer.setPixelRatio(Math.min(window.devicePixelRatio,small?1.25:1.5));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.fov=small?55:48;camera.updateProjectionMatrix();staticArt.resize(canvas.clientWidth,canvas.clientHeight);if(!active)render(performance.now(),true)}
        const observer=new ResizeObserver(resize);observer.observe(canvas)
        function failure(event:Event){event.preventDefault();controller.dispose();options.onFailure()}
        canvas.addEventListener('webglcontextlost',failure)
        const controller:ExplorerController={
            setConversation(id){simulation.setConversation(id)},interactPet(id,action){const state=simulation.interactPet(id,action);if(!active)render(performance.now(),true);return state},setHat(hat){currentHat=hat;hero.hats?.set(hat);if(!active)render(performance.now(),true)},setTimeMode(value){mode=value;if(!active)render(performance.now(),true)},interactObject(){return createObjectState()},
            explore(){if(!entered){entered=true;options.onMove()}},setInput(value){input=value},setActive(value){active=value;previous=0;if(active)start();else{cancelAnimationFrame(frame);frame=0;input={x:0,forward:0,run:false}}},setReduced(value){reduced=value;simulation.setReduced(value);if(value)entry.progress(1)},visit(id){simulation.visit(id);first=true;controller.explore();nearest=id;options.onNear(id);if(!active)render(performance.now(),true)},jump(){controller.explore();simulation.jump()},wave(){waveUntil=elapsed+1.8;if(!active)render(performance.now(),true)},reset(){simulation.reset();first=true;nearest=null;options.onNear(null);if(!active)render(performance.now(),true)},
            dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('webglcontextlost',failure);entry.kill();hero.dispose();villager.dispose();staticArt.dispose();artist.kit.dispose();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss()},
        }
        resize();start();return controller
}
