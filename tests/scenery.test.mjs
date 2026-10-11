import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createNatureArt} from '../src/experience/explorer/nature-art.ts';
import {createArtKit} from '../src/experience/explorer/art-kit.ts';
import {naturePlacements} from '../src/experience/explorer/scenery-layout.ts';
import {loadWorldAssets} from '../src/experience/explorer/world-assets.ts';
import {CHARACTER_URL} from '../src/experience/explorer/character-asset.ts';
import {isWater,nearPath} from '../src/experience/explorer/terrain.ts';
import {surfaceDistance} from '../src/experience/explorer/planet.ts';
import {villageBenches,worldTargets} from '../src/experience/explorer/world-data.ts';
import {obstacles} from '../src/experience/explorer/simulation.ts';

test('illustrated trees use solid geometry and independent fadeable ink canopies without textures',()=>{
    const kit=createArtKit(new THREE.Scene()),nature=createNatureArt(kit);
    nature.tree({x:0,z:0},0);nature.tree({x:4,z:0},3);
    assert.equal(kit.occluders.length,2);
    for(const tree of kit.occluders){assert.equal(tree.meshes.length,2);assert.equal(tree.materials.length,2);for(const material of tree.materials){assert.equal(material.map??null,null);assert.equal(material.transparent,true);}}
    assert.notEqual(kit.occluders[0].materials[0],kit.occluders[1].materials[0]);
    kit.occluders[0].materials[0].opacity=.12;assert.equal(kit.occluders[1].materials[0].opacity,1);
    kit.dispose();
});
test('planting and furniture preserve water boundaries and every static direct arrival',()=>{
    const placements=naturePlacements();assert.deepEqual(naturePlacements(),placements);
    for(const kind of ['shrub','grass','rock'])assert.ok(placements.some(p=>p.kind===kind));
    for(const point of [...placements,...villageBenches])assert.equal(isWater(point,.3),false);
    for(const point of placements)assert.equal(nearPath(point,1.25),false);
    for(const bench of villageBenches){assert.ok(obstacles.includes(bench));for(const target of worldTargets)assert.ok(surfaceDistance(bench,target.arrival)>bench.radius+.36);}
});
test('only the shared character asset is fetched, with optional failure and cancellation',async()=>{
    const original=globalThis.fetch,requested=[];
    try{globalThis.fetch=async url=>{requested.push(url);return new Response('missing',{status:404});};assert.deepEqual(await loadWorldAssets(new AbortController().signal),{character:undefined});assert.deepEqual(requested,[CHARACTER_URL]);
    const abort=new AbortController();abort.abort();globalThis.fetch=async()=>abort.signal.throwIfAborted();await assert.rejects(loadWorldAssets(abort.signal),{name:'AbortError'});
    }finally{globalThis.fetch=original;}
});
