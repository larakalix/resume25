import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createWeather,weatherTiming} from '../src/experience/globe/weather.ts';
import {createWeatherArt,rainBudget} from '../src/experience/globe/weather-art.ts';
import {createBreeze} from '../src/experience/globe/wind.ts';
import {buildWater} from '../src/experience/globe/water.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';

test('automatic weather uses active world time, three-minute intervals and an eight-second continuous blend',()=>{
 const weather=createWeather();assert.equal(weather.snapshot().kind,'clear');weather.update(weatherTiming.interval-.01);const clear=weather.snapshot();assert.equal(clear.kind,'clear');
 const start=weather.update(.01);assert.equal(start.kind,'breezy');assert.equal(start.transition,0);assert.equal(start.wind,clear.wind);
 const half=weather.update(4);assert.ok(Math.abs(half.transition-.5)<1e-12);assert.ok(half.wind>clear.wind&&half.wind<1.65);
 const breezy=weather.update(4);assert.equal(breezy.transition,1);assert.equal(breezy.wind,1.65);
 weather.update(172);assert.equal(weather.snapshot().kind,'drizzle');weather.update(8);assert.equal(weather.snapshot().rain,1);
 const single=createWeather(),stepped=createWeather();single.update(368);for(let i=0;i<3680;i++)stepped.update(.1);
 for(const key of ['time','wind','rain','overcast'])assert.ok(Math.abs(single.snapshot()[key]-stepped.snapshot()[key])<1e-8,key);
});

test('manual conditions blend from the current appearance and Calm freezes both the weather clock and transition',()=>{
 const weather=createWeather();weather.update(4,'drizzle');const before=weather.snapshot();assert.equal(before.rain,.5);
 for(let i=0;i<100;i++)weather.update(10,'drizzle',true);assert.deepEqual(weather.snapshot(),before);
 weather.update(4);assert.equal(weather.snapshot().rain,1);weather.update(0,'clear');assert.equal(weather.snapshot().rain,1);weather.update(4);assert.equal(weather.snapshot().rain,.5);
 weather.update(4);assert.equal(weather.snapshot().rain,0);const reset=weather.reset();assert.equal(reset.time,0);assert.equal(reset.choice,'auto');assert.equal(reset.kind,'clear');
 const stable=weather.snapshot();for(const value of [NaN,-2,Infinity,-Infinity])weather.update(value);assert.deepEqual(weather.snapshot(),stable);
 weather.update(Number.MAX_VALUE);assert.ok(Object.values(weather.snapshot()).every(value=>typeof value!=='number'||Number.isFinite(value)));
});

test('rain reuses one bounded line batch, follows local gravity and has no low-quality or interior draw cost',()=>{
 const scene=new THREE.Scene(),art=createWeatherArt(scene),weather=createWeather(),state=weather.update(8,'drizzle'),anchor=new THREE.Vector3(10,20,30),up=new THREE.Vector3(1,0,0);
 assert.equal(scene.children.length,1);assert.equal(scene.children[0],art.rain);assert.equal(art.rain.isLineSegments,true);assert.equal(scene.children.some(child=>child.isLight),false);
 const geometry=art.rain.geometry,version=geometry.attributes.position.version;assert.equal(geometry.attributes.position.count,rainBudget.desktop*2);assert.ok(Object.values(geometry.attributes).reduce((sum,attribute)=>sum+attribute.array.byteLength,0)<20000);assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
 art.update(state,anchor,up,false,'balanced',false);assert.equal(geometry.drawRange.count,1024);assert.equal(art.rain.visible,true);assert.deepEqual(art.rain.position,anchor);assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(art.rain.quaternion).distanceTo(up)<1e-8);
 art.update(state,anchor,up,true,'detailed',false);assert.equal(geometry.drawRange.count,512);
 for(const [quality,inside,overview]of [['low',false,false],['balanced',true,false],['detailed',false,true]]){art.update(state,anchor,up,false,quality,inside,overview);assert.equal(art.rain.visible,false);assert.equal(geometry.drawRange.count,0)}
 art.update(state,anchor,up,false,'balanced',false);const time=art.rain.material.uniforms.rainTime.value;art.update(weather.update(100,'drizzle',true),anchor,up,false,'balanced',false);assert.equal(art.rain.material.uniforms.rainTime.value,time);assert.equal(geometry.attributes.position.version,version);
 let released=0;geometry.addEventListener('dispose',()=>released++);art.rain.material.addEventListener('dispose',()=>released++);art.dispose();art.dispose();assert.equal(released,2);assert.equal(scene.children.length,0);
});

test('weather strength survives old update calls and water weather changes uniforms without allocating geometry',()=>{
 const wind=createBreeze();wind.setStrength(1.65);wind.update(10,false);assert.equal(wind.strength.value,1.65);wind.update(12,true);assert.equal(wind.strength.value,0);wind.update(15,false);assert.equal(wind.strength.value,1.65);
 const artist=createGlobeArt(new THREE.Scene()),surface=buildWater(artist),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};surface.water.material.onBeforeCompile(shader,{});
 const versions=Object.values(surface.water.geometry.attributes).map(attribute=>attribute.version);surface.setWeather({wind:1.65,rain:1,overcast:.62});surface.update(20,false);assert.equal(shader.uniforms.weatherRain.value,1);assert.equal(shader.uniforms.weatherCloud.value,.62);assert.ok(shader.uniforms.waterSwell.value>1);assert.equal(surface.water.material.roughness,.48);surface.update(21,false);assert.equal(shader.uniforms.weatherRain.value,1);assert.deepEqual(Object.values(surface.water.geometry.attributes).map(attribute=>attribute.version),versions);artist.dispose();
});
