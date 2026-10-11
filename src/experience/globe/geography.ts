import {lighthousePaths} from './lighthouse.ts'
import {coastalHeight,coastalFootprint,coastalRoutes} from './coastal-crossing.ts'
import {cavePaths} from './wild-land.ts'
import type {MapPoint} from './types.ts'
import {bridge,bridgeHeight} from './bridge.ts'
import {worldPaths,longitudeDelta} from './world-expansion.ts'
import {RADIUS,WATER,normalAt,terrainHeight} from './terrain.ts'
import {cityPaths} from './city-district.ts'
import {japanPaths} from './japan-district.ts'
import {dockHeight,dockFootprint} from './duck-dock.ts'
import {harborHeight,harborFootprint,shoreEntry} from './harbor.ts'
export {bridgeHeight} from './bridge.ts'
export {RADIUS,WATER,normalAt,mapAt,terrainHeight} from './terrain.ts'
export const spawn={x:bridge.x,z:(bridge.startZ+bridge.endZ)/2}
export const localPaths:MapPoint[][]=[
 [{x:0,z:29},{x:0,z:18},{x:-2,z:9},{x:0,z:1},{x:0,z:-9},{x:9,z:-19},{x:23,z:-19}],
 [{x:-2,z:9},{x:-9,z:10}], [{x:-2,z:9},{x:-15,z:9},{x:-23,z:10}],
 [{x:0,z:18},{x:12,z:17}], [{x:9,z:-19},{x:9,z:-21}], [{x:23,z:-19},{x:23,z:-14}],
 [{x:0,z:18},{x:-8,z:18},{x:-13,z:24.6},{x:-19,z:24.6}],
 [{x:0,z:9},{x:8,z:7},{x:15,z:9}],
 [{x:15,z:9},{x:15.85,z:7}],
 [{x:12,z:17},{x:11,z:22},{x:23,z:23},{x:34,z:22},{x:41,z:18},shoreEntry],
 ...cityPaths,
 ...coastalRoutes,...cavePaths,...lighthousePaths,
 ...japanPaths,
 // Approach each crossing from an existing path, with a clear landing on either bank.
 [{x:-15,z:9},{x:-30,z:7},{x:-30,z:1.2},{x:-30,z:-5.5},{x:-30,z:-10},{x:-23,z:-17}],
 [{x:15,z:9},{x:15,z:12},{x:28,z:12},{x:28,z:4},{x:28,z:-2.7},{x:28,z:-9},{x:23,z:-14}],
]
export const paths:MapPoint[][]=[...localPaths,...worldPaths]
export function heightAt(p:MapPoint){return coastalHeight(p)??harborHeight(p)??dockHeight(p)??bridgeHeight(p)??terrainHeight(normalAt(p.x,p.z))}
export function wet(p:MapPoint){return !coastalFootprint(p)&&!harborFootprint(p)&&!dockFootprint(p)&&bridgeHeight(p)===null&&terrainHeight(normalAt(p.x,p.z))<WATER+.07}
export function distance(a:MapPoint,b:MapPoint){const na=normalAt(a.x,a.z),nb=normalAt(b.x,b.z);return Math.acos(Math.max(-1,Math.min(1,na.x*nb.x+na.y*nb.y+na.z*nb.z)))*RADIUS}
/** Heading in the actor's radial tangent frame, including the date line and polar latitudes. */
export function bearing(a:MapPoint,b:MapPoint){const u=a.x/RADIUS,v=a.z/RADIUS,n=normalAt(b.x,b.z);return Math.atan2(n.x*Math.cos(u)-n.y*Math.sin(u),-n.x*Math.sin(u)*Math.sin(v)-n.y*Math.cos(u)*Math.sin(v)+n.z*Math.cos(v))}
export function segmentDistance(p:MapPoint,a:MapPoint,b:MapPoint){const mid=(a.x+b.x)/2,px=mid+longitudeDelta(mid,p.x),x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((px-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1)));return Math.hypot(px-a.x-x*t,p.z-a.z-z*t)}
export function pathDistance(p:MapPoint,routes:MapPoint[][]=paths){let result=Infinity;for(const points of routes)for(let i=1;i<points.length;i++)result=Math.min(result,segmentDistance(p,points[i-1]!,points[i]!));return result}
export function random(seed=27041){let state=seed>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296}}
