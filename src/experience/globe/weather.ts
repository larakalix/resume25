export type WeatherKind = 'clear' | 'breezy' | 'drizzle'
export type WeatherChoice = 'auto' | WeatherKind
export interface WeatherState {
 readonly choice: WeatherChoice
 readonly kind: WeatherKind
 readonly time: number
 readonly wind: number
 readonly rain: number
 readonly overcast: number
 readonly transition: number
}
export const weatherChoices = [{label:'Automatic',value:'auto'},{label:'Clear skies',value:'clear'},{label:'Breezy',value:'breezy'},{label:'Gentle drizzle',value:'drizzle'}] as const
export const weatherTiming = { interval:180, blend:8 } as const
const order:readonly WeatherKind[]=['clear','breezy','drizzle']
const conditions:Record<WeatherKind,{wind:number;rain:number;overcast:number}>={clear:{wind:.7,rain:0,overcast:0},breezy:{wind:1.65,rain:0,overcast:.16},drizzle:{wind:1.15,rain:1,overcast:.62}}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t

/** Only active, non-Calm world time advances weather; there is no wall-clock timer. */
export function createWeather(){
 let time=0,choice:WeatherChoice='auto',kind:WeatherKind='clear',started=-weatherTiming.blend,from={...conditions.clear},values={...conditions.clear}
 function snapshot():WeatherState{return{choice,kind,time,...values,transition:Math.min(1,Math.max(0,(time-started)/weatherTiming.blend))}}
 function sample(){const t=Math.min(1,Math.max(0,(time-started)/weatherTiming.blend)),smooth=t*t*(3-2*t),target=conditions[kind];values={wind:mix(from.wind,target.wind,smooth),rain:mix(from.rain,target.rain,smooth),overcast:mix(from.overcast,target.overcast,smooth)}}
 function begin(next:WeatherKind){from={...values};kind=next;started=time}
 return{
  snapshot,
  update(delta:number,nextChoice:WeatherChoice=choice,calm=false):WeatherState{
   const dt=Number.isFinite(delta)?Math.min(weatherTiming.interval*order.length,Math.max(0,delta)):0
   if(nextChoice!==choice){choice=nextChoice;begin(choice==='auto'?order[Math.floor(time/weatherTiming.interval)%order.length]!:choice)}
   if(!calm){
    // Visit crossed boundaries so a slow frame and many small frames give the same weather.
    const end=time+dt
    if(choice==='auto')while(Math.floor(time/weatherTiming.interval)<Math.floor(end/weatherTiming.interval)){
     time=(Math.floor(time/weatherTiming.interval)+1)*weatherTiming.interval;sample();begin(order[Math.floor(time/weatherTiming.interval)%order.length]!)
    }
    time=end;sample()
   }
   return snapshot()
  },
  reset(){time=0;choice='auto';kind='clear';started=-weatherTiming.blend;from={...conditions.clear};values={...conditions.clear};return snapshot()},
 }
}
