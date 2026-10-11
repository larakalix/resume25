import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {assetDefinitions,getAssetDefinition} from '../src/experience/archipelago/catalog.ts';
import {characterDefinitions,getCharacterDefinition} from '../src/experience/archipelago/character-definitions.ts';
import {archipelagoWorld as world} from '../src/experience/archipelago/compile.ts';
import {CUTES_VARIANTS} from '../src/experience/archipelago/cutes-assets.ts';
const json=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));

test('every catalog asset retains exact prepared manifest bounds, identifiers, provenance and license metadata',async()=>{
 const packs=[['simplepolygon-houses','../src/experience/globe/assets/simple-houses.json'],['japanese-town','../src/experience/globe/assets/japanese-town.json'],['kaykit-city-builder','../public/models/kaykit/manifest.json'],['japanese-props','../public/models/japanese-props/manifest.json']];let total=0;
 for(const [pack,path]of packs){const manifest=await json(path);total+=manifest.models.length;const group=assetDefinitions.filter(asset=>asset.pack===pack);assert.equal(group.length,manifest.models.length);
  for(const model of manifest.models){const asset=getAssetDefinition(model.name);assert.equal(asset.sourceId,model.name);assert.equal(asset.pack,pack);assert.deepEqual(asset.bounds,{width:model.width,height:model.height,depth:model.depth});assert.equal(asset.source.url,manifest.source);assert.equal(asset.source.creator,manifest.creator);assert.equal(asset.source.preparedSha256,manifest.sha256);assert.ok(asset.source.credit);
   if(manifest.license)assert.equal(asset.source.licenseId,manifest.license);if(manifest.licenseUrl){assert.equal(asset.source.licenseId,manifest.licenseUrl);assert.equal(asset.source.licenseUrl,manifest.licenseUrl)}if(manifest.terms)assert.equal(asset.source.terms,manifest.terms);if(model.sourceFile)assert.equal(asset.source.file,model.sourceFile);if(model.sourceSha256)assert.equal(asset.source.modelSha256,model.sourceSha256);
   assert.ok(Object.isFrozen(asset)&&Object.isFrozen(asset.bounds)&&Object.isFrozen(asset.source),'render adapters cannot silently rewrite the source catalog');
  }
 }
 assert.equal(assetDefinitions.length,total);assert.equal(new Set(assetDefinitions.map(asset=>asset.id)).size,total);assert.throws(()=>getAssetDefinition('not-an-asset'),/Unknown world asset/);
});

test('compiled building envelopes use the catalog uniformly rather than hand-maintained approximate dimensions',()=>{
 for(const building of world.buildings){const asset=getAssetDefinition(building.assetId),x=building.width/asset.bounds.width,y=building.height/asset.bounds.height,z=building.depth/asset.bounds.depth;assert.equal(asset.kind,'building');assert.ok(Math.abs(x-y)<1e-12&&Math.abs(x-z)<1e-12,building.id)}assert.equal(world.assets,assetDefinitions);
});

test('one data-driven CUTES cast covers all actual world and room host IDs with one customized Ivan',()=>{
 assert.equal(new Set(characterDefinitions.map(character=>character.id)).size,characterDefinitions.length);
 for(const id of ['visitor',...world.targets.filter(target=>target.kind==='person').map(target=>target.id)]){const character=getCharacterDefinition(id);assert.equal(character.id,id);assert.equal(character.family,'cutes');assert.ok(character.variant in CUTES_VARIANTS,id);assert.ok(Number.isFinite(character.scale)&&character.scale>0);assert.ok(Number.isFinite(character.phase));assert.equal(character.seasonal,id==='visitor'||id==='ivan',id);assert.equal(character.customization,id==='ivan'?'ivan-portrait-and-jersey':'native');assert.ok(Object.isFrozen(character))}
 for(const resident of world.residents){const character=getCharacterDefinition(resident.id);assert.equal(character.scale,resident.scale);assert.equal(character.phase,resident.phase);assert.equal(character.role,'resident')}
 assert.equal(characterDefinitions.filter(character=>character.customization==='ivan-portrait-and-jersey').length,1);
 for(const [actual,alias]of [['pip','cafe-host'],['rowan','bookshop-host'],['kit','arcade-host'],['mara','ceramics-host']])assert.equal(getCharacterDefinition(actual).variant,getCharacterDefinition(alias).variant);
 const fallback=getCharacterDefinition('future-background-resident');assert.equal(fallback.role,'resident');assert.equal(fallback.variant,'theo');assert.equal(fallback.seasonal,false);assert.equal(fallback.customization,'native');assert.equal(world.characters,characterDefinitions);
});

test('the actual world compiler and contracts import in a DOM-free process with every Three.js import forbidden',()=>{
 const loader=`export async function resolve(specifier,context,next){if(specifier==='three'||specifier.startsWith('three/'))throw new Error('A server-safe definition imported Three.js');return next(specifier,context)}`;
 const program=`import {archipelagoWorld as world} from ${JSON.stringify(new URL('../src/experience/archipelago/compile.ts',import.meta.url).href)};import {getCharacterDefinition} from ${JSON.stringify(new URL('../src/experience/archipelago/character-definitions.ts',import.meta.url).href)};if(typeof window!=='undefined'||typeof document!=='undefined')throw new Error('Expected no browser globals');console.log(JSON.stringify({areas:world.districts.length,assets:world.assets.length,visitor:getCharacterDefinition('visitor').variant}));`;
 const result=spawnSync(process.execPath,['--loader',`data:text/javascript;base64,${Buffer.from(loader).toString('base64')}`,'--input-type=module','-e',program],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr||String(result.error));assert.deepEqual(JSON.parse(result.stdout),{areas:world.districts.length,assets:assetDefinitions.length,visitor:'visitor'});
});
