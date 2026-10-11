import * as THREE from 'three'
import {frameAt as legacyFrameAt} from './art-kit.ts'
import type {TrailGuidance} from './trail-guidance.ts'
import type {RoomId} from './types.ts'

/** One small, non-colliding guide. It observes a safe route and never takes control of the player. */
export function createGuideFirefly(outdoors:THREE.Scene,rooms:Partial<Record<RoomId,{scene:THREE.Scene}>>,frameAt=legacyFrameAt){
 const geometry=new THREE.BufferGeometry()
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.10,.01,0,.10,.01,0],3))
 geometry.setAttribute('guideSize',new THREE.Float32BufferAttribute([1,.52,.52],1));geometry.computeBoundingSphere()
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  uniforms:{guideTime:{value:0},guideHeight:{value:720}},
  vertexShader:`attribute float guideSize; uniform float guideTime; uniform float guideHeight; varying float vWing;
   void main(){vec3 p=position; vWing=step(.01,abs(p.x)); p.y+=sin(guideTime*2.2)*.06+vWing*sin(guideTime*16.0)*.025;
    vec4 point=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*point;
    gl_PointSize=clamp(.14*guideSize*guideHeight*projectionMatrix[1][1]/max(1.0,-point.z),3.0,18.0);}`,
  fragmentShader:`varying float vWing;void main(){float d=length(gl_PointCoord-.5)*2.0;if(d>1.0)discard;
   vec3 color=mix(vec3(1.0,.83,.35),vec3(1.0,.98,.83),vWing);float alpha=(1.0-smoothstep(.2,1.0,d))*.95;
   gl_FragColor=vec4(color,alpha);}`,
 })
 const points=new THREE.Points(geometry,material),root=new THREE.Group();root.name='Trail guide firefly';root.matrixAutoUpdate=false;root.add(points);root.visible=false;outdoors.add(root)
 let previous='',disposed=false
 return{root,points,
  update(guidance:TrailGuidance|null,time:number,reduced:boolean,pixelHeight=720){
   if(disposed)return
   root.visible=!!guidance?.firefly&&!guidance.unreachable
   if(!guidance?.firefly||!root.visible)return
   const parent=guidance.room?rooms[guidance.room]?.scene:outdoors
   if(!parent){root.visible=false;return}
   if(root.parent!==parent)parent.add(root)
   const p=guidance.firefly,key=`${guidance.room??'world'}:${p.x}:${p.z}`
   if(key!==previous){
    if(guidance.room)root.matrix.makeTranslation(p.x,.95,p.z)
    else root.matrix.copy(frameAt(p.x,p.z)).multiply(new THREE.Matrix4().makeTranslation(0,1,0))
    root.matrixWorldNeedsUpdate=true;previous=key
   }
   material.uniforms.guideTime!.value=reduced||!Number.isFinite(time)?0:time
   material.uniforms.guideHeight!.value=Number.isFinite(pixelHeight)?Math.max(1,pixelHeight):720
  },
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometry.dispose();material.dispose()},
 }
}
