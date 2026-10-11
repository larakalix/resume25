import {worldRadius,worldCircumference} from './world-expansion.ts'

export interface GrassTile {id:string;seed:number;minLongitude:number;maxLongitude:number;minSinLatitude:number;maxSinLatitude:number;normal:{x:number;y:number;z:number}}
export interface GrassDirection {x:number;y:number;z:number}
export const grassCapacity=42000,grassSlotCount=64
const latitudeBands=16

/** Roughly eight-metre spherical tiles have stable identities, including the seam and poles. */
export const grassTiles:GrassTile[]=Array.from({length:latitudeBands},(_,row)=>{
 const low=-Math.PI/2+row*Math.PI/latitudeBands,high=low+Math.PI/latitudeBands,middle=(low+high)/2,columns=Math.max(1,Math.round(worldCircumference*Math.cos(middle)/8))
 return Array.from({length:columns},(_,column)=>{
  const minLongitude=-Math.PI+column*Math.PI*2/columns,maxLongitude=minLongitude+Math.PI*2/columns,longitude=(minLongitude+maxLongitude)/2
  return{id:`${row}:${column}`,seed:row*4099+column*131+41771,minLongitude,maxLongitude,minSinLatitude:Math.sin(low),maxSinLatitude:Math.sin(high),normal:{x:Math.sin(longitude)*Math.cos(middle),y:Math.cos(longitude)*Math.cos(middle),z:Math.sin(middle)}}
 })
}).flat()

/** Hashes are independent of camera order: recycling a tile restores the exact same tufts. */
export function grassRandom(tile:GrassTile,index:number,salt=0){
 let value=(tile.seed^Math.imul(index+1,0x9e3779b1)^Math.imul(salt+1,0x85ebca6b))>>>0
 value=Math.imul(value^(value>>>16),0x7feb352d);value=Math.imul(value^(value>>>15),0x846ca68b)
 return((value^(value>>>16))>>>0)/4294967296
}
export function grassTilePoint(tile:GrassTile,index:number){
 const longitude=tile.minLongitude+(tile.maxLongitude-tile.minLongitude)*grassRandom(tile,index),sinLatitude=tile.minSinLatitude+(tile.maxSinLatitude-tile.minSinLatitude)*grassRandom(tile,index,1)
 return{x:longitude*worldRadius,z:Math.asin(sinLatitude)*worldRadius}
}
export function grassTileDistance(tile:GrassTile,direction:GrassDirection){return Math.acos(Math.max(-1,Math.min(1,tile.normal.x*direction.x+tile.normal.y*direction.y+tile.normal.z*direction.z)))*worldRadius}
export function orderedGrassTiles(direction:GrassDirection){return [...grassTiles].sort((a,b)=>grassTileDistance(a,direction)-grassTileDistance(b,direction))}

/** Every quality prefix samples every tile instead of drawing only one corner of the meadow. */
export function grassSlotIndex(slot:number,tuft:number){return tuft*grassSlotCount+slot}
export function grassSlotCapacity(slot:number){return Math.ceil((grassCapacity-slot)/grassSlotCount)}
