import type {GlobeArtist} from './art-kit.ts'
import {cityRoomFurniture} from './city-room-layout.ts'
import type {CityRoomId} from './city-room-layout.ts'

/** Small original interiors complement the imported exteriors without needing extra model downloads. */
export function buildCityRoomFurniture(a:GlobeArtist,room:CityRoomId){
 const {kit,block,mesh,sign}=a,solids=[]
 function pot(x:number,y:number,z:number,color:'coral'|'pale'|'cream',size=1){
  mesh(kit.sphere,color,[x,y+.16*size,z],[.18*size,.21*size,.18*size]);mesh(kit.cylinder,color,[x,y+.34*size,z],[.085*size,.16*size,.085*size])
  const lip=mesh(kit.torus,color,[x,y+.42*size,z],[.085*size,.085*size,.085*size]);lip.rotation.x=Math.PI/2
 }
 for(const piece of cityRoomFurniture[room]){
  const shelf=piece.name.includes('shelf'),counter=piece.name.endsWith('counter'),bench=piece.name.includes('bench'),table=piece.name==='cafe-table',stool=piece.name.includes('stool'),cabinet=piece.name.includes('cabinet'),kiln=piece.name.endsWith('kiln'),wheel=piece.name.endsWith('wheel')
  const height=shelf?2.2:cabinet?1.9:counter?1.04:bench?.52:table?.78:stool?.55:wheel?.58:kiln?1.55:.85
  const body=block(bench?(room==='cafe'?'coral':room==='arcade'?'violet':'mint'):cabinet?'navy':kiln?'cream':'wood',[piece.x,height/2,piece.z],[piece.width,height,piece.depth]);body.name=piece.name;solids.push(body)
  if(counter)block('cream',[piece.x,1.08,piece.z],[piece.width+.08,.10,piece.depth+.06])
  if(piece.name==='cafe-counter'){
   block('navy',[-2.25,1.42,-2.8],[.75,.6,.50]);block('sand',[-2.25,1.69,-2.79],[.7,.06,.47]);block('gold',[-2.25,1.40,-2.50],[.43,.13,.08])
   for(const x of [-2.4,-2.1]){mesh(kit.cylinder,'cream',[x,1.24,-2.25],[.095,.19,.095]);mesh(kit.torus,'cream',[x+.09,1.25,-2.25],[.055,.055,.055])}
   for(let i=0;i<3;i++)mesh(kit.sphere,i===1?'coral':'sand',[-.65+i*.3,1.2,-2.35],[.13,.08,.10])
   block('blue',[.65,1.29,-2.75],[.55,.28,.4]);block('navy',[.65,1.46,-2.75],[.53,.10,.18])
  }
  if(shelf){
   const side=piece.name==='bookshop-side-shelf'
   for(const y of [.18,.84,1.5,2.16])block('sand',[piece.x,y,piece.z+(side?0:.31)],[side?.62:piece.width,.065,side?piece.depth:.64])
   for(let row=0;row<3;row++)for(let i=0;i<5;i++){
    const color=(['blue','coral','mint','cream','violet'] as const)[(i+row)%5]!,h=.36+((row+i)%3)*.055,along=(i-2)*(side?.39:.34)
    block(color,[piece.x+(side?.29:along),.23+row*.66+h/2,piece.z+(side?along:.31)],[side?.34:.23,h,side?.23:.35])
   }
  }
  if(bench){
   block(room==='cafe'?'coral':room==='arcade'?'violet':'mint',[piece.x,.84,piece.z+piece.depth*.39],[piece.width,.68,.18])
   block('cream',[piece.x,.56,piece.z-.05],[piece.width-.13,.10,piece.depth-.14])
   const cushion=block(room==='cafe'?'gold':'violet',[piece.x-.42,.83,piece.z+.14],[.38,.38,.14]);cushion.rotation.z=-.15
  }
  if(table){
   block('cream',[piece.x,.80,piece.z],[piece.width+.04,.06,piece.depth+.04]);mesh(kit.cylinder,'blue',[piece.x-.2,.92,piece.z-.12],[.10,.2,.10]);block('sand',[piece.x+.2,.86,piece.z+.1],[.30,.05,.22])
  }
  if(stool)block('coral',[piece.x,.57,piece.z],[piece.width,.08,piece.depth])
  if(piece.name==='bookshop-display')for(let i=0;i<3;i++)block(i===1?'coral':'blue',[piece.x,.90+i*.09,piece.z],[.55,.075,.55])
  if(cabinet){
   const index=Number(piece.name.at(-1)),color=(['pale','gold','coral'] as const)[index]!,front=piece.z+piece.depth/2+.015
   block(color,[piece.x,1.35,front],[1.10,.85,.035]);block('navy',[piece.x,1.35,front+.025],[.92,.66,.02])
   for(let row=0;row<3;row++)for(let column=0;column<5;column++)if((row+column+index)%3!==0)block(color,[piece.x+(column-2)*.14,1.53-row*.15,front+.042],[.105,.105,.018])
   block(color,[piece.x,.88,front-.06],[1.17,.12,.30]);mesh(kit.cylinder,'navy',[piece.x-.27,1.00,front-.02],[.025,.17,.025]);mesh(kit.sphere,'coral',[piece.x-.27,1.10,front-.02],[.065,.065,.065])
   for(const x of [.12,.32])mesh(kit.cylinder,'cream',[piece.x+x,.97,front-.02],[.055,.045,.055])
   sign(['FLOW','BUILD','SHIP'][index]!,[piece.x,1.79,front+.025],.70,a.scene)
  }
  if(piece.name==='arcade-console'){
   block('violet',[piece.x,.90,piece.z],[piece.width+.04,.10,piece.depth]);block('navy',[piece.x,1.13,piece.z-.23],[.62,.40,.10]);block('pale',[piece.x,1.13,piece.z-.17],[.49,.28,.02]);mesh(kit.sphere,'gold',[piece.x,.98,piece.z+.30],[.07,.06,.07])
  }
  if(piece.name==='ceramics-counter')for(let i=0;i<6;i++)pot(piece.x-1.8+i*.66,1.14,piece.z,(['coral','pale','cream'] as const)[i%3]!,i%2?.65:1)
  if(wheel){
   mesh(kit.cylinder,'navy',[piece.x,.66,piece.z],[.56,.10,.56]);mesh(kit.cylinder,'sand',[piece.x,.73,piece.z],[.46,.05,.46]);pot(piece.x,.77,piece.z,'coral',1.25)
   block('navy',[piece.x,.15,piece.z+.4],[.40,.07,.25])
  }
  if(kiln){
   const front=piece.z+piece.depth/2+.02
   block('wood',[piece.x,.82,front],[.96,1.12,.08]);block('navy',[piece.x,.82,front+.05],[.76,.92,.03]);block('coral',[piece.x,.43,front+.07],[.64,.10,.02])
   for(const side of [-1,1])block('sand',[piece.x+side*.4,.83,front+.08],[.10,.10,.06])
   block('wood',[piece.x,1.68,piece.z-.3],[.40,.27,.35]);mesh(kit.sphere,'gold',[piece.x+.43,1.28,front+.08],[.045,.045,.025])
  }
 }
 if(room==='cafe'){
  block('navy',[0,2.0,-3.87],[1.55,.76,.06]);sign('Coffee & conversation',[0,2.0,-3.825],1.45,a.scene)
  for(const x of [-3.82,3.82])block('coral',[x,1.95,-.7],[.1,1.10,1.15])
 }else if(room==='bookshop'){
  sign('Find your next chapter',[0,2.55,-3.84],2.2,a.scene)
  block('gold',[-2.65,.65,1.3],[.7,.09,.53]);block('cream',[-2.65,.71,1.3],[.62,.035,.49])
 }else if(room==='arcade'){
  sign('Small games. Big ideas.',[0,2.60,-3.84],2.5,a.scene)
  for(const side of [-1,1])block('violet',[side*3.82,1.7,.4],[.12,1.55,.75])
 }else{
  sign('Make room for a good idea',[0,2.55,-3.84],2.8,a.scene)
  for(const x of [-2.2,-1.3,-.4]){block('sand',[x,1.94,-3.78],[.64,.065,.27]);pot(x,1.98,-3.76,'cream',.62)}
 }
 return{solids}
}
