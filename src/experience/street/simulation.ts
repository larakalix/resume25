import { groundY, keepOnStreet, roadCenter, streetDistance, streetSpawn, streetTargets } from './level.ts'
import type { ExplorerBody, MoveInput, PetAction, PetState, Point2, WorldTargetId } from '../explorer/types.ts'
import type { PetWalker, Walker } from '../explorer/population.ts'

export function createStreetSimulation(collide:(point:Point2,previous:Point2)=>void=()=>{}){
    const body:ExplorerBody={...streetSpawn,y:0,vy:0,yaw:.22,speed:0}
    const mira:Walker={id:'mira',x:1.3,z:-2.5,yaw:Math.PI,speed:0,mode:'resting',greeting:0,route:[],cursor:0,lap:0,rest:2}
    const pet:PetWalker={id:'patch',x:-1.1,z:6.6,yaw:Math.PI,speed:0,mode:'resting',greeting:0,route:[],cursor:0,lap:0,rest:0,affection:0,following:false,playing:false,reaction:0}
    let reduced=false,engaged:WorldTargetId|null=null,elapsed=0,visited:WorldTargetId|null=null
    const initialMira={...mira},initialPet={...pet}
    function turn(actor:{yaw:number},x:number,z:number,dt:number){if(Math.hypot(x,z)<.001)return;const target=Math.atan2(x,z);actor.yaw+=Math.atan2(Math.sin(target-actor.yaw),Math.cos(target-actor.yaw))*(reduced?1:1-Math.exp(-dt*10))}
    function walk(actor:Walker,goal:Point2,speed:number,dt:number){const previous={x:actor.x,z:actor.z};const dx=goal.x-actor.x,dz=goal.z-actor.z,distance=Math.hypot(dx,dz),step=Math.min(distance,speed*dt);if(distance>.01){actor.x+=dx/distance*step;actor.z+=dz/distance*step;turn(actor,dx,dz,dt)}keepOnStreet(actor);collide(actor,previous);actor.speed=dt?streetDistance(actor,previous)/dt:0}
    function target(id:WorldTargetId){const source=streetTargets.find(t=>t.id===id);if(!source)return;const actor=id==='mira'?mira:id==='patch'?pet:undefined;return actor?{...source,x:actor.x,z:actor.z,arrival:keepOnStreet({x:actor.x-.7,z:actor.z+1.8})}:source}
    return {body,mira,pet,target,
        setReduced(value:boolean){reduced=value},setConversation(value:WorldTargetId|null){engaged=value},
        interactPet(_id:'patch'|'miso',action:PetAction):PetState{if(action==='follow')pet.following=!pet.following;else{pet.reaction=action==='play'?2.4:1.5;pet.playing=action==='play';if(action==='pet')pet.affection++}return{affection:pet.affection,following:pet.following,playing:pet.playing}},
        visit(id:WorldTargetId){const destination=target(id);if(destination){Object.assign(body,{...destination.arrival,y:0,vy:0,speed:0,yaw:Math.PI});visited=id}},
        nearest(){const chosen=visited&&target(visited);if(chosen&&streetDistance(body,chosen)<chosen.radius)return chosen.id;visited=null;return streetTargets.map(t=>target(t.id)!).map(t=>({id:t.id,score:streetDistance(body,t)/t.radius})).filter(t=>t.score<1).sort((a,b)=>a.score-b.score)[0]?.id??null},
        jump(){if(body.y<.001)body.vy=5.4},
        step(delta:number,input:MoveInput){
            const dt=Number.isFinite(delta)?Math.min(.05,Math.max(0,delta)):0;if(!dt)return;elapsed+=dt
            const ix=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,iz=Number.isFinite(input.forward)?Math.max(-1,Math.min(1,input.forward)):0,length=Math.max(1,Math.hypot(ix,iz)),speed=input.run?4.2:2.4,previous={x:body.x,z:body.z}
            body.x+=ix/length*speed*dt;body.z-=iz/length*speed*dt;keepOnStreet(body);collide(body,previous)
            for(const actor of [mira,pet]){const distance=streetDistance(body,actor),radius=actor===mira?.53:.44;if(distance<radius){const dx=body.x-actor.x,dz=body.z-actor.z;body.x=actor.x+(distance?dx/distance:1)*radius;body.z=actor.z+(distance?dz/distance:0)*radius}}
            body.speed=streetDistance(body,previous)/dt;if(body.speed>.02)turn(body,body.x-previous.x,body.z-previous.z,dt)
            if(body.y>0||body.vy>0){body.vy-=dt*16;body.y=Math.max(0,body.y+body.vy*dt);if(!body.y)body.vy=0}
            const near=streetDistance(body,mira)<(mira.mode==='chatting'?3.7:2.6)||engaged==='mira'
            if(near){if(mira.mode!=='chatting')mira.greeting=1.8;mira.mode='chatting';mira.speed=0;turn(mira,body.x-mira.x,body.z-mira.z,dt)}
            else if(!reduced){mira.mode='walking';const z=-.5+Math.sin(elapsed*.13)*2.2;walk(mira,{x:roadCenter(z)+.55,z},.65,dt)}else mira.speed=0
            mira.greeting=Math.max(0,mira.greeting-dt);pet.reaction=Math.max(0,pet.reaction-dt);pet.playing=pet.playing&&pet.reaction>0
            if(engaged==='patch'||streetDistance(body,pet)<2){pet.mode=pet.playing?'playing':'chatting';pet.speed=0;turn(pet,body.x-pet.x,body.z-pet.z,dt)}
            else if(!reduced){const goal=pet.following?{x:body.x-.6,z:body.z+1.1}:{x:roadCenter(6.5)-1.15+Math.sin(elapsed*.3)*.25,z:6.5+Math.sin(elapsed*.2)*1.2};pet.mode=pet.following?'following':'walking';walk(pet,goal,pet.following?3:.65,dt);keepOnStreet(pet)}else pet.speed=0
        },
        reset(){Object.assign(body,{...streetSpawn,y:0,vy:0,yaw:.22,speed:0});Object.assign(mira,initialMira);Object.assign(pet,initialPet);elapsed=0;engaged=null;visited=null},
        ground(){return groundY(body.z)},
    }
}
