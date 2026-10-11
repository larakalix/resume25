import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {dialogueFor} from '../src/experience/globe/conversation.ts';
import {dialogueBeats,conversationReplies} from '../src/experience/globe/conversation-flow.ts';
import {ivanGreetings} from '../src/experience/globe/ivan-greetings.ts';
import {targets} from '../src/experience/globe/layout.ts';
import {formatResumeDate} from '../src/utils/resume-date.ts';

const source=JSON.parse(await readFile(new URL('../src/content/resume.json',import.meta.url),'utf8'));
const ivan=targets.find(target=>target.id==='ivan');
const normalized=value=>value.trim().replace(/\s+/gu,' ');
const joined=dialogue=>dialogueBeats(dialogue).map(beat=>beat.text).join(' ');
const given=dialogue=>normalized([dialogue.text,dialogue.detail??''].join(' '));
const say=(node,profile=source.profile,roles=source.experience,groups=source.skillGroups,greeting)=>dialogueFor(ivan,node,profile,roles,groups,greeting);

test('all fifty home openings stay intact and lead into real conversation topics',()=>{
 assert.ok(ivan);
 for(const greeting of ivanGreetings){
  const dialogue=say('start',undefined,undefined,undefined,greeting);
  assert.equal(dialogue.text,greeting);
  assert.equal(joined(dialogue),greeting);
  assert.equal(dialogue.speaker,'Ivan');
  assert.equal(dialogue.fictional,false);
  const replies=conversationReplies(dialogue,'start');
  assert.equal(replies.some(reply=>reply.action==='greet'),false);
  for(const node of ['about','skills','role:0','approach','contact'])assert.ok(replies.some(reply=>reply.node===node),node);
 }
 const fallback=say('start');assert.ok(fallback.text.includes('I’m Ivan'));
});

test('return visits retain every conversation route without a greeting-repeat choice',()=>{
 const first=say('start',undefined,undefined,undefined,ivanGreetings[0]);
 const next=say('start',undefined,undefined,undefined,ivanGreetings[1]);
 assert.notEqual(first.text,next.text);
 assert.deepEqual(first.choices,next.choices);
 for(const node of ['about','skills','role:0','approach','contact'])assert.ok(next.choices.some(reply=>reply.node===node),node);
 for(const node of ['start','topics','about','skills','role:0','approach','contact']){
  const replies=say(node).choices;assert.equal(replies.some(reply=>reply.action==='greet'||/another hello/iu.test(reply.label)),false,node);
 }
});

test('author avatar speaks in first person and preserves source profile, summary and contact data',()=>{
 const profile={...source.profile,name:'Changed name',headline:'Changed role',summary:'A supplied summary.\n\nWith another paragraph.',email:'hello+workshop@example.org'};
 const before=JSON.stringify(profile),about=say('about',profile),contact=say('contact',profile);
 assert.equal(about.text,`I’m ${profile.name}, a ${profile.headline}.`);
 assert.equal(about.detail,profile.summary);
 assert.equal(contact.detail,profile.email);
 assert.ok(contact.choices.some(reply=>reply.href===`mailto:${profile.email}`));
 assert.ok(contact.choices.some(reply=>reply.href==='/contact'));
 assert.equal(JSON.stringify(profile),before);
 for(const node of ['start','about','skills','approach','contact','topics','role:0'])assert.equal(say(node,profile).fictional,false,node);
});

test('added, removed and current roles preserve position, company and dates without fixed role totals',()=>{
 const added={id:'current-test',company:'A supplied company',role:'A supplied position',startDate:'2026-01',endDate:null};
 for(const roles of [source.experience,source.experience.slice(1),[added,...source.experience],[]]){
  const before=JSON.stringify(roles);
  for(const [index,role] of roles.entries()){
   const dialogue=say(`role:${index}`,undefined,roles);
   assert.equal(dialogue.text,`${role.role} at ${role.company}.`);
   assert.equal(dialogue.detail,`${formatResumeDate(role.startDate)} — ${role.endDate?formatResumeDate(role.endDate):'Present'}`);
   assert.equal(dialogue.choices.some(reply=>reply.node===`role:${index+1}`),index<roles.length-1);
   assert.equal(joined(dialogue),given(dialogue));
   assert.ok(dialogue.choices.some(reply=>reply.href==='/resume'));
  }
  const missing=say(`role:${roles.length}`,undefined,roles);
  assert.ok(missing.choices.some(reply=>reply.href==='/resume'));
  assert.equal(missing.detail,undefined);
  assert.equal(JSON.stringify(roles),before);
 }
 assert.ok(joined(say('role:0',undefined,[added])).includes('Present'));
});

test('dynamic skill groups, long lists and approach data survive conversation without mutating source content',()=>{
 const expanded={id:'extra-test',label:'A supplied toolkit',items:Array.from({length:70},(_,index)=>`Supplied tool ${index+1}`)};
 for(const groups of [source.skillGroups,source.skillGroups.slice(1),[...source.skillGroups,expanded],[]]){
  const before=JSON.stringify(groups),skills=say('skills',undefined,undefined,groups);
  assert.deepEqual(skills.choices.filter(reply=>reply.node?.startsWith('group:')).map(reply=>reply.node),groups.map(group=>`group:${group.id}`));
  for(const group of groups){
   const dialogue=say(`group:${group.id}`,undefined,undefined,groups);
   assert.equal(dialogue.text,`${group.label}: ${group.items.join(', ')}.`);
   assert.equal(joined(dialogue),given(dialogue));
   assert.ok(dialogueBeats(dialogue).every(beat=>beat.text.length<=210));
  }
  const approach=say('approach',undefined,undefined,groups);
  assert.equal(approach.detail,groups.filter(group=>['architecture','delivery'].includes(group.id)).map(group=>`${group.label}: ${group.items.join(', ')}.`).join('\n\n'));
  assert.equal(joined(approach),given(approach));
  assert.equal(JSON.stringify(groups),before);
 }
 assert.ok(say('group:missing',undefined,undefined,[]).choices.some(reply=>reply.node==='skills'));
});

test('existing villager menus and professional content remain separate from the author avatar',()=>{
 const before=JSON.stringify(source);
 for(const id of ['mira','theo','rue']){
  const host=targets.find(target=>target.id===id),dialogue=dialogueFor(host,'start',source.profile,source.experience,source.skillGroups,ivanGreetings[0]);
  assert.equal(dialogue.fictional,true);
  assert.equal(dialogue.speaker,host.name);
  assert.notEqual(dialogue.text,ivanGreetings[0]);
  for(const node of ['about','role:0','skills','approach','contact'])assert.ok(dialogue.choices.some(reply=>reply.node===node),`${id}: ${node}`);
  assert.equal(dialogue.choices.some(reply=>reply.action==='workshop'),id==='mira'||id==='theo');
  assert.equal(dialogue.choices.some(reply=>reply.action==='greet'),false);
  const about=dialogueFor(host,'about',source.profile,source.experience,source.skillGroups);
  assert.equal(about.detail,source.profile.summary);
 }
 assert.equal(JSON.stringify(source),before);
});
