import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {archipelagoDefinition} from '../src/experience/archipelago/definition.ts';
import {compileWorld,archipelagoWorld as world} from '../src/experience/archipelago/compile.ts';
import {frameAt,normalAt,mapAt,localToMap,mapToLocal} from '../src/experience/archipelago/terrain.ts';
import {roomLabels} from '../src/experience/globe/rooms.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
const finite=point=>Number.isFinite(point.x)&&Number.isFinite(point.z);
const sample=(a,b,step=.2)=>{const count=Math.max(1,Math.ceil(world.distance(a,b)/step));return Array.from({length:count+1},(_,index)=>world.between(a,b,index/count))};

test('new local island frames round-trip physically across the date line and both hemispheres',()=>{
 for(const island of archipelagoDefinition.islands)for(const [x,z]of [[0,0],[-12,7],[13,-11]]){
  const point=localToMap(island,x,z),back=mapToLocal(island,point);assert.ok(finite(point));assert.ok(Math.abs(x-back.x)<1e-9&&Math.abs(z-back.z)<1e-9);const n=normalAt(point.x,point.z),mapped=mapAt(n);assert.ok(world.distance(point,mapped)<1e-7);assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-12);
  const basis=frameAt(point);assert.ok(Math.abs(basis.up.x*basis.east.x+basis.up.y*basis.east.y+basis.up.z*basis.east.z)<1e-12);
 }
 assert.ok(world.islands.some(island=>Math.cos(island.anchor.x/40)<-.8),'Orchard is on the opposite hemisphere');assert.ok(world.paths.every(line=>line.slice(1).every((point,index)=>Math.abs(point.x-line[index].x)<=Math.PI*40+1e-8)),'SVG roads are explicitly split at the seam');
});

test('the authored archipelago has five ordered areas, real imported lots, meaningful relief and open sea',()=>{
 assert.deepEqual(world.districts.map(d=>d.id),['harbor','komorebi-market','maker-heights','orchard-village','tideglass-coast']);assert.equal(world.buildings.filter(b=>b.area==='harbor'&&b.assetId.startsWith('kay-building-')).length,7);assert.ok(world.buildings.some(b=>b.area==='komorebi-market'&&b.assetId==='ramen_shop-east'));assert.ok(world.buildings.every(b=>b.width>0&&b.depth>0&&b.height>0));
 assert.ok(world.heightAt(world.localToMap('maker-heights',-7,-4))>4);assert.ok(world.heightAt(world.localToMap('tideglass-coast',-6,-11))>3.5);
 let sea=0,total=0;for(let z=-55;z<=55;z+=10)for(let x=-120;x<125;x+=10){total++;if(world.terrainHeight(world.normalAt(x,z))<world.WATER)sea++}assert.ok(sea/total>.5&&sea/total<.9,'islands must not become one stretched continent');
});

test('every authored target arrival is dry, clear and meaningful; all11 interiors retain safe returns and local interactions',()=>{
 const ids=world.targets.map(t=>t.id);assert.equal(new Set(ids).size,ids.length);
 for(const target of world.targets){assert.ok(finite(target)&&finite(target.arrival),target.id);if(!target.room){assert.equal(world.wet(target.arrival),false,target.id);assert.equal(world.blocked(target.arrival),false,target.id);assert.ok(world.distance(target,target.arrival)<target.radius,target.id)}else assert.equal(roomWalkable(target.room,target.arrival),true,target.id)}
 for(const room of Object.keys(roomLabels)){assert.ok(world.roomReturns[room],room);assert.equal(world.wet(world.roomReturns[room]),false,room);assert.equal(world.blocked(world.roomReturns[room]),false,room)}
 for(const id of ['ivan','theo','rue','mira','sol','city-nico','city-aya','city-june','city-ben','notebook','lamp','miso','patch','fox','duck-pond','windmill','bell','campfire','postbox','secret-arcade','secret-tideglass','secret-cloudtop','delivery-workshop','delivery-market','delivery-harbor','ferry-harbor','ferry-orchard'])assert.ok(ids.includes(id),id);
 assert.equal(world.targets.find(t=>t.id==='delivery-workshop').room,'workshop');assert.equal(world.targets.filter(t=>t.id==='ivan').length,1);assert.equal(world.targets.find(t=>t.id==='ivan').room,'home');assert.deepEqual(world.roomReturns['home-studio'],world.roomReturns.home);
});

