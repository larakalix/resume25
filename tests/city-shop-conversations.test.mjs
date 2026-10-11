import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {cityRoomDialogue} from '../src/experience/globe/city-room-conversation.ts';
import {cityRoomHosts} from '../src/experience/globe/city-room-layout.ts';
import {dialogueFor} from '../src/experience/globe/conversation.ts';

const source=JSON.parse(await readFile(new URL('../src/content/resume.json',import.meta.url),'utf8'));
const hosts=['arcade','ceramics'].map(room=>({...cityRoomHosts[room],room,kind:'person',topic:room==='arcade'?'toolkit':'approach',radius:3}));

test('new shop conversations offer branching activities that return to source-backed work and toolkit details',()=>{
 const profile={...source.profile,name:'Supplied engineer',summary:'Supplied profile only.',email:'source@example.org'},groups=[{id:'frontend',label:'Source frontend',items:['First source tool','Second source tool']},{id:'architecture',label:'Source architecture',items:['Source pattern']},{id:'delivery',label:'Source delivery',items:['Source practice']}],roles=[{id:'supplied-role',company:'Supplied company',role:'Supplied position',startDate:'2026-01',endDate:null}],before=JSON.stringify({profile,groups,roles});
 for(const host of hosts){
  const opening=dialogueFor(host,'start',profile,roles,groups);assert.ok(opening.text.includes(profile.name));assert.equal(opening.fictional,true);assert.equal(opening.speaker,host.name);assert.ok(opening.choices.length>=3);
  const queue=['start'],seen=new Set(),actions=new Set(),links=new Set();
  while(queue.length){
   const node=queue.shift();if(seen.has(node))continue;seen.add(node);
   const response=dialogueFor(host,node,profile,roles,groups);assert.ok(response.text?.length>0,`${host.id}: ${node}`);assert.equal(response.fictional,true);
   for(const reply of response.choices){assert.ok(reply.label.length>0);if(reply.node)queue.push(reply.node);if(reply.action)actions.add(reply.action);if(reply.href)links.add(reply.href)}
  }
  assert.ok(actions.has('workshop'),'the activity can hand the idea to the existing interactive workshop');assert.ok(links.has('/projects'));assert.ok(links.has('/resume'));assert.ok(links.has(`mailto:${profile.email}`));
  assert.equal(dialogueFor(host,'about',profile,roles,groups).detail,profile.summary);
  for(const group of groups)assert.equal(dialogueFor(host,`group:${group.id}`,profile,roles,groups).text,`${group.label}: ${group.items.join(', ')}.`);
  assert.equal(dialogueFor(host,'role:0',profile,roles,groups).text,'Supplied position at Supplied company.');
  const prefix=host.id==='kit'?'arcade':'ceramics';assert.ok(seen.has(`${prefix}:${host.id==='kit'?'round':'shape'}`));assert.ok(seen.has(`${prefix}:${host.id==='kit'?'observe':'people'}`));
 }
 assert.equal(JSON.stringify({profile,groups,roles}),before);
 assert.equal(cityRoomDialogue(hosts[0],'arcade:observe',profile,groups).detail,'Source frontend: First source tool, Second source tool.');
 assert.equal(cityRoomDialogue(hosts[1],'ceramics:people',profile,groups).detail,'Source architecture: Source pattern.\n\nSource delivery: Source practice.');
});

test('shop activities cope with removed content groups and do not intercept ordinary conversations',()=>{
 const profile=source.profile;
 assert.equal(cityRoomDialogue(hosts[0],'arcade:observe',profile,[]).detail,undefined);
 assert.equal(cityRoomDialogue(hosts[1],'ceramics:people',profile,[]).detail,profile.summary);
 for(const host of hosts)for(const node of ['about','skills','role:0','contact'])assert.equal(cityRoomDialogue(host,node,profile,source.skillGroups),null);
 assert.equal(cityRoomDialogue({...hosts[0],id:'ivan'},'start',profile,source.skillGroups),null);
 assert.equal(cityRoomDialogue({...hosts[0],id:'pip'},'start',profile,source.skillGroups),null);
});
