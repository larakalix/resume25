import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCharacterMotion, locomotionWeights } from '../src/experience/explorer/character-motion.ts';
import { createRiggedCharacter } from '../src/experience/explorer/rigged-character.ts';
import { createArtKit } from '../src/experience/explorer/art-kit.ts';
import { loadCharacterAsset, MOTION_NAMES, disposeCharacterAsset } from '../src/experience/explorer/character-asset.ts';
import { residentAppearances } from '../src/experience/explorer/character-appearance.ts';

globalThis.ProgressEvent ??= class { constructor(type, options) { this.type=type; Object.assign(this,options); } };
const bytes=await readFile(new URL('../public/models/engineer/engineer.glb',import.meta.url));
const length=bytes.readUInt32LE(12), source=JSON.parse(bytes.subarray(20,20+length));
// Node has no image decoder. Preserve the shipped meshes/rig/clips, omit only texture decoding.
const fixture=structuredClone(source);
fixture.materials=fixture.materials.map(material=>({ name:material.name, pbrMetallicRoughness:{baseColorFactor:material.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1]} }));
delete fixture.images; delete fixture.textures; delete fixture.samplers;
fixture.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
async function asset() { return new GLTFLoader().parseAsync(JSON.stringify(fixture),''); }
const idle={speed:0,y:0,vy:0,waving:false,reduced:false};

test('local Quaternius asset contains a weighted humanoid and the seven prepared Mesh2Motion clips',async()=>{
    assert.ok(bytes.length<1_800_000,'keep the optional rig below its 1.8 MB budget');
    const provenance=JSON.parse(await readFile(new URL('../public/models/engineer/provenance.json',import.meta.url)));assert.equal(provenance.character.creator,'Quaternius');
    assert.equal(source.images,undefined,'original cartoon eyes need no bitmap');
    assert.ok(!source.buffers.some(buffer=>buffer.uri),'single self-contained local GLB');
    const gltf=await asset(), skins=[];
    gltf.scene.traverse(object=>{if(object.isSkinnedMesh)skins.push(object);});
    assert.equal(skins.length,2);
    assert.ok(skins.some(mesh=>mesh.name==='Engineer_Head'));const head=skins.find(mesh=>mesh.name==='Engineer_Head');assert.ok(head.geometry.attributes.position.count>0);for(let i=0;i<head.geometry.attributes.position.count;i++)assert.ok(head.geometry.attributes.position.getY(i)>1.54,'no superhero body anatomy ships');
    assert.deepEqual(gltf.animations.map(clip=>clip.name),MOTION_NAMES);
    assert.ok(gltf.scene.getObjectByName('Head').isBone);
    for(const mesh of skins) for(let i=0;i<mesh.geometry.attributes.skinWeight.count;i++) {
        const weight=mesh.geometry.attributes.skinWeight;
        assert.ok(Math.abs(weight.getX(i)+weight.getY(i)+weight.getZ(i)+weight.getW(i)-1)<.001);
    }
});

test('locomotion transitions are normalized, interruption-safe and consistent at 30/60/120 Hz',async()=>{
    for(const speed of [0,.1,1,3.6,4,5,6,9]) {
        const weights=locomotionWeights(speed);
        assert.ok(Object.values(weights).every(weight=>weight>=0&&weight<=1));
        assert.ok(Math.abs(weights.idle+weights.walk+weights.run-1)<1e-10);
    }
    const results=[];
    for(const rate of [30,60,120]) {
        const gltf=await asset(), motion=createCharacterMotion(gltf.scene,gltf.animations);
        for(let i=0;i<rate/2;i++)motion.update(1/rate,{...idle,speed:6});
        const before=motion.snapshot();motion.update(1/rate,idle);const after=motion.snapshot();
        assert.ok(after.run>0&&after.run<before.run,'releasing run blends out rather than snapping');
        for(let i=1;i<rate/2;i++)motion.update(1/rate,idle);
        results.push(motion.snapshot());motion.dispose();
    }
    for(const sample of results)assert.ok(Math.abs(sample.idle-results[0].idle)<1e-6);
});

