import {lighthouse,lighthouseTarget} from './lighthouse.ts'
import {coastalBlocked} from './coastal-crossing.ts'
import {wildObstacles,caveTargets,coastalLookout} from './wild-land.ts'
import {homeLandingTargets} from './home-layout.ts'
import {random,wet,pathDistance,distance,segmentDistance} from './geography.ts'
import {bridgeBlocked,riverCrossings} from './bridge.ts'
import {insideBuildingFootprint,insideRoundFootprint,buildingMapPoint} from './building-footprint.ts'
import {windmill} from './windmill.ts'
import {duckDock,duckDockBlocked,dockMapPoint} from './duck-dock.ts'
import {harborArrival,harborBlocked} from './harbor.ts'
import {secretTargets} from './secrets.ts'
import {cityQuarters,cityObstacles,cityTrees,inCity} from './city-district.ts'
import {japanBuildings,japanStops,japanObstacles,japanGardenTrees,inJapan} from './japan-district.ts'
import {cityResidents} from './city-residents.ts'
import {cityRoomHosts} from './city-room-layout.ts'
import {fittedCityModel,cityModelDoors} from './city-model-specs.ts'
import {worldPlaces,expansionTrees} from './world-expansion.ts'
import {expansionObstacles} from './world-expansion-obstacles.ts'
import type {MapPoint,RoomId,Target} from './types.ts'
export interface Building extends MapPoint {id:string;width:number;depth:number;height:number;roof:'blue'|'coral'|'violet'|'green';enter?:RoomId;name:string;floors?:1|2|3;style?:'village'|'city'|'japanese';cityModel?:string;modelFront?:'front'|'east'|'west'}
export const buildings:Building[]=[
 {id:'workshop',x:-9,z:6,...fittedCityModel('Cube008',5.4,5.2),cityModel:'Cube008',floors:2,roof:'blue',enter:'workshop',name:'The Workshop'},
 {id:'library',x:9,z:-25,...fittedCityModel('Cube010',5.8,5.4),cityModel:'Cube010',floors:2,roof:'violet',enter:'library',name:'The Library'},
 {id:'post',x:15,z:17,...fittedCityModel('Cube004',4.5,4.5),cityModel:'Cube004',roof:'coral',name:'Post Office'},
 {id:'cottage-a',x:-19,z:20,...fittedCityModel('Cube010',5.2,4.8),cityModel:'Cube010',floors:3,roof:'coral',enter:'home',name:'Ivan’s House'},
 {id:'cottage-b',x:26,z:-23,...fittedCityModel('Cube013',4.3,4.4),cityModel:'Cube013',floors:2,roof:'green',name:'Gardener’s House'},
 {id:'cottage-c',x:-25,z:1,...fittedCityModel('Cube012',3.6,4.0),cityModel:'Cube012',roof:'blue',name:'Windmill Cottage'},
 {id:'city-cafe',x:-8,z:32,...fittedCityModel('Cube008',5.2,4.8),cityModel:'Cube008',floors:2,roof:'coral',style:'city',name:'Corner Café',enter:'cafe'},
 {id:'city-books',x:8,z:32,...fittedCityModel('Cube010',5.2,4.8),cityModel:'Cube010',floors:2,roof:'blue',style:'city',name:'Paper & Ink',enter:'bookshop'},
 {id:'city-market',x:-10,z:41,...fittedCityModel('Cube004',4.8,4.8),cityModel:'Cube004',roof:'green',style:'city',name:'Market Hall'},
 {id:'city-studio',x:10,z:41,...fittedCityModel('Cube015',4.8,4.8),cityModel:'Cube015',floors:2,roof:'violet',style:'city',name:'City Studio'},
 {id:'city-apartments',x:-13,z:50,...fittedCityModel('Cube012',4.4,4.8),cityModel:'Cube012',floors:2,roof:'blue',style:'city',name:'Bluebell House'},
 {id:'city-garden',x:13,z:50,...fittedCityModel('Cube013',4.4,4.8),cityModel:'Cube013',floors:2,roof:'coral',style:'city',name:'Garden Corner'},
 {id:'city-bakery',x:-33,z:32,...fittedCityModel('Cube004',4.6,4.6),cityModel:'Cube004',roof:'coral',style:'city',name:'Sunrise Bakery'},
 {id:'city-atelier',x:-50,z:32,...fittedCityModel('Cube012',4.4,4.4),cityModel:'Cube012',roof:'violet',style:'city',name:'Thread & Thimble'},
 {id:'city-grocer',x:33,z:32,...fittedCityModel('Cube009',4.6,4.6),cityModel:'Cube009',roof:'green',style:'city',name:'The Green Basket'},
 {id:'city-records',x:50,z:32,...fittedCityModel('Cube010',4.4,4.4),cityModel:'Cube010',roof:'blue',style:'city',name:'Bluebird Records'},
 {id:'city-workrooms',x:-33,z:41,...fittedCityModel('Cube015',4.0,4.4),cityModel:'Cube015',roof:'blue',style:'city',name:'Makers’ Row'},
 {id:'city-florist',x:-50,z:41,...fittedCityModel('Cube004',4.0,4.2),cityModel:'Cube004',roof:'green',style:'city',name:'Petal & Stem'},
 {id:'city-noodles',x:33,z:41,...fittedCityModel('Cube013',4.0,4.4),cityModel:'Cube013',roof:'coral',style:'city',name:'Noodle Corner'},
 {id:'city-arcade',x:50,z:41,...fittedCityModel('Cube008',4.0,4.2),cityModel:'Cube008',enter:'arcade',roof:'violet',style:'city',name:'Pixel Arcade'},
 {id:'city-tide-house',x:-33,z:48,...fittedCityModel('Cube013',3.6,3.8),cityModel:'Cube013',roof:'violet',style:'city',name:'Tide House'},
 {id:'city-ceramics',x:-50,z:48,...fittedCityModel('Cube010',3.6,3.8),cityModel:'Cube010',enter:'ceramics',roof:'coral',style:'city',name:'Clay & Co.'},
 {id:'city-observatory',x:33,z:48,...fittedCityModel('Cube010',3.6,3.8),cityModel:'Cube010',roof:'blue',style:'city',name:'Starling House'},
 {id:'city-tea',x:50,z:48,...fittedCityModel('Cube008',3.6,3.8),cityModel:'Cube008',roof:'green',style:'city',name:'Seabreeze Tea'},
 ...japanBuildings,
]
const buildingDoors:Target[]=buildings.filter(house=>house.cityModel&&house.enter).map(house=>{
 const door=cityModelDoors[house.cityModel!]!,position=buildingMapPoint(house,door.x*house.width,house.depth/2+.5)
 const room=house.enter!,label=room==='home'?'Visit Ivan’s house':room==='workshop'?'Enter workshop':room==='library'?'Enter library':`Enter ${house.name}`
 return{id:`${room}-door`,name:house.name,label,kind:'door',topic:room==='workshop'?'approach':room==='library'||room==='bookshop'?'history':'about',...position,radius:2.3,arrival:buildingMapPoint(house,door.x*house.width,house.depth/2+1.4),interior:room}
})
export const targets:Target[]=[
 ...secretTargets,
 ...buildingDoors,...caveTargets,...homeLandingTargets,coastalLookout,lighthouseTarget,
 ...cityResidents.map(person=>({id:person.id,name:person.name,label:`Chat with ${person.name}`,kind:'person' as const,topic:person.topic,x:person.x,z:person.z,radius:3,arrival:{x:person.x+.7,z:person.z+1.8}})),
 ...Object.entries(cityRoomHosts).map(([room,host])=>({...host,label:`Chat with ${host.name}`,kind:'person' as const,topic:room==='arcade'?'toolkit' as const:room==='ceramics'?'approach' as const:room==='cafe'?'about' as const:'history' as const,radius:3,room:room as RoomId})),
 {id:'mira',name:'Mira',label:'Chat with Mira',kind:'person',topic:'about',x:-3,z:10,radius:3,arrival:{x:-2,z:12}},
 {id:'sol',name:'Sol',label:'Chat with Sol',kind:'person',topic:'toolkit',x:22,z:-14,radius:3,arrival:{x:22,z:-16}},
 {id:'theo',name:'Theo',label:'Chat with Theo',kind:'person',topic:'approach',x:-1.7,z:-1.4,radius:3,arrival:{x:-.7,z:1.1},room:'workshop'},
 {id:'ivan',name:'Ivan',label:'Say hi to Ivan',kind:'person',topic:'approach',x:2,z:.5,radius:2.1,arrival:{x:1.3,z:1.8},room:'home'},
 {id:'rue',name:'Rue',label:'Chat with Rue',kind:'person',topic:'history',x:1.5,z:-1.7,radius:3,arrival:{x:.2,z:-.2},room:'library'},
 {id:'postbox',name:'The postbox',label:'Leave a hello',kind:'object',topic:'contact',x:11,z:17,radius:2.5,arrival:{x:9.7,z:17.5}},
 {id:'patch',name:'Patch',label:'Meet Patch',kind:'animal',topic:'animal',x:-1.5,z:16,radius:2.7,arrival:{x:-1,z:18}},
 {id:'miso',name:'Miso',label:'Meet Miso',kind:'animal',topic:'animal',x:-2.7,z:1.5,radius:2.4,arrival:{x:-1.15,z:1.7},room:'library'},
 {id:'duck-pond',name:'The duck pond',label:'Feed the ducks',kind:'animal',topic:'animal',x:duckDock.x,z:duckDock.z,radius:4,arrival:dockMapPoint(-1.15,0)},
 {id:'fox',name:'Clover the fox',label:'Meet Clover',kind:'animal',topic:'animal',x:-19,z:13,radius:3,arrival:{x:-17,z:13}},
 {id:'windmill',name:'The windmill',label:'Turn the windmill',kind:'object',topic:'environment',x:windmill.x+2,z:windmill.z,radius:3,arrival:{x:windmill.x+4,z:windmill.z}},
 {id:'bell',name:'The wishing bell',label:'Ring the bell',kind:'object',topic:'environment',x:-10,z:25,radius:3,arrival:{x:-8.6,z:25}},
 {id:'campfire',name:'The campfire',label:'Tend the campfire',kind:'object',topic:'environment',x:20,z:-18,radius:3,arrival:{x:18.8,z:-18}},
 {id:'notebook',name:'Ivan’s notebook',label:'Try the workbench',kind:'object',topic:'approach',x:0,z:-2.8,radius:2.4,arrival:{x:0,z:-1.1},room:'workshop'},
 {id:'lamp',name:'The desk lamp',label:'Switch the desk lamp',kind:'object',topic:'environment',x:2.5,z:-2.5,radius:2.3,arrival:{x:1.4,z:-1},room:'workshop'},
 ...cityQuarters.map(quarter=>({...quarter,kind:'place' as const,topic:'environment' as const,radius:3})),
 ...japanStops.map(stop=>({...stop,kind:'place' as const,topic:'environment' as const,radius:3})),
 ...worldPlaces.map(place=>({...place,kind:'place' as const,topic:'environment' as const,radius:3})),
 ...riverCrossings.filter(crossing=>crossing.id!=='central-bridge').map(crossing=>({id:crossing.id,name:crossing.name,label:`Visit ${crossing.name}`,kind:'place' as const,topic:'environment' as const,x:crossing.x,z:(crossing.startZ+crossing.endZ)/2,radius:(crossing.endZ-crossing.startZ)/2+2.4,arrival:{x:crossing.x,z:crossing.endZ+1.3}})),
 {id:'harbor',name:'The harbor',label:'Visit the harbor',kind:'place',topic:'environment',x:harborArrival.x,z:harborArrival.z,radius:6,arrival:harborArrival},
 {id:'exit-workshop',name:'Workshop door',label:'Go outside',kind:'exit',topic:'environment',x:0,z:3.7,radius:2.4,arrival:{x:0,z:2.8},room:'workshop'},
 {id:'exit-library',name:'Library door',label:'Go outside',kind:'exit',topic:'environment',x:0,z:3.7,radius:2.4,arrival:{x:0,z:2.8},room:'library'},
 {id:'exit-home',name:'Home door',label:'Go outside',kind:'exit',topic:'environment',x:0,z:3.7,radius:2.4,arrival:{x:0,z:2.8},room:'home'},
 ...(['arcade','ceramics','crystal-cave','tide-cave'] as const).map(room=>({id:`exit-${room}`,name:'Outside door',label:'Go outside',kind:'exit' as const,topic:'environment' as const,x:0,z:3.7,radius:2.4,arrival:{x:0,z:2.8},room})),
 {id:'exit-cafe',name:'Café door',label:'Go outside',kind:'exit',topic:'environment',x:0,z:3.7,radius:2.4,arrival:{x:0,z:2.8},room:'cafe'},
 {id:'exit-bookshop',name:'Bookshop door',label:'Go outside',kind:'exit',topic:'environment',x:0,z:3.7,radius:2.4,arrival:{x:0,z:2.8},room:'bookshop'},
]
export function blocked(p:MapPoint){return insideRoundFootprint(p,lighthouse,.32)||coastalBlocked(p)||bridgeBlocked(p)||wildObstacles.some(shape=>insideBuildingFootprint(p,shape,.32))||harborBlocked(p)||duckDockBlocked(p)||insideRoundFootprint(p,windmill,.32)||buildings.some(b=>insideBuildingFootprint(p,b,.32))||cityObstacles.some(b=>insideBuildingFootprint(p,b,.32))||japanObstacles.some(obstacle=>insideBuildingFootprint(p,obstacle,.32))||japanGardenTrees.some(tree=>insideRoundFootprint(p,tree,.32))||expansionObstacles.some(obstacle=>insideBuildingFootprint(p,obstacle,.32))||treeSites.some(t=>distance(p,t)<.44)}
export const mapStops=['home-door','mira','workshop-door','library-door','harbor','city-square','cafe-door','bookshop-door','arcade-door','ceramics-door',...caveTargets.map(target=>target.id),'coastal-lookout',lighthouse.id,...cityResidents.map(person=>person.id),'city-west','city-east','japan-quarter','japan-courtyard',...worldPlaces.map(place=>place.id),...riverCrossings.filter(crossing=>crossing.id!=='central-bridge').map(crossing=>crossing.id),'sol','postbox','duck-pond','patch','fox','bell','windmill','campfire']
export const residents=[{id:'mira',x:-3,z:10,phase:0},{id:'sol',x:22,z:-14,phase:2.4}]

