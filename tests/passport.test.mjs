import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPassport,passportEntries,passportStorageKey,archipelagoPassportStorageKey,passportLegacyArchiveKey,passportByteLimit,activityDefinitions,passportActivityDefinitions,trailDefinitions} from '../src/experience/globe/passport.ts';
import {secretDefinitions,secretTargets} from '../src/experience/globe/secrets.ts';

const target=(id,kind='place',topic='environment')=>({id,name:`Place ${id}`,label:`Visit ${id}`,kind,topic,x:0,z:0,radius:2,arrival:{x:0,z:1}});
const targets=[target('home-door','door'),target('ivan','person','about'),target('rue','person','history'),target('sol','person','toolkit'),target('exit-home','exit'),...secretTargets];
function memory(){const entries=new Map();return{entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)}}

test('passport awards only authored IDs and derives totals rather than fixing discovery counts',()=>{
 const storage=memory(),visit=createPassport(targets,storage),eligible=targets.filter(t=>t.kind!=='exit'&&!secretTargets.some(s=>s.id===t.id));
 assert.equal(visit.snapshot().total,eligible.length+activityDefinitions.length+secretDefinitions.length);
 assert.equal(visit.record({type:'discover',id:'missing'}).changed,false);assert.equal(visit.record({type:'discover',id:'exit-home'}).changed,false);
 assert.equal(visit.record({type:'discover',id:'home-door'}).changed,true);assert.equal(visit.record({type:'discover',id:'home-door'}).changed,false);
 assert.equal(visit.record({type:'conversation',id:'ivan'}).changed,true);assert.equal(visit.record({type:'conversation',id:'mira'}).changed,false);
 assert.equal(visit.record({type:'activity',id:'forged'}).changed,false);assert.equal(visit.record({type:'photo',id:'return-wave'}).changed,false,'a view-only photo pose cannot earn an activity');
 const secret=secretDefinitions[0].id;visit.record({type:'discover',id:secret});assert.equal(visit.record({type:'secret',id:secret}).changed,false,'discovery and explicit secret events share one stamp');
 assert.equal(visit.snapshot().earned,3);const before=visit.snapshot();before.discovered.push('fake');assert.ok(!visit.snapshot().discovered.includes('fake'));
});

test('both trails complete in any order, acknowledge existing actions and celebrate only once',()=>{
 const visit=createPassport(targets,memory());
 for(const definition of trailDefinitions){
  for(const id of [...definition.requirements].reverse().slice(0,-1))assert.equal(visit.record({type:'activity',id}).completedTrail,null);
  visit.track(definition.id);
  const final=definition.requirements[0];assert.equal(visit.record({type:'activity',id:final}).completedTrail,definition.id);assert.equal(visit.record({type:'activity',id:final}).completedTrail,null);
  assert.ok(visit.snapshot().completedTrails.includes(definition.id));
 }
 assert.equal(visit.track('unknown-trail'),false);assert.equal(visit.track(null),true);assert.equal(visit.snapshot().trackedTrail,null);
});

test('transient footsteps, interactions and progress notifications never award or save stamps',()=>{
 const storage=memory(),visit=createPassport(targets,storage),before=visit.snapshot();let writes=0;
 const original=storage.setItem;storage.setItem=(key,value)=>{writes++;original(key,value)};
 for(const event of [
  {type:'footstep',position:{x:0,z:0},heading:.5,foot:'left',inside:null,surface:'sand',time:1},
  {type:'interaction',id:'ivan',action:'open',room:'home',time:2},
  {type:'interaction',id:'campfire',action:'toggle',room:null,time:3},
  {type:'trail-progress',trailId:'meet-ivan',completed:3,total:3,finished:true},
 ]){
  assert.deepEqual(visit.record(event),{changed:false,completedTrail:null});
 }
 assert.deepEqual(visit.snapshot(),before);assert.equal(writes,0);assert.equal(storage.getItem(passportStorageKey),null);
 visit.record({type:'activity',id:'light-campfire'});assert.equal(visit.snapshot().earned,1,'only the successful semantic activity awards its stamp');
});

test('one versioned local record stores only stable progress IDs and survives a fresh visit',()=>{
 const storage=memory(),visit=createPassport(targets,storage);
 visit.record({type:'discover',id:'ivan'});visit.record({type:'conversation',id:'rue'});visit.record({type:'secret',id:'secret-tideglass'});visit.track('meet-ivan');
 const raw=storage.entries.get(passportStorageKey);assert.ok(new TextEncoder().encode(raw).byteLength<=passportByteLimit);
 assert.deepEqual(Object.keys(JSON.parse(raw)).sort(),['activities','discovered','secrets','trackedTrail','version']);assert.ok(!/company|position|coordinates|sound|clock|screenshot/.test(raw));
 const resumed=createPassport(targets,storage);assert.deepEqual(resumed.snapshot(),visit.snapshot());
 const removed=createPassport(targets.filter(t=>t.id!=='ivan'),storage);assert.deepEqual(removed.snapshot().discovered,[]);assert.equal(removed.snapshot().total,visit.snapshot().total-1);
});

