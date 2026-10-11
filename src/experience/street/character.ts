import * as THREE from 'three'
import type { ArtKit, ArtColor } from '../explorer/art-kit.ts'
import { mergeCharacterParts } from '../explorer/character-mesh.ts'
import { createCharacterMotion } from '../explorer/character-motion.ts'
import { createHatWardrobe } from '../explorer/character-hats.ts'
import type { HatId } from '../explorer/seasonal-hats.ts'
import {createOriginalMotions,ORIGINAL_POSE_METRICS} from './character-poses.ts'
import {buildCharacterHair,type CharacterHairstyle} from './character-hair.ts'
export {createOriginalMotions} from './character-poses.ts'

export interface StreetCharacterLook {coat?:ArtColor;hair?:ArtColor;scale?:number;glasses?:boolean;portrait?:'ivan';hairstyle?:CharacterHairstyle}

/** Original three-head-tall cast: no downloaded mesh, fan-art geometry, or external rig. */
export function createStreetCharacter(kit:ArtKit,resident=false,look:StreetCharacterLook={}){
    const portrait=look.portrait==='ivan'
    const avatar=new THREE.Group(),rig=new THREE.Group(),parts=new Map<THREE.Object3D,THREE.Mesh[]>(),eyes:THREE.Group[]=[]
    avatar.name=resident?'Mira':'Ivan';avatar.add(rig);kit.scene.add(avatar)
    function tint(color:ArtColor,hex:number){const material=kit.materials[color].clone();material.color.setHex(hex);kit.extras.push(material);return material}
    const portraitMaterials=portrait?{skin:tint('skin',0xd9ac89),hair:tint('hair',0x35322f),blue:tint('blue',0x85bdd8),cream:tint('cream',0xf6f2df)}:undefined
    const beard=portrait?tint('wood',0x745b48):undefined
    function joint(name:string,parent:THREE.Object3D,p:[number,number,number]){const group=new THREE.Group();group.name=name;group.position.set(...p);parent.add(group);return group}
    const pelvis=joint('pelvis',rig,[0,ORIGINAL_POSE_METRICS.pelvisHeight,0]),torso=joint('spine_03',pelvis,[0,0,0]),head=joint('Head',torso,[0,.67,0]);head.scale.setScalar(.94)
    function part(g:THREE.BufferGeometry,color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D){const mesh=kit.mesh(g,color==='hair'&&look.hair?look.hair:color,p,s,parent,true,false);if(portraitMaterials&&color in portraitMaterials)mesh.material=portraitMaterials[color as keyof typeof portraitMaterials];const bucket=parts.get(parent)??[];bucket.push(mesh);parts.set(parent,bucket);return mesh}
    function capsule(a:THREE.Vector3,b:THREE.Vector3,r:number,color:ArtColor,parent:THREE.Object3D){const d=b.clone().sub(a),geometry=new THREE.CapsuleGeometry(r,Math.max(.005,d.length()-r*2),5,12);kit.geometries.push(geometry);const p=part(geometry,color,a.clone().lerp(b,.5).toArray() as [number,number,number],[1,1,1],parent);p.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return p}
    const coat:ArtColor=look.coat??(resident?'mint':'blue')
    const profile=(portrait?[[0,0],[.26,0],[.285,.025],[.29,.065],[.285,.19],[.29,.37],[.27,.47],[.21,.535],[.10,.56],[0,.56]]:[[0,0],[.28,0],[.315,.025],[.325,.065],[.31,.19],[.295,.37],[.27,.47],[.21,.535],[.10,.56],[0,.56]]).map(([x,y])=>new THREE.Vector2(x!,y!))
    // Actual cloth panels meet edge-to-edge; stripes are geometry colors, not floating decals.
    for(let i=0;i<(portrait?32:1);i++){
        const width=Math.PI*2/(portrait?32:1),garment=new THREE.LatheGeometry(profile,portrait?1:28,i*width,width);garment.scale(1,1,.72);kit.geometries.push(garment)
        const stripe=Math.abs(Math.sin((i+.5)*width));part(garment,portrait?(stripe<.25||stripe>.62&&stripe<.91?'blue':'cream'):coat,[0,0,0],[1,1,1],torso)
    }
    const seam=kit.materials[coat].clone();seam.color.multiplyScalar(.82);kit.extras.push(seam)
    const hem=new THREE.LatheGeometry((portrait?[[.277,.025],[.287,.025],[.294,.043],[.290,.055],[.282,.047]]:[[.309,.025],[.319,.025],[.326,.043],[.322,.055],[.314,.047]]).map(([x,y])=>new THREE.Vector2(x!,y!)),28);hem.scale(1,1,.72);kit.geometries.push(hem);const hemMesh=part(hem,portrait?'cream':coat,[0,0,0],[1,1,1],torso);if(!portrait)hemMesh.material=seam
    // A small soft collar and cloth pockets follow one continuous A-line garment.
    if(!portrait)for(const side of [-1,1]){
        const collar=part(kit.sphere,'cream',[side*.068,.515,.147],[.075,.048,.026],torso);collar.rotation.z=side*.35
        const pocket=part(kit.rounded,coat,[side*.17,.17,.195],[.14,.14,.022],torso);pocket.rotation.y=side*.55;pocket.material=seam
        const welt=part(kit.rounded,coat,[side*.17,.238,.198],[.145,.014,.027],torso);welt.rotation.y=side*.55
    }
    if(portrait){const collar=new THREE.TorusGeometry(.10,.022,6,24);collar.rotateX(Math.PI/2);kit.geometries.push(collar);part(collar,'cream',[0,.535,0],[1,1,.76],torso);part(kit.sphere,'gold',[-.12,.40,.183],[.027,.035,.009],torso)}
    else part(kit.sphere,'gold',[0,.425,.21],[.025,.025,.012],torso)
    part(kit.cylinder,'skin',[0,.60,0],[.10,.14,.095],torso)
    part(kit.sphere,'skin',[0,.24,0],[.345,.365,.295],head)
    for(const side of [-1,1]){part(kit.sphere,'skin',[side*.335,.21,0],[.070,.09,.045],head);part(kit.sphere,'coral',[side*.35,.21,.027],[.026,.043,.012],head)}
    part(kit.sphere,'skin',[0,.17,.285],[.045,.05,.058],head)
    if(portrait){
        // The portrait host keeps his short, receding cut and close beard.
        const hair=new THREE.SphereGeometry(1,24,14),hp=hair.attributes.position!
        for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i),theta=Math.acos(THREE.MathUtils.clamp(y,-1,1)),phi=Math.atan2(z,x),end=1.02+(1-Math.max(0,Math.sin(phi)))*1.05,t=theta/Math.PI*end;hp.setXYZ(i,Math.sin(t)*Math.cos(phi)*.362,Math.cos(t)*.375+.25,Math.sin(t)*Math.sin(phi)*.315-.025)}hair.computeVertexNormals();kit.geometries.push(hair);part(hair,'hair',[0,0,0],[1,1,1],head)
        for(const [i,x] of [-.16,0,.15].entries()){const lock=part(kit.sphere,'hair',[x,.565-i*.018,.12],[.115,.065,.17],head);lock.rotation.z=-.18}
        head.userData.hairstyle='portrait-crop'
    }else buildCharacterHair(kit,part,head,look.hairstyle??(resident?'bob':'swept'))
    if(portrait){
        // A close jaw beard follows the face rather than covering it with a separate ball.
        const positions:number[]=[]
        function beardPoint(u:number,v:number){const theta=1.53+v*1.12,phi=.08+u*(Math.PI-.16);return new THREE.Vector3(Math.cos(phi)*Math.sin(theta)*.349,.24+Math.cos(theta)*.369,Math.sin(phi)*Math.sin(theta)*.301)}
        for(let row=0;row<10;row++)for(let col=0;col<24;col++){
            const a=beardPoint(col/24,row/10),b=beardPoint((col+1)/24,row/10),c=beardPoint((col+1)/24,(row+1)/10),d=beardPoint(col/24,(row+1)/10),center=a.clone().add(c).multiplyScalar(.5)
            if(Math.abs(center.x)<.12&&center.y>.018||center.y>.17&&Math.abs(center.x)<.20)continue
            positions.push(...a,...b,...c,...a,...c,...d)
        }
        const jaw=new THREE.BufferGeometry();jaw.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));jaw.computeVertexNormals();kit.geometries.push(jaw);part(jaw,'wood',[0,0,0],[1,1,1],head).material=beard!
        for(const side of [-1,1]){const moustache=part(kit.sphere,'wood',[side*.045,.115,.296],[.060,.021,.019],head);moustache.material=beard!;moustache.rotation.z=side*-.12;part(kit.sphere,'hair',[side*.328,.22,.025],[.018,.070,.045],head)}
    }
    const shoeShape=new THREE.Shape();shoeShape.moveTo(-.10,-.14);shoeShape.bezierCurveTo(-.13,-.14,-.13,-.04,-.13,.08);shoeShape.bezierCurveTo(-.13,.17,-.08,.23,0,.23);shoeShape.bezierCurveTo(.08,.23,.13,.17,.13,.08);shoeShape.bezierCurveTo(.13,-.04,.13,-.14,.10,-.14);shoeShape.closePath()
    const sole=new THREE.ExtrudeGeometry(shoeShape,{depth:.020,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,curveSegments:10});sole.rotateX(Math.PI/2);sole.translate(0,-.15,0)
    const tread=new THREE.ExtrudeGeometry(shoeShape,{depth:.006,bevelEnabled:false,curveSegments:10});tread.rotateX(Math.PI/2);tread.translate(0,-.174,0);kit.geometries.push(sole,tread)
    for(const side of [-1,1]){
        const eye=joint('eye_'+side,head,[side*.135,.245,.267]);if(portrait)eye.scale.set(.88,.78,.9);eyes.push(eye)
        part(kit.sphere,'cream',[0,0,0],[.075,.103,.033],eye);part(kit.sphere,'navy',[0,-.003,.028],[.043,.068,.023],eye);part(kit.sphere,'cream',[-.014,.031,.047],[.016,.022,.012],eye)
        part(kit.sphere,'coral',[side*.082,-.10,-.009],[.048,.022,.009],eye)
        const brow=part(kit.sphere,'hair',[side*.135,.39,.267],[.080,.018,.023],head);brow.rotation.z=side*-.12
        if(!portrait&&(!resident||look.glasses)){const path=new THREE.EllipseCurve(0,0,.102,.126,0,Math.PI*2,false,0),points=path.getPoints(24).map(p=>new THREE.Vector3(p.x,p.y,0)),g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),24,.009,6,true);kit.geometries.push(g);part(g,'navy',[side*.135,.245,.315],[1,1,1],head)}
        const name=side>0?'l':'r',arm=joint('upperarm_'+name,torso,[side*.27,.46,0]),lower=joint('lowerarm_'+name,arm,[0,-.23,0]),hand=joint('hand_'+name,lower,[0,-.20,0])
        const sleeve=new THREE.LatheGeometry((portrait?[[0,.045],[.08,.04],[.106,.005],[.115,-.06],[.105,-.15],[.09,-.17],[0,-.17]]:[[0,.045],[.08,.04],[.106,.005],[.115,-.06],[.105,-.17],[.09,-.235],[0,-.235]]).map(([x,y])=>new THREE.Vector2(x!,y!)).reverse(),20);kit.geometries.push(sleeve);part(sleeve,portrait?'blue':coat,[0,0,0],[1,1,1],arm)
        if(portrait){capsule(new THREE.Vector3(0,-.15,0),new THREE.Vector3(0,-.25,0),.074,'skin',arm);part(kit.cylinder,'cream',[0,-.157,0],[.107,.025,.107],arm)}
        const forearm=new THREE.LatheGeometry([[0,.025],[.085,.025],[.09,-.035],[.075,-.16],[.079,-.195],[0,-.195]].map(([x,y])=>new THREE.Vector2(x!,y!)).reverse(),18);kit.geometries.push(forearm);part(forearm,portrait?'skin':coat,[0,0,0],[1,1,1],lower)
        if(!portrait)part(kit.cylinder,'cream',[0,-.182,0],[.09,.035,.09],lower)
        part(kit.sphere,'skin',[0,-.04,.015],[.064,.083,.060],hand);part(kit.sphere,'skin',[-side*.02,-.02,.070],[.024,.04,.026],hand)
        const hip=joint('thigh_'+name,pelvis,[side*.135,0,0]),knee=joint('calf_'+name,hip,[0,-ORIGINAL_POSE_METRICS.upperLeg,0]),foot=joint('foot_'+name,knee,[0,-ORIGINAL_POSE_METRICS.lowerLeg,0])
        const shorts=new THREE.LatheGeometry([[0,.03],[.11,.03],[.133,-.04],[.14,-.18],[.14,-.245],[0,-.245]].map(([x,y])=>new THREE.Vector2(x!,y!)).reverse(),20);kit.geometries.push(shorts);part(shorts,'navy',[0,0,0],[1,1,1],hip)
        capsule(new THREE.Vector3(0,.015,0),new THREE.Vector3(0,-.17,0),.058,'skin',knee)
        part(kit.cylinder,'cream',[0,-.20,0],[.065,.13,.065],knee);part(kit.cylinder,'blue',[0,-.147,0],[.067,.013,.067],knee)
        part(kit.sphere,'wood',[0,-.081,.045],[.127,.077,.185],foot)
        part(sole,'cream',[0,0,0],[1,1,1],foot);part(tread,'navy',[0,0,0],[1,1,1],foot)
        part(kit.rounded,'sand',[0,-.006,.025],[.15,.018,.075],foot).rotation.x=-.12
    }
    if(!portrait&&(!resident||look.glasses))part(kit.rounded,'navy',[0,.255,.318],[.07,.016,.016],head)
    const smile=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.045,.065,.275),new THREE.Vector3(0,.050,.288),new THREE.Vector3(.045,.065,.275)]),10,.009,5,false);kit.geometries.push(smile);part(smile,'wood',[0,0,0],[1,1,1],head)
    if(!portrait){part(kit.rounded,resident?'coral':'gold',[-.07,.25,-.25],[.28,.27,.11],torso);part(kit.rounded,'wood',[-.07,.335,-.313],[.29,.09,.035],torso);capsule(new THREE.Vector3(.21,.50,-.14),new THREE.Vector3(-.18,.19,-.30),.019,'sand',torso)}
    parts.forEach((meshes,parent)=>mergeCharacterParts(kit,meshes,parent))
    const socket=joint('seasonal-hat',head,[0,.45,-.025]);socket.scale.setScalar(1.23);const wardrobe=resident?undefined:createHatWardrobe(kit,socket);socket.visible=false
    const scale=look.scale??(resident?.95:1),strideScale=resident?.60:1,clips=createOriginalMotions({strideScale}),motion=createCharacterMotion(rig,clips,resident?.34:0,{walkStride:ORIGINAL_POSE_METRICS.walkStride*strideScale*scale,runStride:ORIGINAL_POSE_METRICS.runStride*strideScale*scale,runStart:2.6,runFull:4.2,waveRate:1,walkFull:resident?.18:.8})
    let blinkTime=resident?2.2:0
    avatar.scale.setScalar(scale)
    return{avatar,motion,head,source:'original' as const,clips,hats:{set(id:HatId){socket.visible=id!=='everyday';if(id!=='everyday')wardrobe?.set(id)}},express(dt:number,reduced:boolean){blinkTime+=dt;const phase=blinkTime%4.3,opening=reduced?1:phase>4.10?Math.max(.06,Math.abs((phase-4.2)/.1)):1;eyes.forEach(eye=>{eye.scale.y=Math.min(1,opening)*(portrait?.78:1)})},dispose(){motion.dispose();avatar.removeFromParent()}}
}
