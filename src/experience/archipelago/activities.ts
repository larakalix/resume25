import type {WorldEvent} from '../globe/world-events.ts'

/** Fictional errands complement the portfolio; they never change professional content. */
export const deliveryStops=[
 {targetId:'delivery-workshop',action:'collect',room:'workshop',title:'A parcel at the workshop',prompt:'Collect the little parcel',message:'One little parcel, ready to go. The market stall has the stamp it needs.'},
 {targetId:'delivery-market',action:'stamp',room:null,title:'The market stamp',prompt:'Have the parcel stamped',message:'Stamped and ready. Take it to the harbor desk whenever you like.'},
 {targetId:'delivery-harbor',action:'deliver',room:null,title:'A harbor handoff',prompt:'Deliver the parcel',message:'Special delivery! A small idea made it all the way from the workshop to the water.'},
] as const
export type DeliveryTargetId=typeof deliveryStops[number]['targetId']
export type DeliveryAction=typeof deliveryStops[number]['action']
export const deliveryStampDefinition={id:'delivery-complete',title:'A special delivery',detail:'Carry the workshop parcel through the market to the harbor.',targetId:'delivery-workshop'} as const
export interface DeliverySnapshot {
 phase:'ready'|'carrying'|'complete'
 step:number
 total:number
 nextTargetId:DeliveryTargetId|null
 nextAction:DeliveryAction|null
 carrying:boolean
}
export interface DeliveryOutcome {accepted:boolean;message:string;events:WorldEvent[]}

/** Ordered semantic actions only. Distance/room checks remain with the owning simulation. */
export function createDelivery(options:{completed?:boolean}={}){
 let step=options.completed?deliveryStops.length:0
 return{
  act(targetId:string,action:string):DeliveryOutcome{
   const stop=deliveryStops[step]
   if(!stop)return{accepted:false,message:'That parcel is already safely delivered. Thank you!',events:[]}
   if(stop.targetId!==targetId||stop.action!==action)return{accepted:false,message:step===0?'There is a little parcel waiting at the workshop.':`The next stop is ${step===1?'the market stall':'the harbor desk'}. No hurry.`,events:[]}
   step++
   return{accepted:true,message:stop.message,events:step===deliveryStops.length?[{type:'activity',id:deliveryStampDefinition.id}]:[]}
  },
  snapshot():DeliverySnapshot{return{phase:step===0?'ready':step===deliveryStops.length?'complete':'carrying',step,total:deliveryStops.length,nextTargetId:deliveryStops[step]?.targetId??null,nextAction:deliveryStops[step]?.action??null,carrying:step>0&&step<deliveryStops.length}},
  restore(completed:boolean){if(completed)step=deliveryStops.length},
  reset(){step=0},
 }
}

export const ferryStops=[
 {id:'harbor',targetId:'ferry-harbor',name:'Harbor landing'},
 {id:'orchard',targetId:'ferry-orchard',name:'Orchard landing'},
] as const
export type FerryStopId=typeof ferryStops[number]['id']
export interface FerryArrival {from:FerryStopId;to:FerryStopId;skipped:boolean}
export interface FerrySnapshot {phase:'docked'|'sailing';from:FerryStopId;to:FerryStopId;progress:number;easedProgress:number;canSkip:boolean}

/** The owner supplies its active world clock in seconds. No timer, RAF or hidden catch-up clock. */
export function createFerryJourney(options:{duration?:number}={}){
 const requested=options.duration??9,duration=Number.isFinite(requested)&&requested>0?requested:9
 let phase:FerrySnapshot['phase']='docked',from:FerryStopId='harbor',to:FerryStopId='harbor',progress=0,started=0,lastTime=0
 function finish(skipped:boolean):FerryArrival|null{
  if(phase!=='sailing')return null
  phase='docked';progress=1
  return{from,to,skipped}
 }
 return{
  board(origin:FerryStopId,time:number,preferences:{reduced?:boolean;skip?:boolean}={}):FerryArrival|null{
   if(phase==='sailing'||!ferryStops.some(stop=>stop.id===origin)||!Number.isFinite(time)||time<0)return null
   from=origin;to=origin==='harbor'?'orchard':'harbor';started=lastTime=time;progress=0;phase='sailing'
   return preferences.reduced||preferences.skip?finish(true):null
  },
  update(time:number):FerryArrival|null{
   if(phase!=='sailing'||!Number.isFinite(time)||time<lastTime)return null
   lastTime=time;progress=Math.min(1,Math.max(0,(time-started)/duration))
   return progress===1?finish(false):null
  },
  skip(){return finish(true)},
  cancel(){if(phase==='sailing'){phase='docked';to=from;progress=0}},
  reset(){phase='docked';from=to='harbor';progress=started=lastTime=0},
  snapshot():FerrySnapshot{return{phase,from,to,progress,easedProgress:progress*progress*(3-2*progress),canSkip:phase==='sailing'}},
 }
}