test('corrupt, oversized, unknown-version and unavailable storage never stop session progress',()=>{
 for(const raw of ['not json',JSON.stringify({version:9,discovered:['ivan']}),' '.repeat(passportByteLimit+1),JSON.stringify({version:1,discovered:['unknown',4],activities:['fake',{}],secrets:['fake']})]){
  const storage=memory();storage.entries.set(passportStorageKey,raw);const visit=createPassport(targets,storage);assert.equal(visit.snapshot().earned,0);assert.equal(visit.record({type:'discover',id:'ivan'}).changed,true);
 }
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 const visit=createPassport(targets,blocked);assert.equal(visit.snapshot().storage,'session');visit.record({type:'conversation',id:'ivan'});assert.equal(visit.snapshot().earned,1);
 const quota=memory();quota.setItem=()=>{throw Error('quota')};const full=createPassport(targets,quota);full.record({type:'discover',id:'ivan'});assert.equal(full.snapshot().storage,'session');assert.equal(full.snapshot().earned,1);
 quota.entries.set(passportStorageKey,JSON.stringify({version:1,discovered:['ivan']}));full.reset();assert.equal(quota.getItem(passportStorageKey),null,'restart can still remove an old save after a quota write failure');
});

test('restart synchronously clears saved progress with no deferred write to resurrect it',async()=>{
 const storage=memory(),visit=createPassport(targets,storage);visit.record({type:'discover',id:'ivan'});visit.track('meet-ivan');visit.reset();await Promise.resolve();
 assert.equal(storage.getItem(passportStorageKey),null);assert.equal(visit.snapshot().earned,0);assert.equal(createPassport(targets,storage).snapshot().earned,0);
 visit.dispose();assert.equal(visit.record({type:'discover',id:'ivan'}).changed,false);assert.equal(visit.track('meet-ivan'),false);assert.equal(storage.getItem(passportStorageKey),null);
});

test('passport notes follow supplied content changes without persisting professional facts',()=>{
 const profile={name:'Ivan',headline:'Builder',summary:'A supplied summary.'},roles=[{id:'role-a',role:'Engineer',company:'Source company'}],groups=[{id:'tools',label:'Tools',items:['Source tool']}];
 let entries=passportEntries(targets,profile,roles,groups);assert.match(entries.find(entry=>entry.id==='ivan').detail,/Ivan · Builder/);assert.match(entries.find(entry=>entry.id==='rue').detail,/Engineer at Source company/);assert.match(entries.find(entry=>entry.id==='sol').detail,/Tools: Source tool/);
 entries=passportEntries(targets,{...profile,headline:'Changed headline'},[{id:'role-b',role:'New role',company:'New source'}],[{id:'tools',label:'Languages',items:['Changed tool']}]);
 assert.match(entries.find(entry=>entry.id==='ivan').detail,/Changed headline/);assert.match(entries.find(entry=>entry.id==='rue').detail,/New role at New source/);assert.match(entries.find(entry=>entry.id==='sol').detail,/Languages: Changed tool/);assert.ok(!entries.some(entry=>entry.id==='exit-home'));
});

test('a new world archives the legacy visit and migrates only equivalent semantic activities',()=>{
 const storage=memory(),legacy=createPassport(targets,storage);
 legacy.record({type:'discover',id:'home-door'});legacy.record({type:'discover',id:'ivan'});legacy.record({type:'secret',id:secretDefinitions[0].id});legacy.track('meet-ivan');
 for(const activity of activityDefinitions)legacy.record({type:'activity',id:activity.id});
 const old=storage.getItem(passportStorageKey),newVisit=createPassport(targets,storage,{worldId:'archipelago'}),snapshot=newVisit.snapshot();
 assert.equal(snapshot.version,2);assert.equal(snapshot.worldId,'archipelago');assert.deepEqual(snapshot.activities,activityDefinitions.map(activity=>activity.id).sort());
 assert.deepEqual(snapshot.discovered,[]);assert.deepEqual(snapshot.secrets,[]);assert.equal(snapshot.trackedTrail,null);assert.deepEqual(snapshot.completedTrails,trailDefinitions.map(trail=>trail.id));
 assert.equal(storage.getItem(passportStorageKey),old,'legacy rollback remains readable');assert.equal(storage.getItem(passportLegacyArchiveKey),old,'archive preserves the exact earlier payload');
 const saved=JSON.parse(storage.getItem(archipelagoPassportStorageKey));assert.equal(saved.worldId,'archipelago');assert.equal(saved.version,2);assert.ok(new TextEncoder().encode(JSON.stringify(saved)).byteLength<=passportByteLimit);
 assert.equal(snapshot.total,targets.filter(target=>target.kind!=='exit'&&!secretTargets.some(secret=>secret.id===target.id)).length+passportActivityDefinitions('archipelago').length+secretDefinitions.length);
 assert.deepEqual(createPassport(targets,storage).snapshot(),legacy.snapshot(),'default callers retain the v1 contract');
});

