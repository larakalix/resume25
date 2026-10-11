import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {dialogueFor} from '../src/experience/globe/conversation.ts';
import {targets} from '../src/experience/globe/layout.ts';
import {dialogueBeats,replyPage,conversationReplies} from '../src/experience/globe/conversation-flow.ts';

const source=JSON.parse(await readFile(new URL('../src/content/resume.json',import.meta.url),'utf8'));
const normalized=value=>value.trim().replace(/\s+/gu,' ');
const joined=dialogue=>dialogueBeats(dialogue).map(beat=>beat.text).join(' ');
const supplied=dialogue=>normalized([dialogue.text,dialogue.detail??''].join(' '));

test('conversation beats preserve every authored word and punctuation while keeping ordinary phrases short',()=>{
 const text='Ivan builds usable products. React, Next.js, Node.js, TypeScript and C# are tools, not the entire story. ';
 const dialogue={speaker:'Mira',text:text.repeat(7),detail:'\n\nArchitecture: SOLID, Clean Architecture, Repository, CQRS.\n\nAn email: hello+portfolio@example.co.uk.',choices:[],fictional:true};
 const beats=dialogueBeats(dialogue);assert.ok(beats.length>3);assert.equal(joined(dialogue),supplied(dialogue));assert.ok(beats.every(beat=>beat.text.length<=210));
 assert.ok(beats.some(beat=>beat.text.includes('Next.js')));assert.ok(beats.some(beat=>beat.text.includes('hello+portfolio@example.co.uk.')));
 const long='unbroken'.repeat(40),single={...dialogue,text:long,detail:undefined};assert.equal(joined(single),long);assert.equal(dialogueBeats(single).length,1);
 assert.deepEqual(dialogueBeats({...dialogue,text:' \n ',detail:'\n\t'}),[]);
});
test('published and changed roles, current dates, long skill groups and contact details remain available through beats',()=>{
 const host=targets.find(target=>target.id==='rue'),profile={...source.profile,summary:source.profile.summary.repeat(3)},groups=[...source.skillGroups,{id:'expanded',label:'Expanded toolkit',items:Array.from({length:80},(_,i)=>`Tool ${i+1}`)}];
 const variants=[source.experience,source.experience.slice(1),[{id:'current',company:'Added company',role:'New role',startDate:'2026-01',endDate:null},...source.experience],[]];
 for(const roles of variants){
  for(const node of ['about','approach','contact',...roles.map((_,i)=>`role:${i}`),...groups.map(group=>`group:${group.id}`)]){
   const dialogue=dialogueFor(host,node,profile,roles,groups),before=JSON.stringify(dialogue);assert.equal(joined(dialogue),supplied(dialogue),node);assert.equal(JSON.stringify(dialogue),before);
   for(const beat of dialogueBeats(dialogue))assert.ok(beat.text.length<=210,node);
  }
 }
 const current=dialogueFor(host,'role:0',profile,variants[2],groups);assert.ok(joined(current).includes('New role at Added company.'));assert.ok(joined(current).includes('Present'));
 assert.ok(joined(dialogueFor(host,'contact',profile,[],groups)).includes(profile.email));
 for(const item of groups.at(-1).items)assert.ok(joined(dialogueFor(host,'group:expanded',profile,[],groups)).includes(item));
});
test('short role dates and contact details stay with the line they explain',()=>{
 const host=targets.find(target=>target.id==='rue');
 for(const node of ['role:0','contact']){
  const dialogue=dialogueFor(host,node,source.profile,source.experience,source.skillGroups),beats=dialogueBeats(dialogue);
  assert.ok(supplied(dialogue).length<=210);assert.equal(beats.length,1);assert.equal(beats[0].text,supplied(dialogue));
 }
 const long={speaker:'Rue',text:'An intentionally lengthy position at a company with a detailed name. '.repeat(5),detail:'January 2026 — Present',choices:[],fictional:true},beats=dialogueBeats(long);
 assert.ok(beats.length>1);assert.ok(beats.every(beat=>beat.text.length<=210));assert.equal(joined(long),supplied(long));
});
test('reply pages clamp stale input, expose all choices and preserve the source array',()=>{
 const choices=Object.freeze(Array.from({length:8},(_,i)=>Object.freeze({label:`Reply ${i}`,node:`node:${i}`}))),before=JSON.stringify(choices);
 assert.deepEqual([0,1,2].flatMap(page=>replyPage(choices,page)),choices);assert.deepEqual(replyPage(choices,999),choices.slice(6));assert.deepEqual(replyPage(choices,-3),choices.slice(0,3));assert.deepEqual(replyPage(choices,NaN),choices.slice(0,3));assert.deepEqual(replyPage(choices,0,0),choices.slice(0,3));assert.deepEqual(replyPage([],9),[]);assert.equal(JSON.stringify(choices),before);
});
test('villagers begin with a conversational question and preserve every available route and action',()=>{
 for(const host of targets.filter(target=>target.kind==='person')){
  const dialogue=dialogueFor(host,'start',source.profile,source.experience,source.skillGroups),before=JSON.stringify(dialogue),choices=conversationReplies(dialogue,'start');
  assert.ok(choices[0].node);assert.ok(!choices[0].action);assert.ok(['about','skills','history'].includes(choices[0].node)||choices[0].node.startsWith('role:')||choices[0].node.startsWith('arcade:')||choices[0].node.startsWith('ceramics:'));
  assert.deepEqual([...choices].sort((a,b)=>a.label.localeCompare(b.label)),[...dialogue.choices].sort((a,b)=>a.label.localeCompare(b.label)));assert.equal(JSON.stringify(dialogue),before);
  assert.deepEqual(conversationReplies(dialogue,'topics'),dialogue.choices);
 }
 const pet=dialogueFor(targets.find(target=>target.id==='patch'),'start',source.profile,source.experience,source.skillGroups);assert.deepEqual(conversationReplies(pet,'start'),pet.choices);
});