test('every walking road, doorway approach and resident route stays clear between samples, not only at waypoints',()=>{
 for(const road of world.roads)for(let i=1;i<road.points.length;i++)for(const point of sample(road.points[i-1],road.points[i])){assert.equal(world.wet(point),false,road.id);assert.equal(world.blocked(point),false,road.id);assert.ok(Number.isFinite(world.heightAt(point)),road.id)}
 for(const resident of world.residentProfiles){assert.ok(resident.shelter>=0&&resident.shelter<resident.route.length);for(let i=1;i<resident.route.length;i++)for(const point of sample(resident.route[i-1],resident.route[i])){assert.equal(world.wet(point),false,resident.id);assert.equal(world.blocked(point),false,resident.id)}}
});

test('one connected road graph includes both sides of the seam and the complete main walking circuit',()=>{
 const ids=new Set(world.graph.nodes.map(node=>node.id));assert.equal(ids.size,world.graph.nodes.length);const adjacency=new Map([...ids].map(id=>[id,[]]));
 for(const edge of world.graph.edges){assert.ok(ids.has(edge.from)&&ids.has(edge.to));assert.ok(edge.length>0);adjacency.get(edge.from).push(edge.to);adjacency.get(edge.to).push(edge.from)}
 const seen=new Set(),queue=[world.graph.nodes[0].id];while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);queue.push(...adjacency.get(id))}assert.equal(seen.size,ids.size,'no disconnected dock, side street or invisible seam break');
 const degree=new Map();for(const road of world.roads.filter(r=>r.main)){degree.set(road.from,(degree.get(road.from)??0)+1);degree.set(road.to,(degree.get(road.to)??0)+1)}assert.ok([...degree.values()].every(value=>value===2),'main roads form a closed circuit rather than dead-end spokes');
 assert.equal(world.wet(world.spawn),false);assert.equal(world.blocked(world.spawn),false);assert.equal(world.surfaceAt(world.spawn),'stone');assert.ok(world.bridges.some(bridge=>bridge.id==='meadow-bridge'));assert.ok(world.distance(world.spawn,world.entryLookAt)<30);
});

test('graded native building footprints match a flat tangent foundation, including coastal civic lots',()=>{
 for(const building of world.buildings){const base=world.heightAt(building),normal=world.normalAt(building.x,building.z);for(const corner of world.buildingOutline(building)){const n=world.normalAt(corner.x,corner.z),expected=(world.RADIUS+base)/(n.x*normal.x+n.y*normal.y+n.z*normal.z)-world.RADIUS;assert.ok(Math.abs(world.heightAt(corner)-expected)<1e-7,`${building.id}: no floating corner or submerged foundation`);assert.ok(world.heightAt(corner)>world.WATER+.2)}}
});

test('the pond keeps a submerged feeding area while dock decks and ferry landings are actually walkable',()=>{
 assert.equal(world.wet(world.pond.center),true);assert.equal(world.wet(world.pond.feedingPoint),true);assert.equal(world.wet(world.pond.shoreArrival),false);assert.ok(world.docks.some(dock=>dock.id==='duck-dock'));assert.ok(world.docks.some(dock=>dock.id==='orchard-ferry-dock'));
 for(const dock of world.docks)for(const point of dock.points){assert.equal(world.wet(point),false,dock.id);assert.equal(world.surfaceAt(point),'wood');assert.ok(world.heightAt(point)>world.WATER+.2)}
 for(const bridge of world.bridges){const middle=bridge.points[Math.floor(bridge.points.length/2)];assert.ok(world.heightAt(middle)>world.WATER+.3);assert.equal(world.blocked(middle),false)}
});

