import {buildSecretArt} from './secret-art.ts'
import * as THREE from 'three'
import {createGlobeArt} from './art-kit.ts'
import {createStreetCharacter} from '../street/character.ts'
import type {CutesCharacter} from '../archipelago/cutes-character.ts'
import type {ArtKit} from '../explorer/art-kit.ts'
import type {StreetCharacterLook} from '../street/character.ts'
import {createPetArt} from '../explorer/pet-art.ts'
import {pets} from '../explorer/world-data.ts'
import type {RoomId,Player} from './types.ts'
import {createWorkbench} from './workbench-art.ts'
import type {WorkshopState} from './workshop.ts'
import {createIvanCharacter} from './ivan-character.ts'
import type {WorkshopResidentState} from './workshop-resident.ts'
import {buildHomeRoomShell} from './home-art.ts'
import {isHomeRoom} from './home-layout.ts'
import {buildCityRoomFurniture} from './city-room-art.ts'
import {cityRoomHosts,isCityRoom} from './city-room-layout.ts'
import type {CityRoomId} from './city-room-layout.ts'
import {roomLabels} from './rooms.ts'

const cityLooks:Record<CityRoomId,StreetCharacterLook>={
 cafe:{coat:'coral',hair:'wood',hairstyle:'curls',scale:.9},
 bookshop:{coat:'green',hair:'navy',hairstyle:'bun',glasses:true,scale:.98},
 arcade:{coat:'violet',hair:'navy',hairstyle:'bob',glasses:true,scale:.88},
 ceramics:{coat:'pale',hair:'wood',hairstyle:'curls',scale:.95},
}

