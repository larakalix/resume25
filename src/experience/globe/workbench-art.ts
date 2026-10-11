import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import type {WorkshopState} from './workshop.ts'

/** The same local planner state drives the readable HTML toy and the physical desk. */
export function createWorkbench(a:GlobeArtist){
 const {kit,block,mesh,sign,scene}=a,cards:THREE.Group[]=[],page=new THREE.Group(),screen=new THREE.Group(),links:THREE.Mesh[]=[],dots:THREE.Mesh[]=[]
 page.position.set(.45,1.29,-2.43);scene.add(page);block('cream',[0,0,0],[.86,.03,.64],page,true)
 for(let i=0;i<5;i++){const line=block(i%2?'blue':'wood',[(i%2)*.09,.022,-.22+i*.09],[.44-(i%3)*.08,.008,.017],page,true);line.rotation.y=(i%2?1:-1)*.15}
 for(const [i,label] of ['Interface','Logic','Data'].entries()){
  const card=new THREE.Group();scene.add(card);cards.push(card)
  block('blue',[0,0,-.025],[1.0,.76,.10],card,true);block('cream',[0,0,.035],[.94,.70,.035],card,true);sign(label,[0,.17,.058],.80,card)
  block(i===1?'gold':i===2?'mint':'coral',[0,-.08,.065],[.63,.08,.02],card,true);block('sand',[-.09,-.23,.065],[.46,.04,.02],card,true)
 }
 for(const x of [-.75,.75])links.push(block('gold',[x,2.21,-2.15],[.55,.045,.045],scene,true))
 const bead=mesh(kit.sphere,'gold',[0,2.23,-2.13],[.07,.07,.07],scene,true)
 screen.position.set(-1.1,1.5,-2.70);scene.add(screen);block('pale',[0,.25,.015],[1.25,.10,.02],screen,true)
 for(let i=0;i<3;i++){const y=.08-i*.18;block('cream',[.08,y,.01],[.96,.115,.02],screen,true);dots.push(mesh(kit.sphere,'blue',[-.50,y,.035],[.045,.045,.015],screen,true));block('sand',[.09,y,.035],[.62,.025,.02],screen,true)}
 const moveTarget=new THREE.Vector3()
 const stars=Array.from({length:12},(_,i)=>mesh(kit.sphere,i%3===0?'gold':i%3===1?'coral':'mint',[-1.1,1.65,-2.4],[0,0,0],scene,true))
 cards.forEach(card=>{card.position.set(.45,1.3,-2.43);card.scale.setScalar(.01)});screen.scale.setScalar(.01);links.forEach(link=>link.visible=false);bead.visible=false
 let celebration=0,complete=false
 return{update(dt:number,time:number,reduced:boolean,state:WorkshopState){
  const k=reduced?1:1-Math.exp(-dt*11),done=state.checked.every(Boolean)&&state.stage===3
  if(done&&!complete)celebration=1;complete=done;celebration=Math.max(0,celebration-dt*1.1)
  page.scale.lerp(moveTarget.setScalar(state.stage===0?1:.01),k)
  cards.forEach((card,i)=>{const active=state.stage===1||state.stage===2;card.position.lerp(moveTarget.set(active?(i-1)*1.45:.45,active?2.25:1.3,active?-2.15:-2.43),k);card.scale.lerp(moveTarget.setScalar(active?1:.01),k);card.rotation.z=active?(reduced?0:Math.sin(time*.8+i)*.018):.15*(i-1)})
  links.forEach(link=>{link.visible=state.stage===2});bead.visible=state.stage===2;bead.position.x=reduced?0:Math.sin(time*2)*1.1
  screen.scale.lerp(moveTarget.setScalar(state.stage===3?1:.01),k);dots.forEach((dot,i)=>{dot.material=kit.materials[state.checked[i]?'green':'blue']})
  stars.forEach((star,i)=>{const progress=1-celebration,angle=i*Math.PI*2/12;star.visible=!reduced&&celebration>0;star.position.set(-1.1+Math.cos(angle)*progress*1.6,1.65+Math.sin(angle)*progress*.8+progress*.8,-2.4+progress*.3);star.scale.setScalar(.065*celebration)})
 }}
}