test('wave preserves the walking legs and all hats follow the animated head without rebuilding',async()=>{
    const a=await asset(),b=await asset(),kitA=createArtKit(new THREE.Scene()),kitB=createArtKit(new THREE.Scene());
    const actor=createRiggedCharacter(kitA,a),other=createRiggedCharacter(kitB,b);
    const lower=actor.avatar.getObjectByName('calf_l'),otherLower=other.avatar.getObjectByName('calf_l');
    const beforeHead=actor.avatar.getObjectByName('Head').quaternion.clone();
    for(let i=0;i<60;i++) { actor.motion.update(1/60,{...idle,speed:3.6,waving:true}); other.motion.update(1/60,{...idle,speed:3.6}); }
    assert.deepEqual(lower.quaternion.toArray(),otherLower.quaternion.toArray(),'greeting layer cannot alter gait');
    assert.ok(beforeHead.angleTo(actor.avatar.getObjectByName('Head').quaternion)>.01);
    assert.equal(actor.hatSocket.parent,actor.avatar.getObjectByName('Head'));
    const hats=['everyday','thanksgiving','christmas','halloween','birthday'];
    for(const hat of hats)actor.hats.set(hat);
    const counts=[kitA.geometries.length,kitA.extras.length];
    for(let i=0;i<20;i++)for(const hat of hats)actor.hats.set(hat);
    assert.deepEqual([kitA.geometries.length,kitA.extras.length],counts);
    for(const hat of hats) {
        actor.hats.set(hat);actor.avatar.updateMatrixWorld(true);
        const visible=actor.hatSocket.children.filter(child=>child.isGroup&&child.visible);
        assert.equal(visible.length,1);
        const box=new THREE.Box3().setFromObject(visible[0]);
        assert.ok(box.min.y>1.25&&box.max.y<2.8,`${hat} remains fitted to the head`);
    }
    actor.dispose();other.dispose();disposeCharacterAsset(a);disposeCharacterAsset(b);kitA.dispose();kitB.dispose();
});

test('the complete cast shares one mesh source while skeletons, outfits, phases and lifetime stay independent',async()=>{
    const gltf=await asset(),kit=createArtKit(new THREE.Scene()),rawHead=gltf.scene.getObjectByName('Head'),rawPose=rawHead.quaternion.clone();
    const actors=[createRiggedCharacter(kit,gltf),...Object.values(residentAppearances).map((appearance,i)=>createRiggedCharacter(kit,gltf,{resident:true,appearance,phase:.15+i*.31}))];
    const bodies=actors.map(actor=>actor.avatar.getObjectByName('Engineer_Head'));
    for(const body of bodies)assert.equal(body.geometry,bodies[0].geometry,'one shared body vertex buffer');
    for(let i=1;i<bodies.length;i++){
        assert.notEqual(bodies[i].skeleton,bodies[0].skeleton);assert.notEqual(bodies[i].material,bodies[0].material);
        assert.notEqual(bodies[i].skeleton.getBoneByName('Head'),bodies[0].skeleton.getBoneByName('Head'));
        assert.equal(actors[i].hats,undefined,'seasonal wardrobe belongs to Ivan');
    }
    assert.ok(actors[1].avatar.getObjectByName('Head').getWorldQuaternion(new THREE.Quaternion()).normalize().angleTo(actors[2].avatar.getObjectByName('Head').getWorldQuaternion(new THREE.Quaternion()).normalize())>.001,'idle posture cycles are staggered');
    assert.deepEqual(rawHead.quaternion.toArray(),rawPose.toArray(),'source rig is never posed or accessorized');
    const otherPose=actors[2].avatar.getObjectByName('upperarm_r').quaternion.clone();
    for(let i=0;i<30;i++)actors[1].motion.update(1/60,{...idle,waving:true});
    assert.deepEqual(actors[2].avatar.getObjectByName('upperarm_r').quaternion.toArray(),otherPose.toArray());
    let disposed=0;bodies[0].geometry.addEventListener('dispose',()=>disposed++);
    actors[1].dispose();assert.equal(disposed,0,'removing one resident cannot free shared geometry');
    for(const i of [0,2,3])actors[i].dispose();assert.equal(disposed,0);
    disposeCharacterAsset(gltf);assert.equal(disposed,1,'world owner releases source geometry exactly once');kit.dispose();
});

test('jump and landing follow physics, reduced motion holds a stable pose, and disposal releases playback',async()=>{
    const gltf=await asset(),motion=createCharacterMotion(gltf.scene,gltf.animations);
    motion.update(.016,{...idle,y:.1,vy:6});assert.equal(motion.state,'jumpStart');
    motion.update(.016,{...idle,y:1,vy:-2});assert.equal(motion.state,'jumpAir');
    motion.update(.016,idle);assert.equal(motion.state,'land');
    for(let i=0;i<60;i++)motion.update(1/60,idle);
    assert.equal(motion.state,'idle');
    motion.update(0,{...idle,reduced:true});
    const head=gltf.scene.getObjectByName('Head'),pose=head.quaternion.clone();
    for(let i=0;i<90;i++)motion.update(1/30,{...idle,reduced:true});
    assert.ok(pose.angleTo(head.quaternion)<1e-6);
    const snapshot=motion.snapshot();motion.dispose();motion.update(.05,{...idle,speed:6});assert.deepEqual(motion.snapshot(),snapshot);
});

test('asset failure recovers and an unmounted load aborts rather than creating a world',async()=>{
    const originalFetch=globalThis.fetch;
    try {
        globalThis.fetch=async()=>new Response('missing',{status:404});
        assert.equal(await loadCharacterAsset(new AbortController().signal),undefined);
        const controller=new AbortController();controller.abort();
        globalThis.fetch=async()=>{controller.signal.throwIfAborted();};
        await assert.rejects(loadCharacterAsset(controller.signal),{name:'AbortError'});
    }finally{globalThis.fetch=originalFetch;}
});
