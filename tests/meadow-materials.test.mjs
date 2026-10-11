import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGrassBlade,meadowPatch,buildMeadow} from '../src/experience/globe/meadow.ts';
import {createWaterGeometry,buildWater,waterWaveAt,waterStyle} from '../src/experience/globe/water.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {RADIUS,WATER,terrainHeight,mapAt,wet,pathDistance} from '../src/experience/globe/geography.ts';
import {bridge,bridgeFootprint} from '../src/experience/globe/bridge.ts';

test('curved tufts retain a small triangle budget, grounded roots and finite smooth normals',()=>{
 const geometry=createGrassBlade(),positions=geometry.attributes.position,normals=geometry.attributes.normal;
 assert.ok(geometry.index.count/3<=10);assert.ok([...positions.array,...normals.array].every(Number.isFinite));
 let roots=0,tips=0;for(let i=0;i<positions.count;i++){assert.ok(positions.getY(i)>=0);if(positions.getY(i)===0)roots++;if(positions.getY(i)>.3)tips++;assert.ok(Math.abs(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))-1)<1e-5)}
 assert.ok(roots>=2&&tips>=2);geometry.computeBoundingSphere();assert.ok(geometry.boundingSphere.radius<.5);geometry.dispose();
});
test('water depth attributes match the spherical ground, including dry banks, within the geometry budget',()=>{
 const geometry=createWaterGeometry(),p=geometry.attributes.position,depth=geometry.attributes.waterDepth,n=new THREE.Vector3();let shallow=false,dry=false;
 assert.ok(geometry.index.count/3<=50000);
 for(let i=0;i<p.count;i+=17){n.fromBufferAttribute(p,i);assert.ok(Math.abs(n.length()-(RADIUS+WATER))<1e-5);n.normalize();assert.ok(Math.abs(depth.getX(i)-(WATER-terrainHeight(n)))<1e-5);shallow ||= depth.getX(i)>0;dry ||= depth.getX(i)<0}
 assert.ok(shallow&&dry);geometry.dispose();
});
test('meadow color fields are repeatable and continuous across positive and negative patch boundaries',()=>{
 for(const [x,z] of [[0,0],[-18.18,9.09],[27.27,-36.36],[46,18]]){const value=meadowPatch(x,z);assert.equal(value,meadowPatch(x,z));assert.ok(value>=0&&value<=1);assert.ok(Math.abs(value-meadowPatch(x+.001,z-.001))<.005)}
});
test('material lifetimes, quality counts, dry placement and calm water share the existing scene owner',()=>{
 const a=createGlobeArt(new THREE.Scene()),wind={value:0},meadow=buildMeadow(a,wind),surface=buildWater(a),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 for(let i=0;i<meadow.grass.count;i++){meadow.grass.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).normalize();const mapped=mapAt(point);assert.equal(bridgeFootprint(mapped,bridge.vegetationMargin-.01),false);if(i%503===0){assert.equal(wet(mapped),false);assert.ok(pathDistance(mapped)>1.14)}}
 meadow.update(new THREE.Vector3(),false,9000,38);assert.equal(meadow.grass.count,9000);assert.equal(meadow.grass.visible,true);meadow.update(point,true,42000,64);assert.equal(meadow.grass.count,42000);assert.equal(meadow.grass.visible,false);
 const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};surface.water.material.onBeforeCompile(shader,{});surface.update(7,false);assert.equal(shader.uniforms.waterTime.value,7);surface.update(20,true);assert.equal(shader.uniforms.waterTime.value,0);
 const duck=new THREE.Object3D();duck.position.set(3,4,5);surface.setDucks([duck]);assert.deepEqual(shader.uniforms.duckCenters.value[0].toArray(),[3,4,5]);surface.ripple(point,8);assert.equal(shader.uniforms.pondPulse.value.w,8);
 duck.rotation.y=Math.PI/2;surface.setDucks([duck],[{speed:.4,peck:.8}]);const flow=shader.uniforms.duckFlow.value[0];assert.ok(Math.abs(flow.x-1)<1e-6&&Math.abs(flow.z)<1e-6);assert.equal(flow.w,.4);assert.ok(Math.abs(shader.uniforms.duckPecks.value[0]-.8)<1e-6);surface.setDucks([duck]);assert.equal(shader.uniforms.duckFlow.value[0].w,0);assert.equal(shader.uniforms.duckPecks.value[0],0);
 let releases=0;for(const owned of [meadow.grass.geometry,meadow.grass.material,surface.water.geometry,surface.water.material])owned.addEventListener('dispose',()=>releases++);a.dispose();assert.equal(releases,4);
});


test('warped ocean swell stays within its radial envelope and analytic slopes match physical height derivatives',()=>{
 const epsilon=1e-4,axes=['x','y','z'];let changed=false;
 for(let i=0;i<150;i++){
  const point={x:Math.sin(i*2.31)*39.72,y:Math.cos(i*.79)*39.72,z:Math.sin(i*.31)*39.72},time=i*.37,sample=waterWaveAt(point,time);
  assert.ok(Number.isFinite(sample.height));assert.ok(Math.abs(sample.height)<=waterStyle.waveLimit+1e-12);assert.ok(waterStyle.waveLimit<.05);
  assert.ok(Math.hypot(sample.gradient.x,sample.gradient.y,sample.gradient.z)<.1);
  for(const axis of axes){const numeric=(waterWaveAt({...point,[axis]:point[axis]+epsilon},time).height-waterWaveAt({...point,[axis]:point[axis]-epsilon},time).height)/(2*epsilon);assert.ok(Math.abs(numeric-sample.gradient[axis])<1e-7,`${axis}: analytic normal matches displaced height`)}
  changed ||= Math.abs(sample.height-waterWaveAt(point,time+1).height)>.001;
 }
 assert.ok(changed,'the field evolves while its deterministic zero-time Calm pose stays repeatable');
 const geometry=createWaterGeometry();assert.ok(geometry.boundingSphere.radius>=RADIUS+WATER+waterStyle.waveLimit-1e-5);geometry.dispose();
});

test('ocean depth colors keep clear shallows distinct from deep water without an emissive night layer',()=>{
 const a=createGlobeArt(new THREE.Scene()),surface=buildWater(a),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
 surface.water.material.onBeforeCompile(shader,{});
 const luminance=color=>color.r*.2126+color.g*.7152+color.b*.0722;
 assert.ok(luminance(shader.uniforms.waterShallow.value)>luminance(shader.uniforms.waterMiddle.value)*1.7);assert.ok(luminance(shader.uniforms.waterMiddle.value)>luminance(shader.uniforms.waterDeep.value)*1.7);
 assert.equal(surface.water.material.emissive.getHex(),0);assert.equal(surface.water.material.depthWrite,false);assert.ok(surface.water.material.roughness>=.35);assert.ok(!surface.water.material.map,'the ocean adds no texture or render-target dependency');
 const attributes=Object.values(surface.water.geometry.attributes).map(attribute=>attribute.version);surface.update(100,false);surface.update(200,true);assert.deepEqual(Object.values(surface.water.geometry.attributes).map(attribute=>attribute.version),attributes,'motion changes uniforms rather than re-uploading the sphere');a.dispose();
});
