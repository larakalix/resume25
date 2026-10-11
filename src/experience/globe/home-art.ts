import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {homeFloorLabels,type HomeRoomId} from './home-layout.ts'

/** Home furniture stays inside the shared rear-desk and left-sofa collision footprints. */
export function buildHomeFurniture(a:GlobeArtist){
 const {kit,block,mesh}=a,desk=block('wood',[-.75,1.03,-2.75],[3.4,.18,1.3]),sofa=block('blue',[-2.8,.42,1.7],[1.5,.58,1.5])
 desk.name='home-desk';sofa.name='home-sofa'
 for(const x of [-2.25,.75])for(const z of [-3.23,-2.27])block('sand',[x,.48,z],[.12,.96,.12])
 block('navy',[-.85,1.47,-2.98],[1.3,.73,.10]);block('pale',[-.85,1.47,-2.92],[1.15,.58,.025]);block('cream',[-.85,1.15,-2.58],[1.35,.055,.49])
 for(let i=0;i<3;i++)block(i===1?'coral':'mint',[.45,1.16+i*.09,-2.85],[.43,.075,.63])
 mesh(kit.cylinder,'blue',[-.12,1.26,-2.34],[.12,.24,.12]);mesh(kit.torus,'cream',[.005,1.27,-2.34],[.07,.07,.07])
 const bookcase=block('wood',[1.8,1.08,-3.36],[1.5,2.16,.56]);bookcase.name='home-bookshelf'
 for(const y of [.18,.82,1.45,2.07])block('sand',[1.8,y,-3.03],[1.48,.065,.62])
 for(let row=0;row<3;row++)for(let i=0;i<5;i++){
  const x=1.24+i*.275,h=.34+((i+row)%3)*.07
  block((['blue','coral','mint','cream','violet'] as const)[(i+row)%5]!,[x,.23+row*.63+h/2,-3.0],[.2,h,.35])
 }
 // An armchair-like loveseat, cushions and a folded throw make the room a home rather than another workbench.
 block('blue',[-2.8,.96,2.33],[1.5,.87,.24]);for(const x of [-3.43,-2.17])block('blue',[x,.72,1.69],[.24,.62,1.45])
 for(const x of [-3.1,-2.5])block('pale',[x,.76,1.66],[.53,.20,1.11])
 const pillow=block('mint',[-3.08,1.04,2.09],[.49,.47,.17]);pillow.rotation.z=-.12
 block('cream',[-2.35,.895,1.63],[.29,.035,1.06]);block('cream',[-2.35,.70,1.08],[.29,.41,.035])
 const picture=block('wood',[.15,1.95,-3.85],[1.35,.83,.09]);picture.name='home-picture'
 block('pale',[.15,1.95,-3.79],[1.20,.69,.025]);mesh(kit.sphere,'gold',[.48,2.11,-3.755],[.12,.12,.025])
 const hill=mesh(kit.cone,'green',[-.03,1.8,-3.75],[.5,.42,.025]);hill.rotation.z=-.2
 return{desk,sofa,bookcase,picture}
}

