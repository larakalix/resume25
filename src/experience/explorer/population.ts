import { residents, pets, worldTargets } from './world-data.ts'
import { ACTOR_RADIUS, clearSegment, closestNode, createRoadGraph, roadRoute, toward, walkable } from './navigation.ts'
import { separate, surfaceDistance } from './planet.ts'
import { constrainWater } from './terrain.ts'
import type { Point2, ResidentId, PetId, PetAction, PetState, WorldTargetId, WorldTarget } from './types.ts'
import { obstacles } from './village-layout.ts'

export interface Walker extends Point2 { id: ResidentId | PetId; yaw: number; speed: number; mode: 'walking' | 'resting' | 'chatting' | 'following' | 'playing'; greeting: number; route: number[]; cursor: number; lap: number; rest: number }
export interface PetWalker extends Walker, PetState { id: PetId; reaction: number; followNode?: number }
export type Population = ReturnType<typeof createPopulation>
let sharedGraph: ReturnType<typeof createRoadGraph> | undefined
export function createPopulation() {
    const graph=sharedGraph??=createRoadGraph()
    function walker(source: {id:ResidentId|PetId}&Point2, index:number):Walker {return {id:source.id,x:source.x,z:source.z,yaw:0,speed:0,mode:'resting',greeting:0,route:[closestNode(graph,source)],cursor:0,lap:index*13,rest:index*.65}}
    const people=residents.map(walker), animals:PetWalker[]=pets.map((pet,i)=>({...walker(pet,i),id:pet.id,affection:0,following:false,playing:false,reaction:0}))
    let engaged:WorldTargetId|null=null,reduced=false
    function chooseRoute(actor:Walker) {
        const start=closestNode(graph,actor)
        const candidates=graph.nodes.map((_,i)=>i).filter(i=>surfaceDistance(graph.nodes[start]!,graph.nodes[i]!)>9)
        for(let attempt=0;attempt<8;attempt++){
            const end=candidates[(actor.lap++*37+attempt*19)%candidates.length]??start,route=roadRoute(graph,start,end)
            if(route.length>3){actor.route=route;actor.cursor=0;return}
        }
        actor.route=[start];actor.cursor=0
    }
    function move(actor:Walker, goal:Point2, speed:number, dt:number) {
        const before={x:actor.x,z:actor.z},step=toward(actor,goal,speed*dt)
        if(walkable(step.point)){actor.x=step.point.x;actor.z=step.point.z}
        for(const other of [...people,...animals])if(other!==actor)separate(actor,other,ACTOR_RADIUS*2+.08)
        for(const obstacle of obstacles)separate(actor,obstacle,ACTOR_RADIUS+obstacle.radius+.035)
        constrainWater(actor,before,ACTOR_RADIUS)
        actor.speed=dt?surfaceDistance(before,actor)/dt:0
        const difference=Math.atan2(Math.sin(step.yaw-actor.yaw),Math.cos(step.yaw-actor.yaw));actor.yaw+=difference*(1-Math.exp(-dt*7))
    }
    function arrival(actor:Point2, player:Point2) {
        // Prefer the visitor's side, while keeping every direct-menu visit on dry, unoccupied ground.
        const start=toward(actor,player,2.1).point
        if(walkable(start,.4))return start
        for(let i=0;i<20;i++){const angle=i/20*Math.PI*2,point={x:actor.x+Math.sin(angle)*2.2,z:actor.z+Math.cos(angle)*2.2};if(walkable(point,.4))return point}
        return graph.nodes[closestNode(graph,actor)]!
    }
    return {people,animals,graph,
        setConversation(id:WorldTargetId|null){engaged=id},setReduced(value:boolean){reduced=value},
        target(id:WorldTargetId,player:Point2):WorldTarget|undefined {
            const source=worldTargets.find(target=>target.id===id),actor=[...people,...animals].find(actor=>actor.id===id)
            return source&&actor?{...source,x:actor.x,z:actor.z,arrival:arrival(actor,player)}:source
        },
        interactPet(id:PetId,action:PetAction):PetState {
            const pet=animals.find(pet=>pet.id===id)!
            if(action==='follow'){pet.following=!pet.following;pet.followNode=undefined;chooseRoute(pet)}
            else{pet.reaction=action==='play'?2.4:1.5;if(action==='pet')pet.affection++;pet.playing=action==='play'}
            return {affection:pet.affection,following:pet.following,playing:pet.playing}
        },
        step(dt:number,player:Point2){
            if(dt<=0)return
            for(const [index,actor] of [...people,...animals].entries()){
                const pet='affection'in actor?actor as PetWalker:undefined,distance=surfaceDistance(actor,player)
                actor.greeting=Math.max(0,actor.greeting-dt);if(pet){pet.reaction=Math.max(0,pet.reaction-dt);pet.playing=pet.playing&&pet.reaction>0}
                const stop=engaged===actor.id||distance<(actor.mode==='chatting'?4.6:3.25)
                if(stop){if(actor.mode!=='chatting')actor.greeting=1.8;actor.mode=pet?.playing?'playing':'chatting';actor.speed=0;const turn=toward(actor,player,0).yaw;actor.yaw+=Math.atan2(Math.sin(turn-actor.yaw),Math.cos(turn-actor.yaw))*(reduced?1:1-Math.exp(-dt*7));continue}
                if(reduced){actor.speed=0;actor.mode='resting';continue}
                if(pet?.following){
                    actor.mode='following'
                    const goal=toward(player,actor,1.6).point
                    if(clearSegment(actor,goal)){move(actor,goal,Math.min(4,distance*.7),dt);pet.followNode=undefined}
                    else{
                        const end=closestNode(graph,goal)
                        if(pet.followNode!==end){actor.route=roadRoute(graph,closestNode(graph,actor),end);actor.cursor=0;pet.followNode=end}
                        const node=graph.nodes[actor.route[Math.min(actor.cursor,actor.route.length-1)]!]!
                        if(surfaceDistance(actor,node)<.22&&actor.cursor<actor.route.length-1)actor.cursor++
                        move(actor,node,Math.min(4,distance*.7),dt)
                    }
                    continue
                }
                if(actor.mode==='chatting')actor.rest=.8
                actor.rest=Math.max(0,actor.rest-dt)
                if(actor.rest>0){actor.mode='resting';actor.speed=0;continue}
                const goal=graph.nodes[actor.route[actor.cursor]!]!
                if(surfaceDistance(actor,goal)<.22){actor.cursor++;if(actor.cursor>=actor.route.length){chooseRoute(actor);actor.rest=1.2+(actor.lap%4)*.6}actor.speed=0;continue}
                actor.mode='walking';move(actor,goal,index<3?1.05+index*.12:1.5,dt)
                if(actor.speed<.02){actor.rest=.35;chooseRoute(actor)}
            }
        },
        reset(){people.forEach((actor,i)=>Object.assign(actor,walker(residents[i]!,i)));animals.forEach((actor,i)=>Object.assign(actor,walker(pets[i]!,i),{affection:0,following:false,playing:false,reaction:0,followNode:undefined}));engaged=null},
    }
}
