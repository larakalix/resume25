import {normalAt,terrainHeight,WATER} from './geography.ts'
import type {NavigationState} from './types.ts'

// A complete equirectangular atlas includes both sides of the longitude seam and the poles.
export const mapBounds={x:-127,z:-64,width:254,height:128}
export function createMinimapLand(){
 const step=1,parts:string[]=[]
 for(let z=mapBounds.z;z<mapBounds.z+mapBounds.height;z+=step){
  let start:number|null=null
  for(let x=mapBounds.x;x<=mapBounds.x+mapBounds.width;x+=step){
   const land=x<mapBounds.x+mapBounds.width&&terrainHeight(normalAt(x+step/2,z+step/2))>WATER
   if(land&&start===null)start=x
   if(!land&&start!==null){const width=x-start;parts.push(`M${start} ${z}h${width}v${step}h${-width}Z`);start=null}
  }
 }
 return parts.join('')
}
export function mapHeading(yaw:number){return 180-yaw*180/Math.PI}

/** A small HUD update stream, separate from interaction snapshots and the animation loop. */
export function createNavigationPublisher(emit:(value:NavigationState)=>void){
 let lastTime=-Infinity,lastKey='',lastRoom:NavigationState['inside']=null
 return(time:number,point:NavigationState,force=false)=>{
  if(!force&&point.inside===lastRoom&&time-lastTime<.1)return
  lastTime=time;lastRoom=point.inside
  const value={x:Math.round(point.x*20)/20,z:Math.round(point.z*20)/20,yaw:Math.round(point.yaw*100)/100,inside:point.inside,...(point.cameraYaw===undefined?{}:{cameraYaw:Math.round(point.cameraYaw*100)/100})},key=JSON.stringify(value)
  if(force||key!==lastKey){lastKey=key;emit(value)}
 }
}
