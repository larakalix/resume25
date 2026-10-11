import {normalAt,RADIUS,WATER} from './geography.ts'
import type {SoundStatus} from './types.ts'
export interface SoundPoint {x:number;y:number;z:number}
export type WorldSound='grass-step'|'wood-step'|'land'|'bell'|'success'|'pet'
/** Original deterministic PCM, with a short fade at loop boundaries. No media request or license dependency. */
export function noiseSamples(length:number,seed=8371){
 const samples=new Float32Array(length);let state=seed>>>0
 for(let i=0;i<length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;samples[i]=(state/4294967296*2-1)*Math.min(1,i/128,(length-1-i)/128)}return samples
}
const pointAt=(x:number,z:number,lift=0):SoundPoint=>{const n=normalAt(x,z);return{x:n.x*(RADIUS+lift),y:n.y*(RADIUS+lift),z:n.z*(RADIUS+lift)}}

/** One owner for opt-in ambience and game feedback. AudioContext is created only by enable(), from a gesture. */
export function createWorldSound(onChange:()=>void){
 let context:AudioContext|undefined,master:GainNode|undefined,noise:AudioBuffer|undefined,enabled=false,active=true,disposed=false,failed=false,nextBird=0,outdoor=false
 const nodes=new Set<AudioNode>(),sources=new Set<AudioScheduledSourceNode>(),ambient:GainNode[]=[],ambientLevels:number[]=[]
 const own=<T extends AudioNode>(node:T):T=>{nodes.add(node);return node}
 function position(panner:PannerNode,p:SoundPoint){panner.positionX.value=p.x;panner.positionY.value=p.y;panner.positionZ.value=p.z}
 function panner(p:SoundPoint){const pan=own(context!.createPanner());pan.panningModel='equalpower';pan.distanceModel='inverse';pan.refDistance=7;pan.rolloffFactor=1.5;pan.maxDistance=100;position(pan,p);pan.connect(master!);return pan}
 function source<T extends AudioScheduledSourceNode>(value:T,cleanup:AudioNode[]=[]):T{sources.add(value);value.onended=()=>{sources.delete(value);value.disconnect();for(const node of cleanup){node.disconnect();nodes.delete(node)}};return value}
 function loop(frequency:number,amount:number,p?:SoundPoint){const ctx=context!,filter=own(ctx.createBiquadFilter()),gain=own(ctx.createGain()),sound=source(ctx.createBufferSource());sound.buffer=noise!;sound.loop=true;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.value=0;gain.gain.setValueAtTime(0,ctx.currentTime);sound.connect(filter).connect(gain).connect(p?panner(p):master!);ambient.push(gain);ambientLevels.push(amount);sound.start()}
 function voice(frequency:number,at:number,duration:number,amount:number,p:SoundPoint,type:OscillatorType='sine'){
  const ctx=context!,gain=own(ctx.createGain()),pan=panner(p),osc=source(ctx.createOscillator(),[gain,pan]);osc.type=type;osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(frequency*.88,at+duration);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(amount,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain).connect(pan);osc.start(at);osc.stop(at+duration+.01)
 }
 function status():SoundStatus{return failed?'unavailable':!enabled?'off':context?.state==='running'&&active?'on':'paused'}
 return{
  get status(){return status()},get nodeCount(){return nodes.size+sources.size},
  async enable(value:boolean){
   if(disposed)return false
   enabled=value
   if(!value){if(context?.state==='running')await context.suspend();onChange();return false}
   try{
    if(!context){const ctx=new AudioContext();context=ctx;master=own(ctx.createGain());master.gain.value=.35;master.connect(ctx.destination);noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);noise.copyToChannel(noiseSamples(noise.length),0);loop(300,.025);loop(1100,.12,pointAt(0,-4,WATER));loop(1700,.08,pointAt(21,5,WATER));ctx.onstatechange=onChange}
    await context.resume();if(disposed)return false;failed=false;if(!active)await context.suspend();onChange();return context.state==='running'
   }catch{enabled=false;failed=true;onChange();return false}
  },
  setActive(value:boolean){active=value;if(context&&enabled){if(value)void context.resume().catch(()=>{failed=true;onChange()});else void context.suspend().catch(()=>{});}onChange()},
  update(time:number,inside:boolean,overview:boolean,listener:{position:SoundPoint;forward:SoundPoint;up:SoundPoint}){
   const ctx=context;if(!ctx||!enabled||!active||ctx.state!=='running')return
   const l=ctx.listener;for(const [axis,value] of [['X',listener.position.x],['Y',listener.position.y],['Z',listener.position.z]] as const)l[`position${axis}`].value=value
   for(const [axis,f,u] of [['X',listener.forward.x,listener.up.x],['Y',listener.forward.y,listener.up.y],['Z',listener.forward.z,listener.up.z]] as const){l[`forward${axis}`].value=f;l[`up${axis}`].value=u}
   const audible=!inside&&!overview;if(audible!==outdoor){outdoor=audible;ambient.forEach((gain,i)=>gain.gain.setTargetAtTime(audible?ambientLevels[i]!:0,ctx.currentTime,.25))}
   if(audible&&time>nextBird){nextBird=time+5+Math.sin(time*2)*1.5;const bird=pointAt(-17,23,4);voice(1900,ctx.currentTime,.13,.055,bird);voice(2500,ctx.currentTime+.17,.16,.04,bird)}
  },
  play(kind:WorldSound,p:SoundPoint){
   const ctx=context;if(!ctx||!enabled||!active||ctx.state!=='running')return
   const t=ctx.currentTime
   if(kind==='bell'){voice(660,t,1.5,.12,p);voice(1320,t,1.0,.035,p);return}
   if(kind==='success'){[523.25,659.25,783.99].forEach((note,i)=>voice(note,t+i*.11,.42,.065,p));return}
   if(kind==='pet'){voice(520,t,.14,.035,p);voice(700,t+.09,.16,.03,p);return}
   const gain=own(ctx.createGain()),filter=own(ctx.createBiquadFilter()),pan=panner(p),step=source(ctx.createBufferSource(),[gain,filter,pan]),duration=kind==='land'?.12:.075
   filter.type='lowpass';filter.frequency.value=kind==='wood-step'?1400:kind==='land'?500:750;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(kind==='land'?.18:.11,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);step.buffer=noise!;step.connect(filter).connect(gain).connect(pan);step.start(t,(t*.37)%2.5,duration)
  },
  dispose(){if(disposed)return;disposed=true;enabled=false;for(const sound of sources)try{sound.stop()}catch{/* An already-ended voice needs no further stop. */}sources.clear();for(const node of nodes)node.disconnect();nodes.clear();if(context){context.onstatechange=null;void context.close().catch(()=>{})}noise=undefined;onChange()},
 }
}
