import type {MoveInput} from './types.ts'

export interface StickSample {knobX:number;knobY:number;input:MoveInput}
export interface StickPointer {id:number;x:number;y:number;pointerType?:string;button?:number;isPrimary?:boolean}
export const stickMetrics={radius:32,deadzone:4,runThreshold:45} as const
const idle=():StickSample=>({knobX:0,knobY:0,input:{x:0,forward:0,run:false}})

function sample(x:number,y:number):StickSample{
 const length=Math.hypot(x,y)
 if(!Number.isFinite(length))return idle()
 const scale=length>stickMetrics.radius?stickMetrics.radius/length:1,magnitude=Math.max(0,(Math.min(length,stickMetrics.radius)-stickMetrics.deadzone)/(stickMetrics.radius-stickMetrics.deadzone)),direction=length>0?magnitude/length:0
 return{knobX:x*scale||0,knobY:y*scale||0,input:{x:x*direction||0,forward:-y*direction||0,run:length>stickMetrics.runThreshold}}
}

/** A touch may be non-primary because the visitor is already dragging the camera. */
export function createStickInput(){
 let pointer:number|undefined,state=idle()
 const snapshot=():StickSample=>({...state,input:{...state.input}})
 return{
  get pointerId(){return pointer},snapshot,
  down({id,x,y,pointerType='touch',button=0}:StickPointer):StickSample|null{
   if(pointer!==undefined||!Number.isInteger(id)||id<0||!Number.isFinite(x)||!Number.isFinite(y)||pointerType==='mouse'&&button!==0)return null
   pointer=id;state=sample(x,y);return snapshot()
  },
  move(id:number,x:number,y:number):StickSample|null{if(pointer!==id)return null;state=sample(x,y);return snapshot()},
  end(id:number):StickSample|null{if(pointer!==id)return null;pointer=undefined;state=idle();return snapshot()},
  clear():StickSample{pointer=undefined;state=idle();return snapshot()},
 }
}