test('new world progress is independent, delivery is world-specific, and migration never repeats',()=>{
 const storage=memory();storage.setItem(passportStorageKey,JSON.stringify({version:1,activities:['meet-ivan','delivery-complete','forged'],discovered:['ivan']}));
 const visit=createPassport(targets,storage,{worldId:'archipelago'});assert.deepEqual(visit.snapshot().activities,['meet-ivan']);
 visit.record({type:'discover',id:'ivan'});visit.record({type:'activity',id:'delivery-complete'});visit.track('small-kindness');
 storage.setItem(passportStorageKey,JSON.stringify({version:1,activities:['feed-ducks'],discovered:['home-door']}));
 assert.deepEqual(createPassport(targets,storage,{worldId:'archipelago'}).snapshot(),visit.snapshot());
 const legacy=createPassport(targets,null);assert.equal(legacy.record({type:'activity',id:'delivery-complete'}).changed,false);
 const profile={name:'Ivan',headline:'Builder',summary:'Source summary'},args=[targets,profile,[],[]];
 assert.ok(!passportEntries(...args).some(entry=>entry.id==='delivery-complete'));assert.equal(passportEntries(...args,{worldId:'archipelago'}).find(entry=>entry.id==='delivery-complete').targetId,'delivery-workshop');
});

test('corrupt, oversized, mismatched-world and newer new-world records cannot reimport old activities',()=>{
 for(const raw of ['bad json',' '.repeat(passportByteLimit+1),JSON.stringify({version:3,worldId:'archipelago',activities:['feed-ducks']}),JSON.stringify({version:2,worldId:'somewhere-else',activities:['feed-ducks']}),JSON.stringify(null)]){
  const storage=memory();storage.setItem(passportStorageKey,JSON.stringify({version:1,activities:['meet-ivan']}));storage.setItem(archipelagoPassportStorageKey,raw);
  const visit=createPassport(targets,storage,{worldId:'archipelago'});assert.equal(visit.snapshot().earned,0);assert.equal(visit.record({type:'activity',id:'feed-ducks'}).changed,true);
 }
});

test('new-world Restart leaves an empty migration tombstone while preserving the rollback archive',()=>{
 const storage=memory();storage.setItem(passportStorageKey,JSON.stringify({version:1,activities:['meet-ivan']}));const visit=createPassport(targets,storage,{worldId:'archipelago'}),archive=storage.getItem(passportLegacyArchiveKey);
 visit.record({type:'activity',id:'delivery-complete'});visit.record({type:'secret',id:secretDefinitions[0].id});visit.reset();
 assert.equal(visit.snapshot().earned,0);assert.equal(JSON.parse(storage.getItem(archipelagoPassportStorageKey)).worldId,'archipelago');assert.equal(createPassport(targets,storage,{worldId:'archipelago'}).snapshot().earned,0);
 assert.equal(storage.getItem(passportLegacyArchiveKey),archive);
 storage.removeItem=()=>{throw Error('removal denied')};visit.record({type:'activity',id:'meet-ivan'});visit.reset();assert.equal(createPassport(targets,storage,{worldId:'archipelago'}).snapshot().earned,0,'an empty write protects reset even if removal is unavailable');
});

test('Restart after write failure removes live import sources and never imports the archive',()=>{
 const storage=memory();storage.setItem(passportStorageKey,JSON.stringify({version:1,activities:['meet-ivan']}));const visit=createPassport(targets,storage,{worldId:'archipelago'}),archive=storage.getItem(passportLegacyArchiveKey);
 storage.setItem=()=>{throw Error('quota')};visit.record({type:'discover',id:'ivan'});assert.equal(visit.snapshot().storage,'session');visit.reset();
 assert.equal(storage.getItem(archipelagoPassportStorageKey),null);assert.equal(storage.getItem(passportStorageKey),null);assert.equal(storage.getItem(passportLegacyArchiveKey),archive);
 // A new adapter simulates a reload: no in-memory barrier is needed when removals work.
 const reloaded={getItem:storage.getItem,setItem:storage.setItem,removeItem:storage.removeItem};assert.equal(createPassport(targets,reloaded,{worldId:'archipelago'}).snapshot().earned,0);
});

test('all-mutations-denied storage keeps Restart authoritative within the session',()=>{
 const storage=memory();storage.setItem(passportStorageKey,JSON.stringify({version:1,activities:['meet-ivan']}));const visit=createPassport(targets,storage,{worldId:'archipelago'});
 storage.setItem=storage.removeItem=()=>{throw Error('read-only storage')};visit.reset();
 assert.equal(visit.snapshot().earned,0);assert.equal(visit.snapshot().storage,'session');assert.equal(createPassport(targets,storage,{worldId:'archipelago'}).snapshot().earned,0);
 visit.dispose();assert.equal(visit.record({type:'activity',id:'delivery-complete'}).changed,false);
});