function stairs(a:GlobeArtist,room:HomeRoomId){
 const group=new THREE.Group();group.name=room==='home-balcony'?'home-downstairs':'home-upstairs';a.scene.add(group)
 const {block,beam}=a
 if(room==='home-balcony'){
  for(let i=0;i<4;i++)block('sand',[-3.02,.045+i*.045,.68-i*.27],[1.12,.09+i*.09,.27],group)
 }else{
  for(let i=0;i<12;i++){
   const step=block('sand',[-3.02,.11*(i+1),.78-i*.24],[1.12,.22*(i+1),.25],group);step.name=`home-stair-tread-${i+1}`
  }
  for(const x of [-3.57,-2.47]){
   beam(new THREE.Vector3(x,.75,.92),new THREE.Vector3(x,3.06,-1.89),.035,'wood',group)
   for(let i=0;i<5;i++)block('wood',[x,.37+i*.55,.84-i*.60],[.055,.72,.055],group)
  }
 }
 a.sign(room==='home-balcony'?'↓ Gaming studio · 2F':room==='home'?'↑ Gaming studio · 2F':'↑ Sky lounge · 3F',[-2.82,1.75,1.10],1.7,group)
 if(room==='home-studio'){
  const down=new THREE.Group();down.name='home-studio-downstairs';a.scene.add(down)
  block('navy',[2.95,.035,2.45],[1.35,.07,1.48],down)
  for(let i=0;i<4;i++)block('sand',[2.95,.06+i*.055,2.85-i*.23],[1.14,.12+i*.11,.24],down)
  for(const x of [2.3,3.6])block('wood',[x,.53,2.38],[.055,1.02,1.58],down)
  a.sign('↓ Living room · 1F',[2.92,1.28,3.08],1.7,down)
 }
 return group
}

function gamingFurniture(a:GlobeArtist){
 const {block,mesh,kit}=a,desk=block('wood',[-.55,1.02,-2.77],[4.2,.15,1.24]);desk.name='home-gaming-desk'
 for(const x of [-2.35,1.23])for(const z of [-3.22,-2.32])block('navy',[x,.48,z],[.10,.96,.10])
 const monitors=[]
 for(const x of [-1.55,.23]){
  const screen=new THREE.Group();screen.name='home-gaming-monitor';screen.position.set(x,1.67,-2.98);a.scene.add(screen)
  block('navy',[0,0,0],[1.65,.94,.12],screen);block('pale',[0,0,.071],[1.48,.78,.025],screen)
  block('navy',[0,-.56,0],[.10,.24,.12],screen);block('navy',[0,-.69,.07],[.55,.045,.36],screen)
  // Authored editor and game tiles stay crisp without another canvas texture or screen video.
  for(let row=0;row<6;row++)block(row%3===0?'gold':row%3===1?'cream':'mint',[-.39+row%2*.08,.26-row*.10,.09],[.43+(row%3)*.12,.022,.012],screen)
  for(let row=0;row<3;row++)block(row%2?'blue':'violet',[.42,.22-row*.18,.09],[.31,.12,.012],screen)
  monitors.push(screen)
 }
 const keyboard=block('navy',[-.75,1.12,-2.34],[1.26,.055,.37]);keyboard.name='home-gaming-keyboard'
 for(let row=0;row<3;row++)for(let key=0;key<10;key++)block((['pale','violet','coral'] as const)[row]!,[-1.29+key*.12,1.155,-2.46+row*.105],[.085,.018,.069])
 mesh(kit.sphere,'pale',[.28,1.16,-2.34],[.075,.035,.10]);block('blue',[.28,1.12,-2.34],[.38,.025,.39])
 const tower=block('navy',[2.10,.62,-2.87],[.65,1.24,.83]);tower.name='home-gaming-pc'
 block('blue',[2.10,.62,-2.44],[.51,1.09,.025])
 for(const y of [.29,.62,.95]){
  const ring=mesh(kit.torus,'violet',[2.10,y,-2.41],[.18,.18,.18]);ring.name='home-pc-fan'
  mesh(kit.sphere,'pale',[2.10,y,-2.40],[.055,.055,.025])
 }
 block('pale',[-.55,.925,-2.10],[4.0,.035,.035])
 const chair=new THREE.Group();chair.name='home-gaming-chair';chair.position.set(-.55,0,-2.18);a.scene.add(chair)
 block('navy',[0,.57,0],[.72,.17,.69],chair);block('navy',[0,1.10,.30],[.74,1.05,.18],chair);block('violet',[0,1.15,.405],[.46,.75,.035],chair)
 for(const x of [-.43,.43])block('navy',[x,.84,0],[.12,.09,.64],chair)
 mesh(kit.cylinder,'navy',[0,.26,0],[.07,.48,.07],chair)
 for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;const spoke=block('navy',[Math.sin(angle)*.18,.075,Math.cos(angle)*.18],[.08,.07,.43],chair);spoke.rotation.y=angle;mesh(kit.sphere,'navy',[Math.sin(angle)*.39,.07,Math.cos(angle)*.39],[.075,.065,.075],chair)}
 const controller=block('cream',[1.10,1.18,-2.52],[.40,.09,.25]);controller.name='home-game-controller'
 mesh(kit.sphere,'navy',[.99,1.23,-2.48],[.045,.018,.045]);mesh(kit.sphere,'coral',[1.22,1.23,-2.55],[.025,.018,.025])
 a.sign('Build. Play. Repeat.',[-.65,2.67,-3.86],2.4,a.scene)
 return{desk,monitors,keyboard,tower,chair,controller}
}

