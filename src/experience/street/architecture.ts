import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { StreetArtist } from './art-kit.ts'
import type { ArtColor } from '../explorer/art-kit.ts'
import { groundY,roadCenter } from './level.ts'

/** Original rounded neighborhood architecture, composed at the cast's three-head scale. */
export function buildStreetArchitecture(a:StreetArtist){
    const {kit,mesh,beam,curve,root,sign}=a,windows:THREE.Mesh[]=[]
    function block(color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D,r=.10){const g=new RoundedBoxGeometry(...s,3,r);kit.geometries.push(g);return mesh(g,color,p,[1,1,1],parent)}
    // Low-poly box proxies use the same dimensions as their soft visual shells.
    function solid(color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D){block(color,p,s,parent);const proxy=mesh(kit.box,color,p,s,parent,{solid:true});proxy.visible=false;kit.staticMeshes.splice(kit.staticMeshes.indexOf(proxy),1);proxy.removeFromParent()}
    function arch(width:number,height:number,depth:number){const shape=new THREE.Shape();shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height*.10);shape.absarc(0,height*.10,width/2,0,Math.PI,false);shape.lineTo(-width/2,-height/2);const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.035,bevelSize:.04,bevelSegments:3,curveSegments:18});g.center();kit.geometries.push(g);return g}
    function window(parent:THREE.Object3D,x:number,y:number,z:number,w=1.1,h=1.2){
        mesh(arch(w+.24,h+.23,.18),'wood',[x,y,z],[1,1,1],parent);mesh(arch(w,h,.08),'navy',[x,y,z+.13],[1,1,1],parent)
        block('cream',[x,y-.04,z+.22],[.065,h*.85,.07],parent);block('cream',[x,y-.10,z+.22],[w,.065,.07],parent)
        block('cream',[x,y-h*.48-.1,z+.16],[w+.4,.16,.4],parent)
        const glow=kit.mesh(arch(w*.87,h*.85,.015),'gold',[x,y,z+.177],[1,1,1],parent,true,false);glow.visible=false;windows.push(glow)
    }
    function pot(parent:THREE.Object3D,x:number,y:number,z:number,size=.45){
        mesh(kit.cylinder,'coral',[x,y+size*.39,z],[size*.6,size*.78,size*.6],parent);mesh(kit.torus,'cream',[x,y+size*.79,z],[size*.59,size*.59,size*.59],parent).rotation.x=Math.PI/2
        for(let i=0;i<5;i++){const angle=i*2.4;const stem=mesh(kit.sphere,i%2?'green':'grass',[x+Math.sin(angle)*size*.24,y+size*1.12,z+Math.cos(angle)*size*.23],[size*.16,size*.55,size*.13],parent);stem.rotation.z=Math.sin(angle)*.45}
    }
    function cottage(x:number,z:number,width:number,height:number,depth:number,roofColor:ArtColor,name:string){
        const house=root(x,z,groundY(z));solid('cream',[0,height/2,0],[width,height,depth],house)
        block('sand',[0,.16,depth/2+.03],[width+.12,.33,.2],house)
        const shape=new THREE.Shape();shape.moveTo(-width/2-.3,0);shape.quadraticCurveTo(-width*.23,height*.08,0,1.15);shape.quadraticCurveTo(width*.23,height*.08,width/2+.3,0);shape.lineTo(width/2+.3,-.22);shape.quadraticCurveTo(width*.23,-.04,0,.92);shape.quadraticCurveTo(-width*.23,-.04,-width/2-.3,-.22);shape.closePath()
        const roof=new THREE.ExtrudeGeometry(shape,{depth:depth+.65,bevelEnabled:true,bevelThickness:.10,bevelSize:.09,bevelSegments:3,curveSegments:14});roof.translate(0,height,-depth/2-.325);kit.geometries.push(roof);mesh(roof,roofColor,[0,0,0],[1,1,1],house)
        for(let i=0;i<6;i++){const rz=-depth/2+i*depth/5;curve([[-width/2-.26,height+.05,rz],[-width*.24,height+.63,rz],[0,height+1.18,rz],[width*.24,height+.63,rz],[width/2+.26,height+.05,rz]],.037,roofColor,house)}
        block('coral',[width*.27,height+.57,-depth*.22],[.47,1.25,.55],house);block('cream',[width*.27,height+1.22,-depth*.22],[.63,.16,.68],house)
        window(house,-width*.24,height*.65,depth/2+.08,1.05,1.2)
        mesh(arch(1.02,1.83,.17),'wood',[width*.23,.94,depth/2+.10],[1,1,1],house);mesh(arch(.82,1.59,.07),'blue',[width*.23,.94,depth/2+.22],[1,1,1],house)
        mesh(kit.sphere,'gold',[width*.23+.25,.96,depth/2+.30],[.06,.06,.045],house)
        block('cream',[width*.23,.04,depth/2+.43],[1.48,.15,.8],house)
        block(roofColor,[-width*.25,height*.48,depth/2+.38],[1.46,.18,.87],house).rotation.x=.14
        sign(name,1.75,.36,[0,height*.93,depth/2+.20],house)
        for(const px of [-width*.39,width*.40])pot(house,px,0,depth/2+.42,.43)
        const side=new THREE.Group();side.position.set(x<0?width/2+.02:-width/2-.02,0,0);side.rotation.y=x<0?Math.PI/2:-Math.PI/2;house.add(side)
        window(side,-.8,height*.6,.05,1.3,1.25);window(side,1.2,height*.6,.05,.9,1.25)
        block('wood',[-.8,height*.6-.8,.25],[1.7,.22,.55],side)
        for(const dx of [-1.2,-.6])pot(side,dx,height*.6-.69,.28,.28)
        return house
    }
    cottage(-5.7,4.1,4.6,3.8,5.8,'blue','WORKSHOP')
    cottage(6.0,4.0,4.0,3.25,4.7,'coral','POST & HELLO')
    cottage(-5.3,-14.1,4.3,3.8,4.7,'violet','THE READING ROOM')
    cottage(6.8,-14.2,3.5,2.8,3.7,'green','GROW GOOD IDEAS')
    // A blue timber arch bridge carries the continuous walk across the stream.
    for(let i=0;i<22;i++){const z=-4.1-i*.27,y=groundY(z);block('sand',[roadCenter(z),y-.10,z],[7.0,.20,.25],kit.scene)}
    for(const side of [-1,1]){
        for(const z of [-4.2,-5.65,-7.1,-8.55,-9.8]){const x=roadCenter(z)+side*3.55,y=groundY(z);solid('blue',[x,y+.52,z],[.16,1.2,.16],kit.scene);mesh(kit.sphere,'cream',[x,y+1.15,z],[.14,.14,.14])}
        curve(Array.from({length:17},(_,i)=>{const z=-4.1-i*.36;return[roadCenter(z)+side*3.55,groundY(z)+.92,z]}),.085,'blue')
        curve(Array.from({length:17},(_,i)=>{const z=-4.1-i*.36;return[roadCenter(z)+side*3.55,groundY(z)+.42,z]}),.050,'cream')
    }
    // Curved garden walls, rounded gate posts and planted entryways frame every edge.
    for(const side of [-1,1])for(let i=0;i<12;i++){
        const z=13-i*1.35;if(z<-3)continue;const x=roadCenter(z)+side*4.05,group=root(x,z)
        if((side<0&&z>1&&z<7)||(side>0&&z>1&&z<6))continue
        solid('sand',[0,.35,0],[.33,.70,1.37],group);block('cream',[0,.74,0],[.47,.16,1.44],group)
        if(i%3===0){solid('cream',[0,.66,0],[.6,1.3,.6],group);mesh(kit.sphere,'gold',[0,1.38,0],[.23,.15,.23],group);pot(group,-side*.48,0,.35,.46)}
    }
    const mailbox=root(3.2,-.9);solid('wood',[0,.52,0],[.14,1.1,.14],mailbox);block('coral',[0,1.2,0],[.7,.61,.6],mailbox);block('cream',[0,1.43,.34],[.8,.17,.72],mailbox);block('navy',[0,1.24,.316],[.38,.04,.025],mailbox);sign('HELLO',.48,.16,[0,1.08,.318],mailbox)
    // The public square's water bowl and a bench are original toy-scale props.
    const fountain=root(-2.5,-1.8)
    solid('cream',[0,.17,0],[1.6,.34,1.6],fountain);mesh(kit.cylinder,'blue',[0,.40,0],[.85,.31,.85],fountain);mesh(kit.cylinder,'pale',[0,.57,0],[.72,.025,.72],fountain)
    mesh(kit.sphere,'gold',[0,.94,0],[.16,.35,.16],fountain);mesh(kit.sphere,'cream',[0,1.27,0],[.09,.09,.09],fountain)
    const bench=root(-3.0,-12.1);for(const z of [-.24,0,.24])block('wood',[0,.43,z],[1.65,.13,.18],bench);block('blue',[0,.93,-.30],[1.7,.48,.12],bench);for(const x of [-.61,.61])solid('blue',[x,.22,0],[.13,.44,.60],bench)
    for(const [x,z,label] of [[-3.1,3.5,'ABOUT IVAN'],[3.5,-10.5,'THE TOOLKIT'],[-2.8,-16,'HOW I BUILD']] as const){const board=root(x,z,groundY(z));beam(new THREE.Vector3(0,0,0),new THREE.Vector3(0,1.4,0),.055,'wood',board);block('cream',[0,1.33,0],[1.6,.53,.18],board);sign(label,1.43,.34,[0,1.33,.102],board)}
    return{windows,pot}
}
