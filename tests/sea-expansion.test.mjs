import assert from 'node:assert/strict';
import {test} from 'node:test';
import {seaGulfs,seaDepth,seaCoastWeight,expandedSeaHeight} from '../src/experience/globe/sea-expansion.ts';
import {normalAt,mapAt,terrainHeight,WATER,RADIUS} from '../src/experience/globe/terrain.ts';
import {paths,distance,heightAt,wet} from '../src/experience/globe/geography.ts';
import {buildings,targets,treeSites} from '../src/experience/globe/layout.ts';
import {cityGroundWeight} from '../src/experience/globe/city-district.ts';
import {japanGroundWeight,japanDistrict} from '../src/experience/globe/japan-district.ts';
import {pond} from '../src/experience/globe/pond-basin.ts';
import {hillLift,hillSites,caveSites} from '../src/experience/globe/wild-land.ts';
import {expansionWeight,worldPlaces,longitudeDelta,longitudeLimit} from '../src/experience/globe/world-expansion.ts';
import {buildingMapOutline} from '../src/experience/globe/building-footprint.ts';
import {riverCrossings,bridgeHeight} from '../src/experience/globe/bridge.ts';
import {coastalCrossing,coastalHeight} from '../src/experience/globe/coastal-crossing.ts';
import {harbor,harborMapPoint,harborHeight,shipPosition} from '../src/experience/globe/harbor.ts';
import {dockHeight} from '../src/experience/globe/duck-dock.ts';
import {lighthouse,lighthouseTarget} from '../src/experience/globe/lighthouse.ts';

// Frozen pre-expansion terrain oracle: the original field and its existing district/hill contracts.
// Keeping this reference separate makes area and preservation checks compare the actual old/new worlds.
function oldHeight(n){
 const land=.60+.23*Math.sin(n.x*9+n.z*4)+.15*Math.sin(n.z*13-n.y*5),coast=Math.max(0,Math.min(1,(n.y-.12)/.34));
 const river=Math.abs(n.z-(-.10+.055*Math.sin(n.x*8))),riverBlend=Math.max(0,Math.min(1,(river-.025)/.032));
 const centre=normalAt(pond.x,pond.z),d=Math.hypot(n.x-centre.x,n.y-centre.y,n.z-centre.z)*RADIUS,pondBlend=Math.max(0,Math.min(1,(d-pond.radius)/pond.bankWidth));
 const point=mapAt(n),original=-1.18+(land+1.18)*Math.min(coast,riverBlend,pondBlend),extension=n.y>.45?0:expansionWeight(n,point),expanded=-1.18+(land+1.18)*extension*riverBlend;
 const base=Math.max(original,expanded,-1.18+1.78*cityGroundWeight(point)),japan=japanGroundWeight(point),level=base+(japanDistrict.level-base)*japan;
 return level+(level>WATER+.25?hillLift(point)*(1-japan):0);
}
const oldAt=p=>oldHeight(normalAt(p.x,p.z));
function unchanged(p,label){assert.ok(Math.abs(terrainHeight(normalAt(p.x,p.z))-oldAt(p))<1e-9,`${label}: retained terrain at ${p.x},${p.z}`)}
const deck=p=>coastalHeight(p)??harborHeight(p)??dockHeight(p)??bridgeHeight(p);

test('regional gulfs create open sea and immediately leave distant or already-deeper terrain alone',()=>{
 assert.equal(seaGulfs.length,3);
 for(const gulf of seaGulfs){const n=normalAt(gulf.x,gulf.z);assert.ok(Math.abs(expandedSeaHeight(.7,n,gulf)-seaDepth)<1e-12);assert.ok(terrainHeight(n)<WATER-.3,`${gulf.id}: actual deep core`);assert.equal(expandedSeaHeight(-2,n,gulf),-2)}
 for(const point of [{x:0,z:0},{x:25,z:25},{x:70,z:-50}])assert.equal(expandedSeaHeight(.7,normalAt(point.x,point.z),point),.7,'outside regional support the field is untouched');
});

