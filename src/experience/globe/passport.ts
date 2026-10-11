import type {Profile,Resume,RoleSummary} from '../../domain/content/models.ts'
import type {Target} from './types.ts'
import {isSecret,secretDefinitions} from './secrets.ts'
import type {SecretId} from './secrets.ts'
import type {WorldEvent} from './world-events.ts'
import {deliveryStampDefinition} from '../archipelago/activities.ts'
export type {WorldEvent} from './world-events.ts'

export const passportStorageKey='ivan-world-visit-v1'
export const archipelagoPassportStorageKey='ivan-world-visit-v2:archipelago'
export const passportLegacyArchiveKey='ivan-world-visit-v1:archive'
export const passportByteLimit=8192
export const activityDefinitions=[
 {id:'meet-ivan',title:'Hello, Ivan',detail:'Have a conversation with Ivan at home.',targetId:'ivan'},
 {id:'career-with-rue',title:'The story so far',detail:'Explore Ivan’s experience with Rue in the library.',targetId:'rue'},
 {id:'workshop-complete',title:'An idea made useful',detail:'Complete the little planner at the workbench.',targetId:'notebook'},
 {id:'feed-ducks',title:'A little kindness',detail:'Share a few treats with the ducks.',targetId:'duck-pond'},
 {id:'return-wave',title:'A familiar face',detail:'Exchange a wave with a villager.',targetId:'mira'},
 {id:'light-campfire',title:'A warm welcome',detail:'Light the meadow campfire.',targetId:'campfire'},
] as const
const archipelagoActivities=[...activityDefinitions,deliveryStampDefinition] as const
export type ActivityId=typeof archipelagoActivities[number]['id']
export type PassportWorldId='meadow'|'archipelago'
export interface PassportOptions {worldId?:PassportWorldId}
export function passportActivityDefinitions(worldId:PassportWorldId='meadow'){return worldId==='archipelago'?archipelagoActivities:activityDefinitions}
export const trailDefinitions=[
 {id:'meet-ivan',title:'Meet Ivan',description:'A few conversations, a little career history, and an idea made useful.',requirements:['meet-ivan','career-with-rue','workshop-complete']},
 {id:'small-kindness',title:'Small acts of kindness',description:'Treat the ducks, exchange a hello, and leave a warm glow behind.',requirements:['feed-ducks','return-wave','light-campfire']},
] as const
export type TrailId=typeof trailDefinitions[number]['id']
export interface VisitStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;removeItem:(key:string)=>void}
export interface PassportSnapshot {version:1|2;worldId?:PassportWorldId;discovered:string[];activities:ActivityId[];secrets:SecretId[];trackedTrail:TrailId|null;completedTrails:TrailId[];earned:number;total:number;storage:'local'|'session'}
export interface PassportEntry {id:string;title:string;detail:string;targetId:string;kind:'place'|'person'|'activity'|'secret'}
const trailIds=new Set<string>(trailDefinitions.map(trail=>trail.id))
// A failed durable reset must still suppress readable stale saves in this JS session.
const resetBarriers=new WeakMap<VisitStorage,Set<PassportWorldId>>()
function bytes(value:string){return new TextEncoder().encode(value).byteLength}
const copy=<T extends string>(values:Set<T>)=>[...values].sort()

