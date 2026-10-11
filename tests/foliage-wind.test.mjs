import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildLandscape} from '../src/experience/globe/landscape.ts';
import {canopyBendShader} from '../src/experience/globe/wind.ts';

function compile(material,library='standard'){
 const shader={vertexShader:THREE.ShaderLib[library].vertexShader,fragmentShader:THREE.ShaderLib[library].fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader,{});return shader;
}

test('grass, crowns and their shadows share one breeze, and Calm restores the resting pose',()=>{
 const artist=createGlobeArt(new THREE.Scene()),land=buildLandscape(artist);
 const grass=compile(land.grass.material),crown=compile(land.canopies.material),depth=compile(land.canopies.customDepthMaterial,'depth');
 for(const shader of [crown,depth]){
  assert.equal(shader.uniforms.windTime,grass.uniforms.windTime);
  assert.equal(shader.uniforms.windStrength,grass.uniforms.windStrength);
  assert.ok(shader.vertexShader.includes(canopyBendShader));
 }
 assert.ok(crown.vertexShader.includes('objectNormal.y-='));
 assert.ok(grass.vertexShader.includes('objectNormal.y-='));
 assert.equal(land.grass.castShadow,false);
 const player=new THREE.Vector3(),grassVersion=land.grass.instanceMatrix.version,crownVersion=land.canopies.instanceMatrix.version;
 land.update(8,false,player,false,9000,38);
 assert.equal(grass.uniforms.windTime.value,8);assert.equal(depth.uniforms.windStrength.value,1);
 land.update(19,true,player,false,9000,38);
 assert.equal(crown.uniforms.windTime.value,0);assert.equal(grass.uniforms.windStrength.value,0);
 land.update(21,true,player,false,9000,38);
 assert.equal(depth.uniforms.windTime.value,0);assert.equal(depth.uniforms.windStrength.value,0);
 land.update(22,false,player,false,9000,38);
 assert.equal(depth.uniforms.windTime.value,22);assert.equal(crown.uniforms.windStrength.value,1);
 assert.equal(land.grass.instanceMatrix.version,grassVersion);assert.equal(land.canopies.instanceMatrix.version,crownVersion);
 let released=0;for(const material of [land.grass.material,land.canopies.material,land.canopies.customDepthMaterial])material.addEventListener('dispose',()=>released++);
 artist.dispose();assert.equal(released,3);
});
