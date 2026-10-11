import {mapAt,normalAt,RADIUS} from './terrain.ts'

interface Point {x:number;z:number}
export const duckDock={x:17,z:7,level:.36,x0:-1.05,x1:2.65,halfWidth:.85,thickness:.16,railWidth:.14,railHeight:.70,railStart:-.81,bodyRadius:.32,apronStart:-1.45,apronEnd:-.80,apronHalfWidth:1.0}
const up=normalAt(duckDock.x,duckDock.z),u=duckDock.x/RADIUS,v=duckDock.z/RADIUS,east={x:Math.cos(u),y:-Math.sin(u),z:0},south={x:-Math.sin(u)*Math.sin(v),y:-Math.cos(u)*Math.sin(v),z:Math.cos(v)},levelRadius=RADIUS+duckDock.level

/** Intersect a spherical map ray with the real flat dock plane before testing its local footprint. */
export function dockLocalPoint(point:Point){
 const n=normalAt(point.x,point.z),dot=n.x*up.x+n.y*up.y+n.z*up.z
 if(dot<=0)return null
 const radius=levelRadius/dot
 return{x:radius*(n.x*east.x+n.y*east.y+n.z*east.z),z:radius*(n.x*south.x+n.y*south.y+n.z*south.z),height:radius-RADIUS}
}
export function dockMapPoint(x:number,z:number):Point{
 const world={x:up.x*levelRadius+east.x*x+south.x*z,y:up.y*levelRadius+east.y*x+south.y*z,z:up.z*levelRadius+south.z*z},length=Math.hypot(world.x,world.y,world.z)
 return mapAt({x:world.x/length,y:world.y/length,z:world.z/length})
}
function within(x:number,z:number,x0:number,x1:number,halfWidth:number,margin:number){return x>=x0-margin-1e-9&&x<=x1+margin+1e-9&&Math.abs(z)<=halfWidth+margin+1e-9}
function onDeck(point:{x:number;z:number},margin:number){return within(point.x,point.z,duckDock.x0,duckDock.x1,duckDock.halfWidth,margin)||within(point.x,point.z,duckDock.apronStart,duckDock.apronEnd,duckDock.apronHalfWidth,margin)}
export function dockFootprint(point:Point,margin=0){const p=dockLocalPoint(point);return p!==null&&onDeck(p,margin)}
export function dockHeight(point:Point){const p=dockLocalPoint(point);return p!==null&&onDeck(p,0)?p.height:null}

export const dockRails=[
 {x0:duckDock.railStart,x1:duckDock.x1,z0:-duckDock.halfWidth,z1:-duckDock.halfWidth+duckDock.railWidth},
 {x0:duckDock.railStart,x1:duckDock.x1,z0:duckDock.halfWidth-duckDock.railWidth,z1:duckDock.halfWidth},
 {x0:duckDock.x1-duckDock.railWidth,x1:duckDock.x1,z0:-duckDock.halfWidth,z1:duckDock.halfWidth},
]
/** Rounded body clearance includes posts/rail ends while the bank entrance stays open. */
export function duckDockBlocked(point:Point,bodyRadius=duckDock.bodyRadius){
 const p=dockLocalPoint(point);if(!p)return false
 return dockRails.some(rail=>{const dx=Math.max(rail.x0-p.x,0,p.x-rail.x1),dz=Math.max(rail.z0-p.z,0,p.z-rail.z1);return dx*dx+dz*dz<bodyRadius*bodyRadius})
}
export function dockOutline(){const d=duckDock;return[[d.apronStart,-d.apronHalfWidth],[d.apronEnd,-d.apronHalfWidth],[d.apronEnd,-d.halfWidth],[d.x1,-d.halfWidth],[d.x1,d.halfWidth],[d.apronEnd,d.halfWidth],[d.apronEnd,d.apronHalfWidth],[d.apronStart,d.apronHalfWidth]].map(([x,z])=>dockMapPoint(x!,z!))}
export const duckFeedingPoint=dockMapPoint(3.45,0)