/** Semantic visit progress only: no coordinates, screenshots, audio permissions or world timers. */
export function createPassport(targets:readonly Target[],suppliedStorage?:VisitStorage|null,options:PassportOptions={}){
 const worldId=options.worldId??'meadow',archipelago=worldId==='archipelago',key=archipelago?archipelagoPassportStorageKey:passportStorageKey,definitions=passportActivityDefinitions(worldId),activityIds=new Set<string>(definitions.map(activity=>activity.id))
 const eligible=new Set(targets.filter(target=>target.kind!=='exit'&&!isSecret(target.id)).map(target=>target.id)),discovered=new Set<string>(),activities=new Set<ActivityId>(),secrets=new Set<SecretId>()
 let storage:VisitStorage|null=suppliedStorage??null,trackedTrail:TrailId|null=null,disposed=false
 if(suppliedStorage===undefined)try{storage=typeof localStorage==='undefined'?null:localStorage}catch{storage=null}
 let persistent=!!storage&&!resetBarriers.get(storage)?.has(worldId)
 function completed(){return trailDefinitions.filter(trail=>trail.requirements.every(id=>activities.has(id))).map(trail=>trail.id)}
 function payload(){const progress={discovered:copy(discovered),activities:copy(activities),secrets:copy(secrets),trackedTrail};return archipelago?{version:2 as const,worldId,...progress}:{version:1 as const,...progress}}
 function persist(){if(!storage||!persistent||disposed)return;try{const encoded=JSON.stringify(payload());if(bytes(encoded)<=passportByteLimit)storage.setItem(key,encoded);else persistent=false}catch{persistent=false}}
 function parse(raw:string|null|undefined):Record<string,unknown>|null{if(!raw||bytes(raw)>passportByteLimit)return null;try{const value:unknown=JSON.parse(raw);return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}catch{return null}}
 function restore(saved:Record<string,unknown>){
  if(Array.isArray(saved.discovered))for(const id of saved.discovered)if(typeof id==='string'&&eligible.has(id))discovered.add(id)
  if(Array.isArray(saved.activities))for(const id of saved.activities)if(typeof id==='string'&&activityIds.has(id))activities.add(id as ActivityId)
  if(Array.isArray(saved.secrets))for(const id of saved.secrets)if(typeof id==='string'&&isSecret(id))secrets.add(id)
  if(typeof saved.trackedTrail==='string'&&trailIds.has(saved.trackedTrail))trackedTrail=saved.trackedTrail as TrailId
 }
 let raw:string|null|undefined
 if(persistent)try{raw=storage?.getItem(key)}catch{persistent=false}
 const saved=parse(raw)
 if(saved&&(archipelago?saved.version===2&&saved.worldId===worldId:saved.version===1))restore(saved)
 // Existing corrupt/newer records never cause an older map to be silently imported again.
 else if(archipelago&&persistent&&raw===null&&storage){
  let legacyRaw:string|null=null
  try{legacyRaw=storage.getItem(passportStorageKey)}catch{persistent=false}
  const legacy=parse(legacyRaw)
  if(legacy?.version===1){
   const equivalent=new Set<string>(activityDefinitions.map(activity=>activity.id))
   if(Array.isArray(legacy.activities))for(const id of legacy.activities)if(typeof id==='string'&&equivalent.has(id))activities.add(id as ActivityId)
   // The live legacy key is left intact for rollback; the archive is never an automatic import source.
   try{if(storage.getItem(passportLegacyArchiveKey)===null)storage.setItem(passportLegacyArchiveKey,legacyRaw!)}catch{persistent=false}
   persist()
  }
 }
 return{
  record(event:WorldEvent){
   if(disposed)return{changed:false,completedTrail:null}
   if(event.type==='footstep'||event.type==='interaction'||event.type==='trail-progress')return{changed:false,completedTrail:null}
   const before=completed();let changed=false
   function earn(id:ActivityId){if(!activities.has(id)){activities.add(id);changed=true}}
   if(event.type==='discover'){
    if(isSecret(event.id)){if(!secrets.has(event.id)){secrets.add(event.id);changed=true}}
    else if(eligible.has(event.id)&&!discovered.has(event.id)){discovered.add(event.id);changed=true}
   }
   if(event.type==='conversation'){if(event.id==='ivan')earn('meet-ivan');if(event.id==='rue')earn('career-with-rue')}
   if(event.type==='activity'&&activityIds.has(event.id))earn(event.id)
   if(event.type==='secret'&&isSecret(event.id)&&!secrets.has(event.id)){secrets.add(event.id);changed=true}
   const completedTrail=completed().find(id=>!before.includes(id))??null
   if(changed)persist()
   return{changed,completedTrail}
  },
  track(id:TrailId|null){if(disposed||id!==null&&!trailIds.has(id))return false;trackedTrail=id;persist();return true},
  snapshot():PassportSnapshot{return{...payload(),completedTrails:completed(),earned:discovered.size+activities.size+secrets.size,total:eligible.size+definitions.length+secretDefinitions.length,storage:persistent?'local':'session'}},
  reset(){
   discovered.clear();activities.clear();secrets.clear();trackedTrail=null
   if(!storage)return
   if(!archipelago){try{storage.removeItem(key)}catch{persistent=false};return}
   // An explicit empty v2 record is a migration tombstone, even if writes failed earlier.
   try{storage.setItem(key,JSON.stringify(payload()));persistent=true;resetBarriers.get(storage)?.delete(worldId)}
   catch{
    persistent=false
    const barriers=resetBarriers.get(storage)??new Set<PassportWorldId>();barriers.add(worldId);resetBarriers.set(storage,barriers)
    // Quota/policy may permit removal even when writes fail. Do not remove the rollback archive.
    for(const staleKey of [key,passportStorageKey])try{storage.removeItem(staleKey)}catch{/* Session barrier remains authoritative until storage is usable. */}
   }
  },
  dispose(){disposed=true;storage=null;persistent=false},
 }
}

/** Facts are read from the supplied published content, never written into visit storage. */
export function passportEntries(targets:readonly Target[],profile:Profile,roles:readonly RoleSummary[],groups:Resume['skillGroups'],options:PassportOptions={}):PassportEntry[]{
 function detail(target:Target){
  if(target.id==='ivan'||target.topic==='about'&&target.kind==='person')return`${profile.name} · ${profile.headline}`
  if(target.topic==='history'&&target.kind==='person')return roles.map(role=>`${role.role} at ${role.company}`).join(' · ')
  if(target.topic==='toolkit'&&target.kind==='person')return groups.map(group=>`${group.label}: ${group.items.join(', ')}`).join(' · ')
  if(target.topic==='approach'&&target.kind==='person')return profile.summary
  return target.label
 }
 return[
  ...targets.filter(target=>target.kind!=='exit'&&!isSecret(target.id)).map(target=>({id:target.id,title:target.name,detail:detail(target),targetId:target.id,kind:target.kind==='person'?'person' as const:'place' as const})),
  ...passportActivityDefinitions(options.worldId).map(activity=>({id:activity.id,title:activity.title,detail:activity.detail,targetId:activity.targetId,kind:'activity' as const})),
  ...secretDefinitions.map(secret=>({id:secret.id,title:secret.name,detail:secret.hint,targetId:secret.id,kind:'secret' as const})),
 ]
}
