interface Point {x:number;y:number}
interface Pointer extends Point {id:number}
export interface LookGesture {yaw:number;pitch:number;zoom:number}
/** Canvas pointers are isolated from the independently captured movement stick. */
export function createLookRouter(){
 const pointers=new Map<number,Pointer>();let distance=0
 function span(){const values=[...pointers.values()];return values.length===2?Math.hypot(values[0]!.x-values[1]!.x,values[0]!.y-values[1]!.y):0}
 return{
  get count(){return pointers.size},ids:()=>[...pointers.keys()],
  down(id:number,x:number,y:number){if(!pointers.has(id)&&pointers.size<2){pointers.set(id,{id,x,y});distance=span()}},
  move(id:number,x:number,y:number,width:number,height:number):LookGesture{
   const previous=pointers.get(id),result={yaw:0,pitch:0,zoom:0};if(!previous||!Number.isFinite(x)||!Number.isFinite(y))return result
   const dx=x-previous.x,dy=y-previous.y;previous.x=x;previous.y=y
   if(pointers.size===2){const next=span();if(distance>1&&next>1)result.zoom=Math.log(distance/next);distance=next}
   else{result.yaw=-dx/Math.max(1,width)*Math.PI*2;result.pitch=dy/Math.max(1,height)*Math.PI}
   return result
  },
  up(id:number){pointers.delete(id);distance=span()},clear(){pointers.clear();distance=0},
 }
}

/** Preserve the rollback controller's original pixel sensitivity. */
export function legacyLook(value:LookGesture,width:number,height:number):LookGesture{return{yaw:value.yaw*Math.max(1,width)*.008/(Math.PI*2),pitch:value.pitch*Math.max(1,height)*.003/Math.PI,zoom:0}}
