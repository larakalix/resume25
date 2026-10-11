import * as THREE from 'three'
import {gsap} from 'gsap'
import {MeshBVH} from 'three-mesh-bvh'
import {createGlobeArt} from './art-kit'
import {buildLandscape} from './landscape'
import {buildArchitecture} from './architecture'
import {buildCity} from './city'
import {buildWorldExpansion} from './world-expansion-art'
import {buildWorldTrails} from './world-trails'
import {buildCityCliffs} from './city-cliffs'
import {buildJapan} from './japan'
import {inJapan as legacyInJapan} from './japan-district'
import {blocked as legacyBlocked,buildings as legacyBuildings,targets as legacyTargets} from './layout'
import {cityResidents} from './city-residents'
import {coastalCrossing} from './coastal-crossing'
import {createCaveInterior} from './cave-interior'
import {buildWildLand} from './wild-land-art'
import {roomLabels} from './rooms'
import {lighthouse as lighthouseSpec} from './lighthouse'
import {loadLighthouseAsset} from './lighthouse-asset'
import {buildLighthouse} from './lighthouse-art'
import {loadBuildingModels} from './building-models'
import {inCity as legacyInCity} from './city-district'
import {createFootprints,isFootprintSand} from './footprints'
import {createDuckFood} from './duck-food'
import {feedingPoint as legacyFeedingPoint} from './pond'
import {harborBasis,harborFootprint as legacyHarborFootprint,harborLocalPoint,harborWorldPoint} from './harbor'
import {createHarborCamera} from './harbor-camera'
import {buildHarborDock} from './harbor-dock-art'
import {createCruiseShip} from './cruise-ship'
import {dockFootprint as legacyDockFootprint} from './duck-dock'
import {createInterior} from './interiors'
import {createWildlife} from './wildlife'
import {createGlobeSimulation} from './simulation'
import {createWorldSound} from './sound'
import {createQualityController,qualityProfile} from './quality'
import {createNatureDetails} from './nature-details'
import {createCameraClearance} from './camera-clearance'
import {followFraming} from './camera-framing'
import {globeOverview,alignGlobeOverview} from './globe-overview'
import {createNavigationPublisher} from './navigation'
import {createCameraDirector} from './camera-director'
import {createWeather,type WeatherChoice} from './weather'
import {createWeatherArt} from './weather-art'
import {defaultPhotoOptions,capturePostcard} from './photo'
import {photoCharacterPresentation} from './photo-presentation'
import {createInteriorCameraClearance} from './interior-camera'
import type {PhotoOptions,PhotoExport} from './photo'
import type {PassportSnapshot} from './passport'
import {createTrailGuidance} from './trail-guidance'
import {createGuideFirefly} from './guide-firefly'
import {buildSecretArt} from './secret-art'
import {isSecret} from './secrets'
import {createTalkCamera,createTalkViewPublisher} from './talk-camera'
import {createIvanGreetings} from './ivan-greetings'
import {worldLoadState} from './loading'
import type {WorldLoadStage} from './loading'
import {createOcclusionFade,meshOccluder,instancedOccluder} from './occlusion'
import {RADIUS,WATER,normalAt,heightAt as legacyHeightAt,bridgeHeight as legacyBridgeHeight,wet as legacyWet} from './geography'
import {createStreetCharacter} from '../street/character'
import {ORIGINAL_POSE_METRICS} from '../street/character-poses'
import {createPetArt} from '../explorer/pet-art'
import {pets} from '../explorer/world-data'
import {daylight} from '../explorer/daylight'
import type {GlobeController,GlobeOptions,MapPoint,RoomId} from './types'
import type {MoveInput,TimeMode} from '../explorer/types'

import {archipelagoWorld} from '../archipelago/compile'
import {createDistrictAssets} from '../archipelago/district-assets'
import {loadJapaneseProps} from '../archipelago/japanese-props'
import {loadKayKit} from '../archipelago/kaykit-assets'
import {getCharacterDefinition} from '../archipelago/character-definitions'
import {loadCutesFamily} from '../archipelago/cutes-assets'
import {createCutesCharacter} from '../archipelago/cutes-character'
import {buildArchipelagoArt} from '../archipelago/art'
import {createIslandFerry,FERRY_RIDER_OFFSET} from '../archipelago/ferry-art'
import type {FerryArrival} from '../archipelago/activities'
import {createDelivery,createFerryJourney} from '../archipelago/activities'