export const treeSites:({size:number;pine:boolean}&MapPoint)[]=cityTrees.filter(tree=>!targets.some(t=>!t.room&&(distance(tree,t.arrival)<3.8||segmentDistance(tree,t.arrival,{x:t.arrival.x+.8,z:t.arrival.z+8})<4.5))).map(tree=>({...tree}))
const rng=random(9041)
for(let i=0;i<1100&&treeSites.length<100;i++){const p={x:(rng()-.5)*88,z:(rng()-.5)*76};if(wet(p)||inCity(p,2)||inJapan(p,2)||distance(p,{x:21,z:5})<8||pathDistance(p)<4.3||buildings.some(b=>insideBuildingFootprint(p,b,3))||targets.some(t=>!t.room&&(distance(t,p)<3.8||segmentDistance(p,t.arrival,{x:t.arrival.x+.8,z:t.arrival.z+8})<4.5))||treeSites.some(t=>distance(t,p)<3.2))continue;treeSites.push({...p,size:.8+rng()*.5,pine:rng()>.72})}
const expansionTreeLimit=treeSites.length+60
for(const tree of expansionTrees){
 if(treeSites.length>=expansionTreeLimit)break
 if(!wet(tree)&&pathDistance(tree)>3.3&&!blocked(tree)&&!treeSites.some(other=>distance(tree,other)<3.2)&&!expansionObstacles.some(obstacle=>insideBuildingFootprint(tree,obstacle,2))&&!targets.some(target=>!target.room&&(distance(target.arrival,tree)<3.8||segmentDistance(tree,target.arrival,{x:target.arrival.x+.8,z:target.arrival.z+8})<4.5)))treeSites.push(tree)
}
