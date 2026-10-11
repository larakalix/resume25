import * as THREE from 'three'
import type { StreetArtist } from './art-kit.ts'
import { roadCenter } from './level.ts'

export function buildStreetLandscape(a:StreetArtist){
    const {kit,mesh,beam,curve,root}=a
    // Two planted banks leave an actual open water channel under the bridge.
    for(const [z,depth] of [[7,24],[-19,20]])mesh(kit.rounded,'grass',[0,-.46,z!],[38,.85,depth!],undefined,{castShadow:false})
    function path(from:number,to:number){
        const points:number[]=[],indices:number[]=[]
        for(let i=0;i<=90;i++){const z=THREE.MathUtils.lerp(from,to,i/90),c=roadCenter(z);points.push(c-3.45,.018,z,c+3.45,.018,z);if(i<90){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2)}}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();kit.geometries.push(g);mesh(g,'sand',[0,0,0],[1,1,1],undefined,{castShadow:false})
        // Staggered large paving stones: warm, generous surfaces rather than tiny visual noise.
        for(let z=from-.6;z>to;z-=1.15)for(let side=-1;side<=1;side++){const x=roadCenter(z)+side*1.88+(Math.round(z)%2)*.12;const stone=mesh(kit.rounded,Math.round(z*3)%3?'cream':'sand',[x,.021,z],[1.65,.045,.92],undefined,{castShadow:false});stone.rotation.y=Math.sin(z*3+side)*.035}
    }
    path(15,-4.0);path(-10,-26)
    const waterMaterial=new THREE.MeshStandardMaterial({color:0x63cbd9,roughness:.22,metalness:.12}),waterGeometry=new THREE.PlaneGeometry(44,4.7,36,14)
    waterGeometry.rotateX(-Math.PI/2);waterGeometry.translate(0,-.16,-7);kit.geometries.push(waterGeometry);kit.extras.push(waterMaterial)
    const water=new THREE.Mesh(waterGeometry,waterMaterial);water.receiveShadow=true;kit.scene.add(water)
    const foam=root(0,-7,-.135)
    for(let i=0;i<23;i++){const x=-18+i*1.67,z=Math.sin(i*2.3)*1.5;curve([[x-.5,0,z],[x-.13,.012,z+.07],[x+.27,0,z]],.021,'cream',foam)}
    const leafGeometry=new THREE.SphereGeometry(1,16,12),lp=leafGeometry.attributes.position!
    for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),r=1+Math.sin(x*9+z*7)*.025;lp.setXYZ(i,x*r,y*r,z*r)}leafGeometry.computeVertexNormals();kit.geometries.push(leafGeometry)
    function tree(x:number,z:number,size:number,variant:number){
        const parent=root(x,z),h=2.5*size
        mesh(kit.cylinder,'wood',[0,h*.46,0],[.16*size,h*.92,.16*size],parent)
        beam(new THREE.Vector3(0,h*.6,0),new THREE.Vector3(-.5*size,h*.85,.15),.09*size,'wood',parent)
        for(const [px,py,pz,s] of [[0,0,0,1],[-.55,.35,.1,.8],[.5,.25,-.05,.84],[0,.75,0,.77]])mesh(leafGeometry,variant%3?'green':'grass',[px!*size,h+py!*size,pz!*size],[s!*1.05*size,s!*size,s!*size],parent)
        if(variant%2===0)for(let i=0;i<5;i++)mesh(kit.sphere,'coral',[Math.sin(i*2.4)*.70*size,h+Math.cos(i)*.43,Math.cos(i*2.4)*.76*size],[.11,.13,.11],parent)
    }
    for(const [i,p] of [[-9,8,1.25],[9.4,8.5,1.25],[-8.5,-2.3,1.15],[9,-1.3,1.05],[-10.5,-13,1.3],[10,-11,1.25],[-6,-20,1.2],[4,-22,1.2],[10,-21,1.4],[-13,4,1.5],[13,4,1.4]].entries())tree(p[0]!,p[1]!,p[2]!,i)
    // Low hedges and border flowers keep the visible ground richly inhabited.
    for(const side of [-1,1])for(let i=0;i<24;i++){
        const z=14-i*1.65;if(z<-4&&z>-10)continue
        const x=roadCenter(z)+side*(5.7+Math.sin(i*2.3)*.55)
        if((z>1&&z<8)||(z<-12&&z>-18))continue
        mesh(leafGeometry,i%3?'grass':'mint',[x,.46,z],[.7,.6,.8])
    }
    const petal=new THREE.SphereGeometry(1,8,6);kit.geometries.push(petal)
    for(let i=0;i<90;i++){
        const z=13-(i%30)*1.16;if(z<-4.1&&z>-10)continue;const side=i%2?1:-1,x=roadCenter(z)+side*(3.8+(i%5)*.23),height=.18+(i%3)*.07
        mesh(kit.cylinder,'green',[x,height/2,z],[.012,height,.012]);mesh(petal,i%3===0?'coral':i%3===1?'violet':'cream',[x,height,z],[.105,.06,.105]);mesh(petal,'gold',[x,height+.04,z],[.036,.036,.036])
    }
    // Pebbled banks and reeds define the river edge without a large texture atlas.
    for(const side of [-1,1])for(let i=0;i<24;i++){const x=-18+i*1.55;if(Math.abs(x-roadCenter(-7))<3.7)continue;mesh(kit.sphere,'cream',[x,-.09,-7+side*2.28],[.48+(i%3)*.08,.26,.35]);for(let j=0;j<2;j++){const reed=mesh(petal,'green',[x+j*.16,.20,-7+side*2.6],[.045,.30,.045]);reed.rotation.z=.15*(j?1:-1)}}
    // Distant rounded treetops close the world as a garden, not an exposed ground plane.
    for(let i=0;i<17;i++)mesh(leafGeometry,i%2?'mint':'grass',[-24+i*3,2,-28],[2.7,3.1+(i%3)*.3,2.6])
    const cloudGeometry=new THREE.SphereGeometry(1,12,8);kit.geometries.push(cloudGeometry)
    for(const [x,y,z] of [[-15,12,-26],[8,13,-34],[20,11,-24]])for(const [dx,dy,r] of [[-1.3,0,1.2],[0,.35,1.6],[1.5,0,1.1]])mesh(cloudGeometry,'cream',[x!+dx!,y!+dy!,z!],[r!*1.3,r!*.6,r!*.65],undefined,{castShadow:false})
    return{update(time:number,reduced:boolean){water.position.y=reduced?0:Math.sin(time*.7)*.018}}
}