test('compilation is reproducible, rejects broken references, and never imports the previous outdoor layout as a base',async()=>{
 const second=compileWorld();assert.deepEqual(second.treeSites,world.treeSites);assert.deepEqual(second.roads,world.roads);assert.deepEqual(second.targets,world.targets);
 const broken=structuredClone(archipelagoDefinition);broken.edges[0].to='missing-node';assert.throws(()=>compileWorld(broken),/unknown node/);const badAsset=structuredClone(archipelagoDefinition);badAsset.lots[0].assetId='missing-model';assert.throws(()=>compileWorld(badAsset),/Unknown world asset/);
 for(const name of ['definition','compile','terrain']){const source=await readFile(new URL(`../src/experience/archipelago/${name}.ts`,import.meta.url),'utf8');assert.doesNotMatch(source,/from ['"]\.\.\/globe\/(?:layout|terrain|geography|city-district|japan-district|world-expansion)\.ts['"]/)}
});

test('the ferry follows one authored arc-length route entirely over water instead of gliding across islands or bridges',()=>{
 assert.ok(world.ferryLength>20&&world.ferryLength<100);assert.equal(world.ferryLengths.length,world.ferryRoute.length);assert.equal(world.ferryLengths[0],0);assert.ok(Math.abs(world.ferryLengths.at(-1)-world.ferryLength)<1e-9);
 for(let index=0;index<world.ferryRoute.length;index++){assert.equal(world.wet(world.ferryRoute[index]),true,`waterway sample${index}`);if(index){assert.ok(world.distance(world.ferryRoute[index-1],world.ferryRoute[index])<=.181);assert.ok(world.ferryLengths[index]>world.ferryLengths[index-1])}}
 for(let index=0;index<=1000;index++)assert.equal(world.wet(world.sampleFerry(index/1000)),true,`interpolated sailing position${index}`);
 assert.ok(world.distance(world.sampleFerry(0),world.ferryRoute[0])<1e-8);assert.ok(world.distance(world.sampleFerry(1),world.ferryRoute.at(-1))<1e-8);assert.ok(world.distance(world.sampleFerry(-1),world.ferryRoute[0])<1e-8);assert.ok(world.distance(world.sampleFerry(2),world.ferryRoute.at(-1))<1e-8);
 for(const id of ['ferry-harbor','ferry-orchard'])assert.equal(world.wet(world.targets.find(target=>target.id===id).arrival),false,'visitors disembark on the safe landing, never at the boat position');
});

test('ferry boarding and return points sit on the outer pier deck beside each water mooring',()=>{
 for(const [id,dockId,mooring] of [['ferry-harbor','harbor-dock',world.sampleFerry(0)],['ferry-orchard','orchard-ferry-dock',world.sampleFerry(1)]]){
  const target=world.targets.find(target=>target.id===id),dock=world.docks.find(dock=>dock.id===dockId);
  assert.ok(world.distance(target,mooring)<=2,`${id}: board the adjacent boat without a long shore-to-boat jump`);
  assert.deepEqual(target.arrival,{x:target.x,z:target.z},`${id}: return to the same boarding position`);
  assert.equal(world.dockFootprint(target.arrival),true,id);assert.equal(world.surfaceAt(target.arrival),'wood',id);assert.equal(world.wet(target.arrival),false,id);assert.equal(world.blocked(target.arrival),false,id);
  assert.ok(world.distance(target.arrival,dock.points.at(-1))<dock.width/2+.1,`${id}: boarding is at the water end, not the shore`);
  for(const point of sample(dock.points[0],target.arrival,.1)){assert.equal(world.wet(point),false,`${id}: continuous dry approach`);assert.equal(world.blocked(point),false,`${id}: no rail blocks the approach`)}
 }
});

test('native harbor façades and doors face the central pedestrian streets while stable garden IDs keep accurate names',()=>{
 for(const lot of archipelagoDefinition.lots.filter(lot=>lot.at.frame==='harbor')){
  const building=world.buildings.find(item=>item.id===lot.id),lane=world.localToMap('harbor',0,lot.at.x===0?0:lot.at.z),basis=frameAt(building),normal=world.normalAt(lane.x,lane.z),heading={x:basis.east.x*Math.sin(building.yaw)+basis.south.x*Math.cos(building.yaw),y:basis.east.y*Math.sin(building.yaw)+basis.south.y*Math.cos(building.yaw),z:basis.east.z*Math.sin(building.yaw)+basis.south.z*Math.cos(building.yaw)};
  assert.ok(normal.x*heading.x+normal.y*heading.y+normal.z*heading.z>0,lot.id);if(building.arrival)assert.ok(world.distance(building.arrival,lane)<world.distance(building,lane),`${lot.id}: entrance faces the street`);
 }
 assert.equal(world.targets.find(target=>target.id==='star-garden').name,'Cloudtop Garden');assert.equal(world.targets.find(target=>target.id==='south-garden').name,'South Shore Lookout');
});