/** All three floors share one deliberate shell; upper rooms are separate, explicitly connected scenes. */
export function buildHomeRoomShell(a:GlobeArtist,id:HomeRoomId){
 const {block,mesh,kit}=a,balcony=id==='home-balcony'
 const floor=block('wood',[0,-.13,0],[8.4,.26,8.4]);floor.name=`${id}-floor`
 block('cream',[0,1.55,-4.05],[8.4,3.1,.20])
 for(let i=0;i<13;i++)block('sand',[-3.9+i*.65,.013,0],[.025,.018,8])
 if(!balcony){
  block('cream',[-4.1,1.55,0],[.20,3.1,8.4]);block('cream',[4.1,1.55,0],[.20,3.1,8.4])
  for(const x of [-2.3,2.3]){block('wood',[x,1.9,-3.88],[1.8,1.6,.12]);block('pale',[x,1.9,-3.79],[1.55,1.37,.05]);block('cream',[x,1.9,-3.72],[.06,1.4,.05]);block('cream',[x,1.9,-3.72],[1.55,.06,.05])}
 }else{
  const railing=new THREE.Group();railing.name='home-rooftop-balcony-rails';a.scene.add(railing)
  for(const x of [-3.9,3.9]){block('navy',[x,1.0,0],[.065,.075,8],railing);for(let i=0;i<15;i++)block('navy',[x,.5,-3.7+i*.53],[.055,1,.055],railing)}
  block('navy',[0,1,3.9],[7.8,.075,.065],railing);for(let i=0;i<15;i++)block('navy',[-3.7+i*.53,.5,3.9],[.055,1,.055],railing)
  const sofa=block('blue',[0,.45,-2.9],[4.4,.68,1.25]);sofa.name='home-sky-lounge-sofa';block('blue',[0,.99,-3.45],[4.4,.85,.20]);for(const x of [-1.45,0,1.45])block('cream',[x,.84,-2.86],[1.30,.12,1.0])
  for(const x of [-1.2,1.2]){const pillow=block('mint',[x,1.11,-3.20],[.55,.51,.20]);pillow.rotation.z=x<0?-.12:.12}
  a.sign('A little room to think.',[0,2.2,-3.88],2.5,a.scene)
 }
 block(id==='home-studio'?'navy':'blue',[.15,.03,.5],[4.2,.04,4.5]);block('cream',[.15,.055,.5],[3.8,.014,4])
 if(id==='home')buildHomeFurniture(a)
 if(id==='home-studio')gamingFurniture(a)
 stairs(a,id)
 for(const x of [-3.4,3.4]){
  mesh(kit.cylinder,'coral',[x,.28,balcony?3.1:2.5],[.28,.56,.28])
  for(let i=0;i<4;i++){const leaf=mesh(kit.sphere,'green',[x+Math.sin(i*2.4)*.14,.84,balcony?3.1:2.5],[.13,.52,.14]);leaf.rotation.z=Math.sin(i*2.4)*.4}
 }
 if(id==='home')block('blue',[0,.04,3.95],[1.7,.06,.6])
 a.sign(homeFloorLabels[id],[0,2.85,-3.89],3.2,a.scene)
 return{floor}
}
