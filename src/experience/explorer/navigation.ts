import { villagePaths } from './world-data.ts'
import { obstacles } from './village-layout.ts'
import { isWater, onBridge } from './terrain.ts'
import { advance, dot, surfaceFrame, surfaceDistance, PLANET_RADIUS } from './planet.ts'
import type { Point2 } from './types.ts'

export const ACTOR_RADIUS = .32
export function walkable(point: Point2, radius = ACTOR_RADIUS) {
    return (!isWater(point, radius) || onBridge(point)) && obstacles.every(item => surfaceDistance(point, item) > item.radius + radius + .035)
}
export function toward(point: Point2, goal: Point2, distance: number) {
    const frame = surfaceFrame(point), target = surfaceFrame(goal).normal
    const x = dot(target, frame.east), z = dot(target, frame.south)
    return {point:advance(frame,x,z,Math.min(distance,surfaceDistance(point,goal))),yaw:Math.atan2(x,z)}
}
export function clearSegment(a: Point2, b: Point2) {
    const distance = surfaceDistance(a,b)
    for(let t=.25;t<distance;t+=.25)if(!walkable(toward(a,b,t).point))return false
    return true
}
export interface RoadGraph { nodes: Point2[]; edges: number[][] }
export function createRoadGraph(): RoadGraph {
    const nodes: Point2[]=[]
    function add(point: Point2){if(walkable(point)&&!nodes.some(node=>surfaceDistance(node,point)<.55))nodes.push(point)}
    for(const path of [...villagePaths,[{x:0,z:-30},{x:0,z:-32}]])for(let i=1;i<path.length;i++) {
        const a=path[i-1]!,b=path[i]!,count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z))
        for(let j=0;j<=count;j++)add({x:a.x+(b.x-a.x)*j/count,z:a.z+(b.z-a.z)*j/count})
    }
    for(let i=0;i<220;i++)add({x:-Math.PI*PLANET_RADIUS+i/220*Math.PI*PLANET_RADIUS*2,z:-32})
    // Small dry-land detours connect roads interrupted by houses, trees and furniture.
    for(let x=-23;x<=25;x+=1.5)for(let z=-31;z<=24;z+=1.5)add({x,z})
    const edges=nodes.map(()=>[] as number[])
    for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)if(surfaceDistance(nodes[a]!,nodes[b]!)<2.05&&clearSegment(nodes[a]!,nodes[b]!)){edges[a]!.push(b);edges[b]!.push(a)}
    return {nodes,edges}
}
export function closestNode(graph: RoadGraph, point: Point2) {
    let best=0,distance=Infinity
    graph.nodes.forEach((node,i)=>{const d=surfaceDistance(point,node);if(d<distance&&clearSegment(point,node)){best=i;distance=d}})
    if(!Number.isFinite(distance))graph.nodes.forEach((node,i)=>{const d=surfaceDistance(point,node);if(d<distance){best=i;distance=d}})
    return best
}
export function roadRoute(graph: RoadGraph, from: number, to: number) {
    const queue=[from],previous=new Map<number,number>([[from,from]])
    for(let i=0;i<queue.length&&!previous.has(to);i++)for(const next of graph.edges[queue[i]!]!)if(!previous.has(next)){previous.set(next,queue[i]!);queue.push(next)}
    if(!previous.has(to))return [from]
    const result=[to];while(result[0]!==from)result.unshift(previous.get(result[0]!)!)
    return result
}