export async function createGlobeScene(canvas:HTMLCanvasElement,options:GlobeOptions,signal:AbortSignal):Promise<GlobeController>{
 const world=options.world==='archipelago'?archipelagoWorld:undefined
 const blocked=world?.blocked??legacyBlocked,buildings=world?.buildings??legacyBuildings,targets=world?.targets??legacyTargets,heightAt=world?.heightAt??legacyHeightAt,bridgeHeight=world?.bridgeHeight??legacyBridgeHeight,wet=world?.wet??legacyWet,feedingPoint=world?.pond.feedingPoint??legacyFeedingPoint,dockFootprint=world?.dockFootprint??legacyDockFootprint
 const harborFootprint=world?(_point:MapPoint,_margin=0)=>false:legacyHarborFootprint,inCity=world?(point:MapPoint)=>world.areaAt(point)==='harbor':legacyInCity,inJapan=world?(point:MapPoint)=>world.areaAt(point)==='komorebi-market':legacyInJapan
 const partialCleanup:(()=>void)[]=[]
 async function checkpoint(stage:WorldLoadStage){options.onLoad?.(worldLoadState(stage));await new Promise<void>(resolve=>setTimeout(resolve,0));signal.throwIfAborted()}
 try{
 signal.throwIfAborted()
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
 partialCleanup.push(()=>{renderer.dispose();renderer.forceContextLoss()})
 const scene=new THREE.Scene(),outdoors=new THREE.Scene(),art=createGlobeArt(outdoors,world),sim=createGlobeSimulation(world),camera=new THREE.PerspectiveCamera(48,1,.14,420)
 const frameAt=art.frameAt,delivery=createDelivery(),ferry=createFerryJourney()
 const v2=options.controls==='v2',director=createCameraDirector(),clearInterior=createInteriorCameraClearance(),weather=createWeather()
 director.align(sim.body)
 let weatherChoice:WeatherChoice='auto',photoActive=false,photoPoseReset=false,photoOptions:PhotoOptions=defaultPhotoOptions(),progress:PassportSnapshot|null=null
 let photoCamera:ReturnType<typeof director.snapshot>|null=null,photoInterior:{yaw:number;pitch:number;zoom:number}|null=null
 let pendingCapture:{resolve:(value:PhotoExport)=>void;reject:(error:unknown)=>void;abort:AbortController}|null=null,captureAbort:AbortController|null=null
 const announcedDiscoveries=new Set<string>(),guide=createTrailGuidance(targets,point=>!wet(point)&&!blocked(point),world?.paths)
 let lastGuide=-Infinity,lastGuideKey='',currentGuidance:ReturnType<typeof guide.update>=null
 const interiorOrbit={yaw:0,pitch:0,zoom:1}
 partialCleanup.push(()=>art.dispose())
 scene.add(outdoors);scene.background=new THREE.Color(0xc9e5e5);scene.fog=new THREE.Fog(0xc9e5e5,95,190)
 await checkpoint('terrain')
 const landscape=buildLandscape(art,world)
 const weatherArt=v2?createWeatherArt(outdoors):null;partialCleanup.push(()=>weatherArt?.dispose())
 if(!world){buildWorldTrails(art);buildWildLand(art)}
 await checkpoint('models')
 let refreshDistrictArt=()=>{},districtLive=false
 const districtAssets=world?createDistrictAssets(signal,()=>refreshDistrictArt(),()=>{if(!signal.aborted){controller.dispose();options.onFailure()}}):undefined
 const cityModels=districtAssets??await loadBuildingModels(signal);partialCleanup.push(()=>cityModels.dispose())
 const kaykit=world?await loadKayKit(signal):undefined;if(kaykit)partialCleanup.push(()=>kaykit.dispose())
 const japaneseProps=world?await loadJapaneseProps(signal):undefined;if(japaneseProps)partialCleanup.push(()=>japaneseProps.dispose())
 const cutes=world?await loadCutesFamily(signal):undefined;if(cutes)partialCleanup.push(()=>cutes.dispose())
 const actor=(kit:typeof art.kit,id:string,scale?:number,phase?:number)=>{const definition=getCharacterDefinition(id);return createCutesCharacter(kit,cutes!,{variant:definition.variant,scale:scale??definition.scale,phase:phase??definition.phase,seasonal:definition.seasonal})}
 const lighthouseAsset=await loadLighthouseAsset(signal);partialCleanup.push(()=>lighthouseAsset.dispose())
 await checkpoint('buildings')
 const architecture=world?buildArchipelagoArt(art,world,cityModels,kaykit!,japaneseProps):buildArchitecture(art,cityModels),lighthouse=buildLighthouse(art,lighthouseAsset,world?.targets.find(target=>target.id==='bluebird-lighthouse'));if(!world)cityModels.dispose();japaneseProps?.dispose()
 if(v2)buildSecretArt(art,null,world?.targets)
 await checkpoint('city')
 const city=world?{update(_day:number){}}:buildCity(art),cityCliffs=world?{triangles:'triangles' in architecture?architecture.triangles:0}:buildCityCliffs(art),japan=world?{update(_day:number){}}:buildJapan(art),expansion=world?{update(_time:number,_reduced:boolean,_day:number){}}:buildWorldExpansion(art),harborDock=world?{update(_time:number,_reduced:boolean,_day:number,_bell:number){}}:buildHarborDock(art),nature=createNatureDetails(art,world),footprints=createFootprints(art,world?{terrainHeight:world.terrainHeight,isSand:point=>world.surfaceAt(point)==='sand'&&!world.blocked(point)}:undefined),merged=art.finish(),cameraTree=new MeshBVH(merged.meshes[0]!.geometry,{targetLeafSize:10}),clearCamera=createCameraClearance(cameraTree)
 const cruise=createCruiseShip(art)
 if(world){const at=world.definition.harbor.at,point=world.localToMap(at.frame,at.x+8,at.z+7);cruise.root.matrixAutoUpdate=true;cruise.root.position.setFromMatrixPosition(frameAt(point.x,point.z,WATER));cruise.root.quaternion.setFromRotationMatrix(frameAt(point.x,point.z,WATER));cruise.root.rotateY(Math.PI/2)}
 const ferryArt=world?createIslandFerry(art):null
 if(ferryArt)ferryArt.root.visible=false
 const duckFood=createDuckFood(art,(point,time)=>landscape.ripple(point,reduced?0:time))
 await checkpoint('residents')
 sim.prepareWorldRoutes();if(v2)guide.prepare()
 const rooms=Object.fromEntries((Object.keys(roomLabels) as RoomId[]).map(id=>{const room=id==='crystal-cave'||id==='tide-cave'?createCaveInterior(id):createInterior(id,cutes?{create:(kit,id)=>actor(kit,id)}:undefined);partialCleanup.push(()=>room.dispose());scene.add(room.scene);room.scene.visible=false;return[id,room]})) as Record<RoomId,ReturnType<typeof createInterior>>
 const guideFirefly=v2?createGuideFirefly(outdoors,rooms,frameAt):null;partialCleanup.push(()=>guideFirefly?.dispose())
 const hero=cutes?actor(art.kit,'visitor'):createStreetCharacter(art.kit),mira=cutes?actor(art.kit,'mira',.96):createStreetCharacter(art.kit,true),sol=cutes?actor(art.kit,'sol',.98):createStreetCharacter(art.kit,true,{coat:'coral',hair:'wood',hairstyle:'curls',glasses:true,scale:.9}),patch=createPetArt(art.kit,pets[0]!),fox=createWildlife(art.kit,'fox'),ducks=Array.from({length:3},()=>createWildlife(art.kit,'duck')),rabbits=Array.from({length:2},()=>createWildlife(art.kit,'rabbit'))
 patch.avatar.scale.setScalar(.65);fox.avatar.scale.setScalar(.8);ducks.forEach(d=>d.avatar.scale.setScalar(.78));rabbits.forEach(r=>r.avatar.scale.setScalar(.72))
 const duckAvatars=ducks.map(duck=>duck.avatar)
 const sun=new THREE.DirectionalLight(0xffe6ba,3.1),fill=new THREE.HemisphereLight(0xdfefff,0x7d8b64,1.85);scene.add(sun,sun.target,fill);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.2,far:120});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015
 const glow=new THREE.MeshBasicMaterial({color:0xffd991});art.kit.extras.push(glow);architecture.windows.forEach(w=>{w.material=glow})
 let occlusion=createOcclusionFade([...art.occlusionGroups.map(meshOccluder),...landscape.canopyGroups.map(group=>instancedOccluder(group.id,landscape.canopies,group.indices))])
 refreshDistrictArt=()=>{if(disposed)return;occlusion.dispose();occlusion=createOcclusionFade([...art.occlusionGroups.map(meshOccluder),...landscape.canopyGroups.map(group=>instancedOccluder(group.id,landscape.canopies,group.indices))]);redraw()}
 const districtRoots=world&&'buildingRoots' in architecture?architecture.buildingRoots.map(root=>({root,lot:world.buildings.find(building=>building.id===root.userData.buildingId)!})):[]
 const districtView=new THREE.Vector3()
 const fireflyGeometry=new THREE.BufferGeometry(),flyPositions=new Float32Array(80*3),flyOrigins:THREE.Vector3[]=[]
 for(let i=0;i<80;i++){const point=normalAt(Math.sin(i*8.3)*28,Math.cos(i*3.7)*25);const v=new THREE.Vector3(point.x,point.y,point.z).multiplyScalar(RADIUS+2+(i%4)*.4);flyOrigins.push(v);flyPositions.set(v.toArray(),i*3)}fireflyGeometry.setAttribute('position',new THREE.BufferAttribute(flyPositions,3));const flyMaterial=new THREE.PointsMaterial({color:0xffdb86,size:.10,transparent:true,depthWrite:false});const fireflies=new THREE.Points(fireflyGeometry,flyMaterial);outdoors.add(fireflies)
 const matrix=new THREE.Matrix4(),worldUp=new THREE.Vector3(0,1,0),overviewUp=new THREE.Vector3(),up=new THREE.Vector3(),east=new THREE.Vector3(),south=new THREE.Vector3(),follow=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3(),target=new THREE.Vector3(),sky=new THREE.Color(),daySky=new THREE.Color(0xc9e5e5),nightSky=new THREE.Color(0x17263e),overcastSky=new THREE.Color(0x9cbbc3)
 const crouchRotation=new THREE.Quaternion(),euler=new THREE.Euler(),rig={zoom:0},orbit={x:0,y:0};let tween:gsap.core.Tween|undefined,tweenTime=0,previous=0,elapsed=0,frame=0,active=true,disposed=false,reduced=options.reduced,first=true,overview=true,waveUntil=0,lastRender=0,lastPublish='',lastInside=sim.inside,mode:TimeMode='day',day=1
 let lastRuntime='',appliedQuality='',lastSteps=0,lastLanding=0,walkNotified=false,hasExplored=false
 const quality=createQualityController(),sound=createWorldSound(()=>publishRuntime(true)),audioDirection=new THREE.Vector3(),soundPoint=new THREE.Vector3()
 const foodFrom=new THREE.Vector3()
 const harborUp=new THREE.Vector3(harborBasis.up.x,harborBasis.up.y,harborBasis.up.z),harborEast=new THREE.Vector3(harborBasis.east.x,harborBasis.east.y,harborBasis.east.z),harborSouth=new THREE.Vector3(harborBasis.south.x,harborBasis.south.y,harborBasis.south.z),harborFocus=new THREE.Vector3(),frameHarbor=createHarborCamera()
 const publishNavigation=createNavigationPublisher(options.onNavigation)
 const frameTalk=createTalkCamera(),publishTalk=createTalkViewPublisher(options.onTalkView),playerCrown=new THREE.Vector3(),speakerCrown=new THREE.Vector3()
 const greetings=createIvanGreetings();let greetingSequence=0,lastEncounter=0,greetingUntil=0,ivanLine='',greetingVisible=false
 function greet(){ivanLine=greetings.next();greetingUntil=elapsed+10;greetingVisible=true;options.onGreeting?.({text:ivanLine,sequence:++greetingSequence});return ivanLine}
 function clearGreeting(){if(greetingVisible){greetingVisible=false;options.onGreeting?.(null)}}
 let input:MoveInput={x:0,forward:0,run:false},crouchBlend=0
 const actors:Record<string,typeof hero>={mira,sol}
 if(world)for(const resident of world.residents){if(actors[resident.id])continue;actors[resident.id]=actor(art.kit,resident.id,resident.scale,resident.phase)}
 else for(const resident of cityResidents)actors[resident.id]=createStreetCharacter(art.kit,true,{coat:resident.coat,hair:resident.hair,hairstyle:resident.hairstyle,glasses:resident.glasses,scale:resident.scale})
 function publish(force=false){const snapshot={...sim.snapshot(overview),...(world?{delivery:delivery.snapshot(),ferry:ferry.snapshot()}:{})},key=JSON.stringify(snapshot);if(force||key!==lastPublish){lastPublish=key;options.onState(snapshot)}}
 function publishRuntime(force=false){if(disposed)return;const value={sound:sound.status,quality:quality.snapshot()},key=JSON.stringify(value);Object.assign(canvas.dataset,{sound:value.sound,soundNodes:String(sound.nodeCount),measurement:value.quality.measurement});if(force||key!==lastRuntime){lastRuntime=key;options.onRuntime(value)}}
 function setZoom(value:number){tween?.kill();tween=undefined;tweenTime=0;if(reduced){rig.zoom=value;first=true;return}tween=gsap.to(rig,{zoom:value,duration:1.45,ease:'power3.inOut',paused:true})}
 function place(object:THREE.Object3D,p:MapPoint,yaw=0,lift=0,level?:number){if(level===undefined&&harborFootprint(p)){const local=harborLocalPoint(p)!,world=harborWorldPoint(local.x,local.z,lift);matrix.makeBasis(harborEast,harborUp,harborSouth);matrix.setPosition(world.x,world.y,world.z)}else matrix.copy(frameAt(p.x,p.z,(level??heightAt(p))+lift));object.position.setFromMatrixPosition(matrix);object.quaternion.setFromRotationMatrix(matrix);object.rotateY(yaw)}
 function posture(blend:number){if('posture' in hero){hero.posture(blend);return}const pelvis=hero.avatar.getObjectByName('pelvis')!,spine=hero.avatar.getObjectByName('spine_03')!,crouchHeight=ORIGINAL_POSE_METRICS.upperLeg*Math.cos(.8)+ORIGINAL_POSE_METRICS.lowerLeg*Math.cos(.6)+ORIGINAL_POSE_METRICS.ankleHeight;pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,crouchHeight,blend);spine.rotation.x=.23*blend;hero.head.rotation.x=-.17*blend;for(const side of ['l','r'])for(const [joint,angle] of [['thigh',-.8],['calf',1.4],['foot',-.6]] as const){const bone=hero.avatar.getObjectByName(joint+'_'+side)!;crouchRotation.setFromEuler(euler.set(angle,0,0));bone.quaternion.slerp(crouchRotation,blend)}}
 function render(time:number,force=false){
  if(!force)frame=0;if(disposed||!active&&!force)return
  const rawMs=force?0:Math.max(0,time-(previous||time-16)),viewDt=force?0:Math.min(.05,rawMs/1000),dt=photoActive?0:viewDt;previous=time;elapsed+=dt
  const restoringPhoto=photoPoseReset,weatherState=weather.update(v2?dt:0,weatherChoice,reduced)
  if(v2){landscape.setWeather(weatherState);architecture.setWeather(weatherState);sim.setEnvironment({rain:weatherState.rain,day})}
  let movement
  if(v2){const forward=new THREE.Vector3();camera.getWorldDirection(forward);movement={forward,right:new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0)}}
  if(world&&reduced&&!photoActive&&dt>0&&ferry.snapshot().phase==='sailing'){const arrival=ferry.skip();if(arrival)finishFerry(arrival)}
  if(world){const arrival=ferry.update(elapsed);if(arrival)finishFerry(arrival);const ride=ferry.snapshot();if(ride.phase==='sailing'){const t=ride.from==='harbor'?ride.easedProgress:1-ride.easedProgress,point=world.sampleFerry(t),ahead=world.sampleFerry(Math.max(0,Math.min(1,t+(ride.from==='harbor'?.003:-.003))));Object.assign(sim.body,point,{y:0,vy:0,speed:0});sim.halt();sim.body.yaw=Math.atan2(Math.sin((ahead.x-point.x)/RADIUS),Math.cos(point.z/RADIUS)*Math.tan(ahead.z/RADIUS)-Math.sin(point.z/RADIUS)*Math.cos((ahead.x-point.x)/RADIUS))}}
  sim.step(dt,ferry.snapshot().phase==='sailing'?{x:0,forward:0,run:false}:input,movement)
  if(v2&&!photoActive)for(const id of sim.discovered)if(!announcedDiscoveries.has(id)){announcedDiscoveries.add(id);options.onEvent?.(isSecret(id)?{type:'secret',id}:{type:'discover',id})}
  if(tween&&!reduced){tweenTime+=dt;tween.totalTime(tweenTime)}
  const player=sim.player(),inside=sim.inside,small=canvas.clientWidth<768,profile=qualityProfile(quality.snapshot().level,small)
  if(sim.ivan.encounters!==lastEncounter){lastEncounter=sim.ivan.encounters;if(inside==='home'&&!overview&&!(lastEngaged==='ivan'&&greetingVisible))greet()}
  if(inside!=='home'||!sim.ivan.stopped||elapsed>=greetingUntil&&lastEngaged!=='ivan')clearGreeting()
  const engagedTarget=lastEngaged?sim.target(lastEngaged):undefined,talking=!overview&&engagedTarget?.kind==='person'&&(engagedTarget.room??null)===inside,talkActor=talking&&engagedTarget?(inside?(engagedTarget.id==='ivan'?rooms.home.ivan:rooms[inside].host):actors[engagedTarget.id as keyof typeof actors]):undefined
  const viewForward=new THREE.Vector3();camera.getWorldDirection(viewForward)
  const mapEast=new THREE.Vector3(Math.cos(sim.body.x/RADIUS),-Math.sin(sim.body.x/RADIUS),0),mapUp=normalAt(sim.body.x,sim.body.z),mapSouth=new THREE.Vector3().crossVectors(mapEast,new THREE.Vector3(mapUp.x,mapUp.y,mapUp.z))
  publishNavigation(elapsed,{x:sim.body.x,z:sim.body.z,yaw:sim.body.yaw,inside,cameraYaw:Math.atan2(viewForward.dot(mapEast),viewForward.dot(mapSouth))},force)
  if(appliedQuality!==quality.snapshot().level)resize()
  if(player.speed>.1&&!walkNotified){walkNotified=true;options.onMove()}
  if(player.speed>.02&&overview)controller.explore()
  if(inside!==lastInside){first=true;lastInside=inside;lastSteps=0;lastLanding=0;hero.avatar.removeFromParent();(inside?rooms[inside].scene:outdoors).add(hero.avatar)}
  outdoors.visible=!inside;Object.entries(rooms).forEach(([id,room])=>{room.scene.visible=id===inside})
  if(inside){hero.avatar.position.set(player.x,player.y,player.z);hero.avatar.quaternion.setFromAxisAngle(worldUp,player.yaw);rooms[inside].update(dt,elapsed,reduced,inside!=='workshop'||sim.objects.lamp,lastEngaged,player,sim.workshop,sim.objects.catPatTime,sim.ivan)}else{
   place(hero.avatar,player,player.yaw,player.y,ferry.snapshot().phase==='sailing'?WATER+.03+FERRY_RIDER_OFFSET:undefined);
   if(ferryArt&&world){const ride=ferry.snapshot(),sailing=ride.phase==='sailing';ferryArt.root.visible=true;if(sailing)place(ferryArt.root,player,player.yaw,0,WATER+.03);else{const t=ride.to==='orchard'?1:0,point=world.sampleFerry(t),next=world.sampleFerry(t===0?.01:.99),yaw=Math.atan2(next.x-point.x,next.z-point.z);place(ferryArt.root,point,yaw,0,WATER+.03)}ferryArt.update(elapsed,reduced,sailing)}for(const actor of sim.walkers){const model=actors[actor.id]!;model.avatar.visible=!world||!overview&&world.distance(player,actor)<(quality.snapshot().level==='low'?24:36);if(model.avatar.visible){place(model.avatar,actor,actor.yaw);model.express(dt,reduced);model.motion.update(dt,{speed:actor.speed,y:0,vy:0,waving:(actor.greeting??0)>0,reduced})}}
   for(const animal of sim.animals){const model=animal.id==='patch'?patch:fox;place(model.avatar,animal,animal.yaw);if(animal.id==='patch')patch.update(dt,{...animal,id:'patch',mode:animal.stopped?'chatting':'walking',greeting:0,route:[],cursor:0,lap:0,rest:0,affection:sim.objects.affection,following:sim.objects.following,playing:sim.objects.playTime>0,reaction:2-sim.objects.playTime},reduced,elapsed);else fox.update(dt,elapsed,reduced,animal,sim.objects.fox)}
   ducks.forEach((duck,i)=>{const bird=sim.ducks[i]!;place(duck.avatar,bird,bird.yaw,0,WATER+.12);duck.update(dt,elapsed,reduced,bird)})
   landscape.setDucks(duckAvatars,sim.ducks)
   rabbits.forEach((rabbit,i)=>{const base=world?.wildlife.rabbits[i]??{x:-17-i*2,z:23+i},near=Math.hypot(player.x-base.x,player.z-base.z)<4,p={x:base.x+(reduced?0:Math.sin(elapsed*.3+i)*.5),z:base.z};place(rabbit.avatar,p,i+.5,near&&!reduced?Math.abs(Math.sin(elapsed*6))*.3:0);rabbit.update(dt,elapsed,reduced,undefined,near)})
  }
  const presentation=photoCharacterPresentation(player,{active:photoActive,pose:photoOptions.pose,reduced,restore:photoPoseReset,waving:elapsed<waveUntil,delta:dt,crouchBlend});hero.express(dt,reduced);hero.motion.update(dt,presentation.motion);crouchBlend=presentation.crouchBlend;posture(crouchBlend);photoPoseReset=false
  const landingPulse=reduced?0:Math.sin(player.landing*Math.PI);hero.avatar.scale.set(1+landingPulse*.04,1-landingPulse*.08,1+landingPulse*.04)
  if(!reduced&&!cutes){hero.avatar.getObjectByName('spine_03')!.rotation.x+=player.speed/5.2*.07+landingPulse*.05;hero.head.rotation.y=player.speed<.1?Math.sin(elapsed*.6)*.025:0}
  if(v2&&!photoActive&&dt>0&&player.y===0&&player.steps>lastSteps)options.onEvent?.({type:'footstep',position:{x:player.x,z:player.z},heading:player.yaw,foot:player.steps%2===0?'left':'right',inside,surface:inside?'wood':world?(world.surfaceAt(player)==='wood'?'wood':world.surfaceAt(player)==='sand'?'sand':'ground'):bridgeHeight(player)!==null||dockFootprint(player)||harborFootprint(player)?'wood':isFootprintSand(player)?'sand':'ground',time:elapsed})
  if(!photoActive&&player.steps>lastSteps){sound.play(inside||bridgeHeight(player)!==null||dockFootprint(player)||harborFootprint(player)?'wood-step':'grass-step',hero.avatar.position);if(dt>0&&!inside&&!overview&&player.y===0)footprints.stamp(player,player.yaw,player.steps%2===0,elapsed)}
  footprints.update(elapsed);footprints.mesh.visible=!inside&&!overview&&footprints.count>0
  duckFood.update(elapsed,reduced,sim.duckMode==='approaching'||sim.duckMode==='feeding');duckFood.mesh.visible=!inside&&!overview
  if(player.landing>lastLanding)sound.play('land',hero.avatar.position)
  lastSteps=player.steps;lastLanding=player.landing
  const wantedDay=daylight(elapsed,mode,reduced);if(!photoActive&&!restoringPhoto)day=force||reduced?wantedDay:THREE.MathUtils.lerp(day,wantedDay,1-Math.exp(-dt*2));const lightDay=photoActive&&photoOptions.light!=='current'?Number(photoOptions.light==='day'):day;sky.copy(nightSky).lerp(daySky,lightDay);if(v2)sky.lerp(overcastSky,weatherState.overcast*.35*lightDay);scene.background=sky;if(scene.fog)scene.fog.color.copy(sky)
  fill.intensity=THREE.MathUtils.lerp(.85,1.85,lightDay);sun.intensity=THREE.MathUtils.lerp(.45,3.1,lightDay);sun.color.set(lightDay>.5?0xffe6ba:0xa5c6ff);architecture.windows.forEach(w=>{w.visible=lightDay<.4});architecture.update(elapsed,reduced,sim.objects);city.update(lightDay);japan.update(lightDay);architecture.setDaylight(lightDay);harborDock.update(elapsed,reduced,lightDay,sim.objects.harborBell);cruise.update(elapsed,reduced,lightDay);expansion.update(elapsed,reduced,lightDay);lighthouse.update(elapsed,reduced,lightDay)
  if(v2){sun.intensity*=1-weatherState.overcast*.45;fill.intensity*=1-weatherState.overcast*.12}
  if(inside){up.set(0,1,0);fill.position.copy(up);target.set(player.x*.6,.85,player.z*.6);desired.set(target.x+(small?1.0:3.0),small?8.3:6.2,target.z+(small?12.5:8.4));if(inside==='workshop'&&lastEngaged==='notebook'){target.set(-.25,1.7,-2.2);desired.set(small?.6:2.2,small?5.5:4.8,small?7.3:5.2)}sun.target.position.set(0,0,0);sun.position.set(6,12,6);if(scene.fog instanceof THREE.Fog){scene.fog.near=30;scene.fog.far=100}}
  else{
   const normal=normalAt(player.x,player.z);up.set(normal.x,normal.y,normal.z);east.set(Math.cos(player.x/RADIUS),-Math.sin(player.x/RADIUS),0);south.crossVectors(east,up).normalize()
   const framing=followFraming(small,inCity(player)||inJapan(player)),home=buildings.find(building=>building.enter==='home')!,homeDistance=Math.hypot((player.x-home.x)*Math.cos(player.z/RADIUS),player.z-home.z),homeView=1-THREE.MathUtils.smoothstep(homeDistance,6,13)
   target.copy(hero.avatar.position).addScaledVector(up,1.1-crouchBlend*.2+homeView*1.8).addScaledVector(south,-framing.lookAhead);follow.copy(hero.avatar.position).addScaledVector(up,framing.height+homeView*2).addScaledVector(south,framing.back+homeView*5).addScaledVector(east,framing.side)
   const coast=coastalCrossing,coastGap=Math.hypot(Math.max(coast.endX-player.x,0,player.x-coast.startX)*Math.cos(coast.z/RADIUS),player.z-coast.z),coastView=1-THREE.MathUtils.smoothstep(coastGap,3,9)
   if(coastView>0){follow.lerp(hero.avatar.position.clone().addScaledVector(up,11).addScaledVector(south,-14).addScaledVector(east,3),coastView);target.lerp(hero.avatar.position.clone().addScaledVector(up,1.4).addScaledVector(east,small?-1:-4),coastView)}
   const lightGap=Math.hypot((player.x-lighthouseSpec.x)*Math.cos(player.z/RADIUS),player.z-lighthouseSpec.z),lightView=1-THREE.MathUtils.smoothstep(lightGap,5,12)
   if(lightView>0){follow.lerp(hero.avatar.position.clone().addScaledVector(up,10.5).addScaledVector(south,small?19:17).addScaledVector(east,small?.4:1.2),lightView);target.addScaledVector(up,lightView*1.5)}
   if(harborFootprint(player,2)){up.copy(harborUp);east.copy(harborEast);south.copy(harborSouth);cruise.root.localToWorld(harborFocus.set(0,2,0));frameHarbor(hero.avatar.position,harborFocus,small||camera.aspect<1,follow,target)}
   if(!v2&&rig.zoom>.8)clearCamera(target,follow,hero.avatar.position,up)
   const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect),distance=RADIUS/Math.sin(Math.min(vertical,horizontal)/2)*1.3
   globeOverview(orbit.x,orbit.y,distance,desired,overviewUp)
   desired.lerp(follow,rig.zoom);target.multiplyScalar(rig.zoom);up.lerp(overviewUp,1-rig.zoom).normalize()
   landscape.update(elapsed,reduced,hero.avatar.position,rig.zoom<.18,profile.grass,profile.grassFar);nature.update(elapsed,reduced,profile.butterflies,lightDay)
   sun.target.position.copy(hero.avatar.position);sun.position.copy(hero.avatar.position).addScaledVector(up,30).addScaledVector(east,-18).addScaledVector(south,10);fill.position.copy(up)
   if(rig.zoom<.2){sun.target.position.set(0,0,0);sun.position.copy(desired).normalize().multiplyScalar(90);fill.position.copy(desired).normalize()}
   if(scene.fog instanceof THREE.Fog){scene.fog.near=THREE.MathUtils.lerp(distance+RADIUS*.8,36,rig.zoom);scene.fog.far=THREE.MathUtils.lerp(distance+RADIUS*3,140,rig.zoom)}
  }
  const groundUp=inside?new THREE.Vector3(0,1,0):harborFootprint(player)?harborUp.clone():new THREE.Vector3().copy(normalAt(player.x,player.z))
  let directedSettled=true
  if(v2&&!inside){
   const pose=director.update(viewDt,{point:player,position:hero.avatar.position,overview,small,aspect:camera.aspect,fov:camera.fov,calm:reduced||!active})
   desired.copy(pose.position);target.copy(pose.target);up.copy(pose.up);directedSettled=pose.settled
   if(!overview){clearCamera(target,desired,hero.avatar.position,groundUp)}
  }
  if(v2&&inside&&(interiorOrbit.yaw||interiorOrbit.pitch||interiorOrbit.zoom!==1)){
   const offset=desired.clone().sub(target).applyAxisAngle(worldUp,interiorOrbit.yaw).multiplyScalar(interiorOrbit.zoom);offset.y=Math.max(3,offset.y+interiorOrbit.pitch*7);desired.copy(target).add(offset)
  }
  if(talkActor){frameTalk(hero.avatar.position,talkActor.avatar.position,groundUp,small,desired,target,!!inside)}
  if(v2&&inside)clearInterior(inside,desired,target,hero.avatar.position,{fov:camera.fov,aspect:camera.aspect})
  if(v2||first||reduced){camera.position.copy(desired);look.copy(target);camera.up.copy(up);first=false}else{const k=1-Math.exp(-dt*8);camera.position.lerp(desired,k);look.lerp(target,k);camera.up.lerp(up,k).normalize()}camera.lookAt(look);camera.updateMatrixWorld()
  if(world&&districtAssets){districtView.copy(camera.position).normalize();const facing=(point:MapPoint)=>{const n=normalAt(point.x,point.z);return n.x*districtView.x+n.y*districtView.y+n.z*districtView.z>.04};for(const {root,lot} of districtRoots)root.visible=overview?facing(lot):world.distance(player,lot)<(quality.snapshot().level==='low'?30:43);if(districtLive)for(const district of world.districts)if(overview?facing(district.anchor):world.distance(player,district.anchor)<36)void districtAssets.ensure(district.id).catch(()=>{});canvas.dataset.districtAssets=world.districts.map(district=>`${district.id}:${districtAssets.status(district.id)}`).join(',')}
  weatherArt?.update(weatherState,hero.avatar.position,groundUp,small,quality.snapshot().level,!!inside,overview,lightDay)
  if(v2&&progress&&!photoActive&&(force||elapsed-lastGuide>=.1)){
   lastGuide=elapsed;currentGuidance=guide.update(progress,{...player,inside},id=>sim.target(id));const key=JSON.stringify(currentGuidance)
   if(key!==lastGuideKey){lastGuideKey=key;options.onGuidance?.(currentGuidance)}
  }
  guideFirefly?.update(photoActive||overview||lastEngaged?null:currentGuidance,elapsed,reduced,canvas.height)
  const speechActor=talkActor??(!lastEngaged&&inside==='home'&&greetingVisible?rooms.home.ivan:undefined)
  if(speechActor){hero.head.getWorldPosition(playerCrown).addScaledVector(groundUp,currentHat==='everyday'?.65:1.34);speechActor.head.getWorldPosition(speakerCrown).addScaledVector(groundUp,.65*speechActor.avatar.scale.y);publishTalk.update(elapsed,camera,playerCrown,speakerCrown,force)}else publishTalk.clear()
  const talkId=talkActor?engagedTarget!.id:'';if(canvas.dataset.talkingTo!==talkId)canvas.dataset.talkingTo=talkId
  const faded=occlusion.update(camera,hero.avatar.position,groundUp,viewDt,!inside&&!overview&&(v2||rig.zoom>.8),reduced||force);canvas.dataset.occludedObjects=faded.join(',')
  fireflies.visible=lightDay<.45&&!inside;flyMaterial.opacity=(1-lightDay)*.8;for(let i=0;i<flyOrigins.length;i++){const origin=flyOrigins[i]!;flyPositions[i*3]=origin.x+(reduced?0:Math.sin(elapsed*.7+i)*.25);flyPositions[i*3+1]=origin.y+(reduced?0:Math.cos(elapsed*.6+i)*.22);flyPositions[i*3+2]=origin.z}fireflyGeometry.attributes.position!.needsUpdate=true
  camera.getWorldDirection(audioDirection);sound.update(elapsed,!!inside,overview,{position:camera.position,forward:audioDirection,up:camera.up})
  const settled=directedSettled&&camera.position.distanceToSquared(desired)<.01&&(!tween||tween.progress()>=1),fps=pendingCapture||quality.snapshot().measurement==='running'||player.speed>.02||player.y>0||!settled?60:30
  if(!photoActive)quality.observe(rawMs,settled&&!overview&&!inside&&!lastEngaged);publish();publishRuntime()
  if(force||time-lastRender>=1000/fps-1){const renderStart=performance.now(),interval=lastRender?time-lastRender:0;try{renderer.render(scene,camera)}catch{controller.dispose();options.onFailure();return}const renderMs=performance.now()-renderStart;if(pendingCapture&&photoActive)finishCapture();if(!photoActive)quality.record(time,interval,{renderMs,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,grass:landscape.grass.count,dpr:renderer.getPixelRatio(),width:canvas.clientWidth,height:canvas.clientHeight,zone:inside??(overview?'globe':'meadow')});lastRender=time;Object.assign(canvas.dataset,{scene:world?'archipelago':'new-globe',world:world?'archipelago':'legacy',characterFamily:cutes?'cutes':'original',controls:v2?'v2':'legacy',weather:weatherState.kind,rain:weatherState.rain.toFixed(3),weatherTime:weatherState.time.toFixed(3),photo:String(photoActive),returnedWave:String(sim.objects.playTime>0),residentActivity:sim.residentActivity('mira'),lighthouseModel:'CG ART Creation',cityModelBuildings:String(buildings.filter(building=>building.cityModel).length),cityBuildings:String(buildings.filter(building=>building.style==='city').length),japaneseBuildings:String(buildings.filter(building=>building.style==='japanese').length),japaneseModelBuildings:String(buildings.filter(building=>building.style==='japanese'&&building.cityModel).length),cliffTriangles:String(cityCliffs.triangles),quality:quality.snapshot().level,measurement:quality.snapshot().measurement,sound:sound.status,soundNodes:String(sound.nodeCount),workshopStage:String(sim.workshop.stage),completedTasks:String(sim.workshop.checked.filter(Boolean).length),view:inside??(overview?'globe':'explore'),inside:inside??'',cameraSettled:String(settled),frames:String(Number(canvas.dataset.frames??0)+1),playerX:player.x.toFixed(3),playerZ:player.z.toFixed(3),playerY:player.y.toFixed(3),crouched:String(player.crouched),speed:player.speed.toFixed(2),grassBlades:String(landscape.grass.count),sandFootprints:String(footprints.count),duckMode:sim.duckMode,duckFoodCount:String(duckFood.mesh.geometry.drawRange.count),animals:'8',villagers:String(targets.filter(target=>target.kind==='person').length),ivanX:sim.ivan.x.toFixed(3),ivanZ:sim.ivan.z.toFixed(3),ivanMode:sim.ivan.mode,ivanGreeting:String(greetingSequence),daylight:day.toFixed(3),lightMode:mode,hat:currentHat,drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),geometries:String(renderer.info.memory.geometries),textures:String(renderer.info.memory.textures)})}
  if(!force)frame=requestAnimationFrame(render)
 }
 let lastEngaged:string|null=null,currentHat='everyday'
 function finishFerry(arrival:FerryArrival){const id=`ferry-${arrival.to}`;sim.visit(id);sim.halt();lastEngaged=null;sim.setEngaged(null);if(ferryArt)ferryArt.root.visible=false;first=true;options.onEvent?.({type:'discover',id})}
 function start(){if(active&&!disposed&&!frame)frame=requestAnimationFrame(render)}
 function redraw(){publish(true);if(!active)render(performance.now(),true)}
 function cancelCapture(){captureAbort?.abort();captureAbort=null;if(pendingCapture){pendingCapture.abort.abort();pendingCapture.reject(new DOMException('Photo cancelled.','AbortError'));pendingCapture=null}}
 function finishCapture(){
  const request=pendingCapture;if(!request||!photoActive)return;pendingCapture=null;captureAbort=request.abort
  const caption=sim.inside?roomLabels[sim.inside]:sim.target(sim.nearest()??'')?.name??'Ivan’s little world'
  void capturePostcard(canvas,{...photoOptions},caption,canvas.clientWidth<768,request.abort.signal).then(request.resolve,request.reject).finally(()=>{if(captureAbort===request.abort)captureAbort=null})
 }
 function resize(){
  if(disposed||!canvas.clientWidth||!canvas.clientHeight)return
  const small=canvas.clientWidth<768,profile=qualityProfile(quality.snapshot().level,small),aspect=canvas.clientWidth/canvas.clientHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,profile.dpr));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false)
  if(sun.shadow.mapSize.width!==profile.shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(profile.shadow,profile.shadow);renderer.shadowMap.needsUpdate=true}
  first=first||Math.abs(camera.aspect-aspect)>.001;camera.aspect=aspect;camera.fov=followFraming(small).fov;camera.updateProjectionMatrix();appliedQuality=quality.snapshot().level
  if(!active)render(performance.now(),true)
 }
 const observer=new ResizeObserver(resize);observer.observe(canvas)
 function failure(event:Event){event.preventDefault();controller.dispose();options.onFailure()}canvas.addEventListener('webglcontextlost',failure)
 const controller:GlobeController={
  setInput(value){if(!photoActive&&ferry.snapshot().phase!=='sailing')input=value},
  setCrouch(value){if(!photoActive&&ferry.snapshot().phase!=='sailing')sim.crouch(value);redraw()},
  setEngaged(id){lastEngaged=id;sim.setEngaged(id);if(id==='ivan'&&!greetingVisible)greet()},
  setActive(value){active=value;previous=0;sound.setActive(value&&!photoActive);if(value)start();else{cancelAnimationFrame(frame);frame=0;input={x:0,forward:0,run:false};sim.halt();quality.interrupt();publishRuntime()}},
  setReduced(value){reduced=value;sim.setReduced(value);if(value&&tween){tween.progress(1);tween.kill();tween=undefined}redraw()},
  setHat(value){currentHat=value;hero.hats.set(value);redraw()},
  setTimeMode(value){mode=value;redraw()},
  halt(){input={x:0,forward:0,run:false};sim.halt();if(v2)director.halt(true)},
  async setSound(value){const result=await sound.enable(value);if(photoActive)sound.setActive(false);publishRuntime(true);return result},
  setQuality(value){quality.choose(value);resize();publishRuntime(true)},
  measure(){if(photoActive)return;quality.start(performance.now());publishRuntime(true)},
  explore(){if(overview){if(!hasExplored){first=true;hasExplored=true;if(world)director.recenter(sim.body.yaw)}overview=false;setZoom(1);publish(true)}},
  overview(){const arrival=ferry.skip();if(arrival)finishFerry(arrival);if(sim.inside)sim.leave();alignGlobeOverview(sim.body,orbit);overview=true;setZoom(0);publish(true)},
  orbit(x,y){if(v2){if(sim.inside){interiorOrbit.yaw=THREE.MathUtils.clamp(interiorOrbit.yaw+x,-.8,.8);interiorOrbit.pitch=THREE.MathUtils.clamp(interiorOrbit.pitch+y,-.3,.5)}else director.orbit(x,y);redraw()}else if(overview){orbit.x+=x;orbit.y=THREE.MathUtils.clamp(orbit.y+y,-.4,.6)}},
  zoom(value){if(!v2)return;if(sim.inside)interiorOrbit.zoom=THREE.MathUtils.clamp(interiorOrbit.zoom*Math.exp(value),.8,1.5);else director.zoom(value);redraw()},
  recenter(){if(sim.inside){interiorOrbit.yaw=interiorOrbit.pitch=0;interiorOrbit.zoom=1}else if(overview)director.align(sim.body);else director.recenter(sim.player().yaw);redraw()},
  setWeather(value){weatherChoice=value;redraw()},
  setProgress(value){progress=value;delivery.restore(value.activities.includes('delivery-complete'));lastGuide=-Infinity;if(!value.trackedTrail){currentGuidance=null;lastGuideKey='';options.onGuidance?.(null)}},
  setPhoto(value){if(photoActive===value)return;if(value){director.halt();photoCamera=director.snapshot();photoInterior={...interiorOrbit}}else{if(photoCamera)director.restore(photoCamera);if(photoInterior)Object.assign(interiorOrbit,photoInterior);photoCamera=photoInterior=null;photoPoseReset=true}photoActive=value;input={x:0,forward:0,run:false};sim.halt();quality.interrupt();previous=0;sound.setActive(active&&!value);if(!value)cancelCapture();publish(true);render(performance.now(),true);start()},
  setPhotoOptions(value){photoOptions={...value};redraw()},
  capturePhoto(){if(!photoActive||disposed)return Promise.reject(new Error('Open photo mode first.'));if(pendingCapture||captureAbort)return Promise.reject(new Error('A postcard is already being saved.'));return new Promise((resolve,reject)=>{pendingCapture={resolve,reject,abort:new AbortController()};lastRender=0;start()})},
  visit(id){if(ferry.snapshot().phase==='sailing')return;sim.visit(id);if(v2)director.align(sim.body);hasExplored=true;overview=false;setZoom(1);first=true;lastSteps=0;lastLanding=0;redraw()},
  interact(){
   if(photoActive||ferry.snapshot().phase==='sailing')return;if(overview){controller.explore();return}
   const id=sim.nearest(),target=id&&sim.target(id);if(!target)return
   if(v2)options.onEvent?.({type:'interaction',id:target.id,action:target.kind==='door'?'enter':target.kind==='exit'?'leave':'open',room:sim.inside,time:elapsed});if(target.kind!=='exit')sim.discovered.add(target.id)
   if(target.kind==='door'){sim.enter(target.interior!,target.entry);interiorOrbit.yaw=interiorOrbit.pitch=0;interiorOrbit.zoom=1;first=true;redraw()}
   else if(target.kind==='exit')controller.leave()
   else{sim.setEngaged(target.id);options.onInteract(target.id);redraw()}
  },
  leave(){sim.leave();first=true;redraw()},
  jump(){if(photoActive||ferry.snapshot().phase==='sailing')return;controller.explore();sim.jump()},
  wave(){if(photoActive||ferry.snapshot().phase==='sailing')return;waveUntil=elapsed+1.8;if(v2&&sim.wave())options.onEvent?.({type:'activity',id:'return-wave'});redraw()},
  action(id,action){
   if(photoActive)return{message:'Return to exploring to interact.'}
   if(world&&id.startsWith('ferry-')){
    if(action==='skip'){const arrival=ferry.skip();if(arrival)finishFerry(arrival);redraw();return{message:arrival?'Back on dry land. Enjoy the neighborhood.':'The ferry is at the landing.'}}
    const stop=sim.target(id),player=sim.player();if(action!=='board'||sim.inside||!stop||world.distance(player,stop)>stop.radius||ferry.snapshot().phase==='sailing')return{message:'Come over to the ferry landing to hop aboard.'}
    input={x:0,forward:0,run:false};sim.halt();sim.setEngaged(null);lastEngaged=null;const arrival=ferry.board(id==='ferry-harbor'?'harbor':'orchard',elapsed,{reduced});if(arrival)finishFerry(arrival);redraw();return{message:arrival?'Welcome to the other side.':'All aboard. Enjoy the crossing, or skip whenever you like.'}
   }
   if(world&&id.startsWith('delivery-')){const stop=sim.target(id),player=sim.player(),gap=sim.inside?stop?Math.hypot(player.x-stop.x,player.z-stop.z):Infinity:stop?world.distance(player,stop):Infinity;if(!stop||(stop.room??null)!==sim.inside||gap>stop.radius)return{message:'Come a little closer to the parcel stop.'};const result=delivery.act(id,action);for(const event of result.events)options.onEvent?.(event);redraw();return{message:result.message}}
   if(v2)options.onEvent?.({type:'interaction',id,action,room:sim.inside,time:elapsed})
   const oldStage=sim.workshop.stage,wasComplete=sim.workshop.checked.every(Boolean),outcome=sim.action(id,action),where=sim.target(id)
   if(where){if(where.room)soundPoint.set(where.x,1.4,where.z);else soundPoint.setFromMatrixPosition(frameAt(where.x,where.z));if(id==='bell'||id==='harbor')sound.play('bell',soundPoint);else if(['patch','miso','fox'].includes(id))sound.play('pet',soundPoint);else if(id==='notebook'&&(sim.workshop.stage>oldStage||!wasComplete&&sim.workshop.checked.every(Boolean)))sound.play('success',soundPoint)}
   if(id==='duck-pond'){foodFrom.setFromMatrixPosition(frameAt(sim.body.x,sim.body.z,heightAt(sim.body)+.9));soundPoint.setFromMatrixPosition(frameAt(feedingPoint.x,feedingPoint.z,WATER+.04));duckFood.feed(foodFrom,soundPoint,elapsed,reduced)}
   if(v2){
    if(id==='duck-pond'&&action==='feed')options.onEvent?.({type:'activity',id:'feed-ducks'})
    if(id==='campfire'&&sim.objects.campfire)options.onEvent?.({type:'activity',id:'light-campfire'})
    if(id==='notebook'&&!wasComplete&&sim.workshop.stage===3&&sim.workshop.checked.every(Boolean))options.onEvent?.({type:'activity',id:'workshop-complete'})
   }
   redraw();return outcome
  },
  reset(){cancelCapture();photoActive=false;ferry.reset();delivery.reset();sim.reset();weather.reset();weatherChoice='auto';director.align(sim.body);guide.reset();progress=null;currentGuidance=null;lastGuideKey='';lastGuide=-Infinity;announcedDiscoveries.clear();options.onGuidance?.(null);greetings.reset();lastEncounter=0;ivanLine='';clearGreeting();footprints.clear();duckFood.clear();lastSteps=0;lastLanding=0;walkNotified=false;hasExplored=false;orbit.x=orbit.y=0;lastEngaged=null;overview=true;rig.zoom=0;tween?.kill();tween=undefined;first=true;redraw()},
  dispose(){if(disposed)return;disposed=true;cancelCapture();clearGreeting();publishTalk.clear();sound.dispose();occlusion.dispose();lighthouse.dispose();weatherArt?.dispose();guideFirefly?.dispose();cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('webglcontextlost',failure);tween?.kill();hero.dispose();Object.values(actors).forEach(actor=>actor.dispose());Object.values(rooms).forEach(room=>room.dispose());fireflyGeometry.dispose();flyMaterial.dispose();art.dispose();districtAssets?.dispose();cutes?.dispose();kaykit?.dispose();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss()},
 }
 partialCleanup.splice(0,partialCleanup.length,()=>controller.dispose())
 resize();sim.setReduced(reduced);publish(true);publishRuntime(true)
 await checkpoint('shaders')
 await renderer.compileAsync(scene,camera)
 signal.throwIfAborted()
 render(performance.now(),true)
 if(disposed)throw new Error('The first world frame could not be rendered.')
 options.onLoad?.(worldLoadState('ready'));districtLive=true;start();partialCleanup.length=0;return controller
 }catch(error){for(const dispose of partialCleanup.reverse())dispose();throw error}
}