test('the expanded world has substantially more ocean while retaining broad walkable land',()=>{
 const total=16000;let oldSea=0,newSea=0;
 for(let i=0;i<total;i++){
  const z=Math.asin(1-2*(i+.5)/total)*RADIUS,x=(((i*2.399963229728653+Math.PI)%(Math.PI*2))-Math.PI)*RADIUS,n=normalAt(x,z),before=oldHeight(n),after=terrainHeight(n);
  assert.ok(Number.isFinite(after));assert.ok(after<=before+1e-9,'the sea expansion does not raise new land');oldSea+=Number(before<WATER+.07);newSea+=Number(after<WATER+.07);
 }
 assert.ok(newSea/total-oldSea/total>.04,`${(newSea/total*100).toFixed(2)}% sea versus ${(oldSea/total*100).toFixed(2)}% before`);
 assert.ok(newSea/total<.45,'most of the globe still supports its connected land exploration');
});

test('every authored walking trail, bridge bank, doorway and destination retains its old support height',()=>{
 for(const line of paths)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],steps=Math.max(1,Math.ceil(distance(a,b)/.15));
  for(let j=0;j<=steps;j++){const p={x:a.x+longitudeDelta(a.x,b.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};if(deck(p)===null)unchanged(p,'trail');assert.equal(wet(p),false,'the established trail or real deck remains walkable')}
 }
 for(const crossing of riverCrossings)for(const z of [crossing.startZ,crossing.endZ])for(const x of [crossing.x-crossing.halfWidth,crossing.x,crossing.x+crossing.halfWidth])unchanged({x,z},'river bridge bank');
 for(const x of [coastalCrossing.startX,coastalCrossing.endX])unchanged({x,z:coastalCrossing.z},'causeway bank');
 for(const target of targets.filter(target=>!target.room)){const support=deck(target.arrival);if(support===null)unchanged(target.arrival,`arrival ${target.id}`);else assert.equal(heightAt(target.arrival),support,'real decks retain their walking height even when the seabed deepens')}
 for(const building of buildings)for(const point of buildingMapOutline(building))unchanged(point,`building ${building.id}`);
 for(const place of [...worldPlaces,...hillSites,...caveSites,lighthouse,lighthouseTarget.arrival])unchanged(place,'landmark');
 for(const tree of treeSites)assert.equal(wet(tree),false,'planting regenerates on the remaining dry land');
});

test('the harbor bank keeps its exact approach clearance and its offshore ship remains in deep water',()=>{
 for(const x of [harbor.apronStart-.5,harbor.apronStart,harbor.apronEnd])for(const z of [-1,0,1])unchanged(harborMapPoint(x,z),'harbor bank');
 const bank=harborMapPoint(harbor.apronStart,0);assert.ok(harbor.level-terrainHeight(normalAt(bank.x,bank.z))<.3,'the pier keeps its old small bank step');
 unchanged(shipPosition,'cruise berth');assert.ok(terrainHeight(normalAt(shipPosition.x,shipPosition.z))<WATER-.5,'the moored ship retains seabed clearance');
 for(const p of [{x:45,z:14},{x:41,z:18},{x:34,z:22}]){const n=normalAt(p.x,p.z),original=Math.max(0,Math.min(1,(n.y-.12)/.34));assert.equal(seaCoastWeight(n,p),original,'the bank and coastal approach retain the old coast weight')}
});

test('the seam-crossing gulf is continuous and a gentle coast transition does not cut the planet at its atlas edge',()=>{
 for(const z of [-31,-22,-17,-10,0,30,39,45]){
  const a={x:-longitudeLimit+1e-5,z},b={x:longitudeLimit-1e-5,z};assert.ok(Math.abs(terrainHeight(normalAt(a.x,z))-terrainHeight(normalAt(b.x,z)))<1e-5);
  assert.ok(Math.abs(expandedSeaHeight(.6,normalAt(a.x,z),a)-expandedSeaHeight(.6,normalAt(b.x,z),b))<1e-5);
 }
});
