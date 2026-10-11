import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMinimapLand,createNavigationPublisher,mapBounds,mapHeading} from '../src/experience/globe/navigation.ts';
import {followFraming} from '../src/experience/globe/camera-framing.ts';
import {normalAt,terrainHeight,WATER,paths} from '../src/experience/globe/geography.ts';
import {buildings,targets} from '../src/experience/globe/layout.ts';
import {buildingMapOutline} from '../src/experience/globe/building-footprint.ts';

test('map land follows the actual terrain, including the river, pond and outer coastline',()=>{
 const land=createMinimapLand(),runs=[...land.matchAll(/M(-?\d+) (-?\d+)h(\d+)v1h-\d+Z/g)].map(([,x,z,width])=>({x:+x,z:+z,width:+width}));
 assert.ok(runs.length>100);assert.equal(land,createMinimapLand());
 for(let z=mapBounds.z;z<mapBounds.z+mapBounds.height;z++)for(let x=mapBounds.x;x<mapBounds.x+mapBounds.width;x++){
  const drawn=runs.some(run=>run.z===z&&x>=run.x&&x<run.x+run.width);
  assert.equal(drawn,terrainHeight(normalAt(x+.5,z+.5))>WATER,`${x},${z}`);
 }
 for(const p of [...buildings.flatMap(buildingMapOutline),...targets.filter(t=>!t.room),...paths.flat()]){assert.ok(p.x>mapBounds.x&&p.x<mapBounds.x+mapBounds.width);assert.ok(p.z>mapBounds.z&&p.z<mapBounds.z+mapBounds.height)}
});
test('north-up marker headings match walk directions and wrap without discontinuous placement',()=>{
 assert.equal(mapHeading(0),180);assert.equal(mapHeading(Math.PI),0);assert.equal(mapHeading(Math.PI/2),90);assert.equal(mapHeading(-Math.PI/2),270);
});
test('live map updates are bounded, unchanged idle positions are silent, and room changes are immediate',()=>{
 const seen=[],publish=createNavigationPublisher(value=>seen.push(value));let point={x:0,z:18,yaw:0,inside:null};
 for(let frame=0;frame<120;frame++){point={...point,x:frame/120};publish(frame/120,point)}
 assert.ok(seen.length>=9&&seen.length<=10);assert.ok(seen.at(-1).x>.8);
 const before=seen.length;publish(2,point);const stationary=seen.length;publish(3,point);assert.equal(seen.length,stationary);assert.ok(stationary<=before+1);
 publish(3.01,{...point,inside:'workshop'});assert.equal(seen.at(-1).inside,'workshop');
 publish(3.02,{x:0,z:18,yaw:.2,inside:null},true);assert.deepEqual(seen.at(-1),{x:0,z:18,yaw:.2,inside:null});
});
test('wide camera reveals materially more terrain on desktop and portrait while keeping a restrained field of view',()=>{
 for(const small of [false,true]){
  const current=followFraming(small),old={height:5.4,back:small?9.2:7,side:.8,lookAhead:1.3,fov:small?53:48};
  const visibleSpan=p=>2*Math.hypot(p.height-1.1,p.back+p.lookAhead,p.side)*Math.tan(p.fov*Math.PI/360);
  assert.ok(visibleSpan(current)>visibleSpan(old)*1.5);assert.ok(current.fov>=45&&current.fov<=60);assert.ok(current.height/current.back>.5&&current.height/current.back<.8);
 }
});