/** Navigable rooms, built separately from the outdoor globe. */
export interface InteriorCast {create:(kit:ArtKit,id:string)=>CutesCharacter}
export function createInterior(id:RoomId,cast?:InteriorCast){
 const homeRoom=isHomeRoom(id),cityRoom=isCityRoom(id)
 if(!homeRoom&&!cityRoom&&id!=='workshop'&&id!=='library')throw new Error(`This room has its own scene factory: ${id}`)
 const scene=new THREE.Scene(),art=createGlobeArt(scene),{kit,block,mesh,sign}=art
 if(homeRoom)buildHomeRoomShell(art,id)
 else{
 block('wood',[0,-.13,0],[8.4,.26,8.4]);block('cream',[0,1.55,-4.05],[8.4,3.1,.20]);block('cream',[-4.1,1.55,0],[.20,3.1,8.4]);block('cream',[4.1,1.55,0],[.20,3.1,8.4])
 for(let i=0;i<13;i++)block('sand',[-3.9+i*.65,.013,0],[.025,.018,8.0])
 block(id==='library'||id==='arcade'?'violet':id==='cafe'?'coral':id==='bookshop'?'mint':id==='ceramics'?'pale':'blue',[0,.03,.5],[4.4,.04,4.6]);block('cream',[0,.055,.5],[3.9,.014,4.1])
 for(const x of [-2.3,2.3]){block('wood',[x,1.9,-3.88],[1.8,1.6,.12]);block('pale',[x,1.9,-3.79],[1.55,1.37,.05]);block('cream',[x,1.9,-3.72],[.06,1.4,.05]);block('cream',[x,1.9,-3.72],[1.55,.06,.05])}
 block('blue',[0,.04,3.95],[1.7,.06,.6]);sign(roomLabels[id],[0,2.8,-3.89],2.9,scene)
 }
 const lampGroup=new THREE.Group();lampGroup.position.set(id==='home'?-1.8:id==='cafe'?1.15:2.5,id==='bookshop'?2.2:1.1,id==='bookshop'?-3.1:-2.5);scene.add(lampGroup)
 mesh(kit.cylinder,'gold',[0,.07,0],[.22,.14,.22],lampGroup);mesh(kit.cylinder,'wood',[0,.40,0],[.045,.65,.045],lampGroup);mesh(kit.cone,'gold',[0,.74,0],[.36,.45,.36],lampGroup)
 const lamp=new THREE.PointLight(0xffd697,10,7,2);lamp.position.set(0,.6,0);lampGroup.add(lamp)
 if(id==='workshop'){
  block('wood',[0,1.03,-2.75],[5.4,.20,1.45]);for(const x of [-2.2,2.2])for(const z of [-3.2,-2.3])block('blue',[x,.48,z],[.15,.96,.15])
  block('blue',[-1.1,1.5,-2.86],[1.6,.95,.16]);block('navy',[-1.1,1.5,-2.76],[1.4,.77,.03]);block('gold',[-1.1,1.18,-2.48],[.6,.10,.35])
  block('cream',[.45,1.18,-2.45],[.85,.09,.65]);block('coral',[.45,1.235,-2.45],[.76,.018,.56]);sign('Ideas → products',[0,2.3,-3.87],2.5,scene)
  block('mint',[-2.8,.55,1.7],[1.5,1.0,1.5]);block('cream',[-2.8,.95,1.7],[1.4,.14,1.4])
 }else if(id==='library'){
  for(const x of [-2.7,0,2.7]){block('wood',[x,1.1,-3.0],[2.2,2.2,.55]);for(const y of [.28,.87,1.45,2.03])block('sand',[x,y,-2.66],[2.15,.085,.65]);for(let i=0;i<15;i++){const xx=x-.85+(i%5)*.38,yy=.57+Math.floor(i/5)*.58;block(i%4===0?'blue':i%4===1?'coral':i%4===2?'mint':'violet',[xx,yy,-2.62],[.27,.47,.38])}}
  block('violet',[-2.7,.55,1.5],[1.6,1.1,1.4]);block('cream',[-2.7,1.05,1.5],[1.5,.15,1.3]);block('wood',[1.4,.6,1.2],[1.8,.16,1.3]);mesh(kit.cylinder,'wood',[1.4,.30,1.2],[.12,.6,.12]);block('cream',[1.4,.72,1.2],[.75,.08,.55])
 }else if(cityRoom)buildCityRoomFurniture(art,id)
 if(!homeRoom)for(const x of [-3.4,3.4]){mesh(kit.cylinder,'coral',[x,.28,2.5],[.35,.56,.35]);for(let i=0;i<4;i++){const leaf=mesh(kit.sphere,'green',[x+Math.sin(i*2.4)*.17,.85,2.5],[.13,.55,.14]);leaf.rotation.z=Math.sin(i*2.4)*.4}}
 const workbench=id==='workshop'?createWorkbench(art):undefined
 buildSecretArt(art,id);art.finish()
 const hostData=homeRoom?undefined:id==='workshop'?{id:'theo',name:'Theo',x:-1.7,z:-1.4}:cityRoom?cityRoomHosts[id]:{id:'rue',name:'Rue',x:1.5,z:-1.7}
 const look:StreetCharacterLook=cityRoom?cityLooks[id]:{coat:id==='workshop'?'gold':'violet',hair:id==='workshop'?'wood':'navy',hairstyle:id==='workshop'?'crop':'bob',scale:id==='workshop'?1.02:.88,glasses:id==='library'}
 const host=hostData?(cast?.create(kit,hostData.id)??createStreetCharacter(kit,true,look)):undefined;if(host&&hostData){host.avatar.position.set(hostData.x,0,hostData.z);host.avatar.name=hostData.name}
 const ivan=id==='home'?(cast?.create(kit,'ivan')??createIvanCharacter(kit)):undefined
 const cat=id==='library'?createPetArt(kit,pets[1]!):undefined;if(cat){cat.avatar.position.set(-2.7,1.13,1.5);cat.avatar.scale.setScalar(.60)}
 let wasNear=false,greeting=0
 return{scene,art,host,ivan,cat,update(dt:number,time:number,reduced:boolean,lampOn:boolean,engaged:string|null,player:Player,workshop:WorkshopState,catPatTime:number,resident:WorkshopResidentState){if(host){const near=Math.hypot(player.x-host.avatar.position.x,player.z-host.avatar.position.z)<(wasNear?4:3);if(near&&!wasNear)greeting=1.8;wasNear=near;greeting=Math.max(0,greeting-dt);if(engaged===hostData?.id){const yaw=Math.atan2(player.x-host.avatar.position.x,player.z-host.avatar.position.z);host.avatar.rotation.y=reduced?yaw:host.avatar.rotation.y+Math.atan2(Math.sin(yaw-host.avatar.rotation.y),Math.cos(yaw-host.avatar.rotation.y))*(1-Math.exp(-dt*12))}host.express(dt,reduced);host.motion.update(dt,{speed:0,y:0,vy:0,waving:greeting>0,reduced})}workbench?.update(dt,time,reduced,workshop);if(ivan){ivan.avatar.position.set(resident.x,0,resident.z);ivan.avatar.rotation.y=resident.yaw;ivan.express(dt,reduced);ivan.motion.update(dt,{speed:resident.speed,y:0,vy:0,waving:resident.greeting>0,reduced})}if(cat)cat.update(dt,{id:'miso',x:-2.7,z:1.5,yaw:0,speed:0,mode:engaged==='miso'?'chatting':'resting',greeting:0,route:[],cursor:0,lap:0,rest:0,affection:0,following:false,playing:false,reaction:catPatTime},reduced,time);lamp.intensity=lampOn?10:0},dispose(){host?.dispose();ivan?.dispose();art.dispose()}}
}
