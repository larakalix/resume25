import {heightAt,mapAt,normalAt,RADIUS} from './geography.ts'
import type {MapPoint} from './types.ts'

export interface BuildingFootprint extends MapPoint {width:number;depth:number}
export interface RoundFootprint extends MapPoint {radius:number}

function axes(building:MapPoint){
 const u=building.x/RADIUS,v=building.z/RADIUS
 return{
  up:normalAt(building.x,building.z),
  east:{x:Math.cos(u),y:-Math.sin(u),z:0},
  south:{x:-Math.sin(u)*Math.sin(v),y:-Math.cos(u)*Math.sin(v),z:Math.cos(v)},
 }
}

function footprintCoordinates(point:MapPoint,building:MapPoint){
 const n=normalAt(point.x,point.z),{up,east,south}=axes(building)
 // A tangent-plane projection is shared by antipodes; only the object's own hemisphere is solid.
 if(n.x*up.x+n.y*up.y+n.z*up.z<=0)return{x:Infinity,z:Infinity}
 const radius=RADIUS+heightAt(point)
 const x=radius*(n.x*east.x+n.y*east.y+n.z*east.z),z=radius*(n.x*south.x+n.y*south.y+n.z*south.z)
 return{x,z}
}

/** Building dimensions are tangent-world metres, not longitude/latitude map units. */
export function insideBuildingFootprint(point:MapPoint,building:BuildingFootprint,clearance=0){
 const {x,z}=footprintCoordinates(point,building)
 return Math.abs(x)<=building.width/2+clearance&&Math.abs(z)<=building.depth/2+clearance
}

/** Circular towers keep their true rounded footprint, including physical player clearance. */
export function insideRoundFootprint(point:MapPoint,round:RoundFootprint,clearance=0){
 const {x,z}=footprintCoordinates(point,round),radius=round.radius+clearance
 return x*x+z*z<=radius*radius
}

/** Project an actual local model point into the same map frame as its collision footprint. */
export function buildingMapPoint(building:MapPoint,x:number,z:number):MapPoint{
 const {up,east,south}=axes(building),radius=RADIUS+heightAt(building)
 const world={x:up.x*radius+east.x*x+south.x*z,y:up.y*radius+east.y*x+south.y*z,z:up.z*radius+east.z*x+south.z*z},length=Math.hypot(world.x,world.y,world.z)
 return mapAt({x:world.x/length,y:world.y/length,z:world.z/length})
}

/** The same four base corners used by the rendered house, in minimap coordinates. */
export function buildingMapOutline(building:BuildingFootprint):MapPoint[]{
 return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([side,end])=>buildingMapPoint(building,side!*building.width/2,end!*building.depth/2))
}
