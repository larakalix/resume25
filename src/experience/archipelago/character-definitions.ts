import type {CutesVariant} from './cutes-assets.ts'
import {archipelagoDefinition} from './definition.ts'

export interface CharacterDefinition {
 readonly id:string
 readonly family:'cutes'
 readonly role:'visitor'|'ivan'|'resident'|'host'
 readonly variant:CutesVariant
 readonly scale:number
 readonly phase:number
 readonly seasonal:boolean
 readonly customization:'native'|'ivan-portrait-and-jersey'
}
const base=(id:string,variant:CutesVariant,role:CharacterDefinition['role'],scale=1,phase=0,seasonal=false):CharacterDefinition=>Object.freeze({id,family:'cutes',role,variant,scale,phase,seasonal,customization:id==='ivan'?'ivan-portrait-and-jersey':'native'})
const outdoorVariants:Readonly<Record<string,CutesVariant>>={mira:'mira',sol:'lina','city-nico':'emma','city-aya':'mira','city-june':'kenji','city-ben':'lina'}
const hostDefinitions:readonly CharacterDefinition[]=[
 base('theo','theo','host',1.02,.12),base('rue','kenji','host',.88,.3),
 base('pip','emma','host',.9,.45),base('rowan','kenji','host',.98,.6),base('kit','theo','host',.88,.75),base('mara','lina','host',.95,.9),
 base('cafe-host','emma','host',.9,.45),base('bookshop-host','kenji','host',.98,.6),base('arcade-host','theo','host',.88,.75),base('ceramics-host','lina','host',.95,.9),
]
/** Pure cast data: only Ivan receives portrait customization; native geometry remains the source family. */
export const characterDefinitions:readonly CharacterDefinition[]=Object.freeze([
 base('visitor','visitor','visitor',1,0,true),base('ivan','ivan','ivan',1,0,true),
 ...archipelagoDefinition.residents.map((resident,index)=>base(resident.id,outdoorVariants[resident.id]??'theo','resident',resident.scale,index*.73)),
 ...hostDefinitions,
 base('lina','lina','resident'),base('kenji','kenji','resident'),base('emma','emma','resident'),
])
const byId=new Map(characterDefinitions.map(character=>[character.id,character]))
if(byId.size!==characterDefinitions.length)throw new Error('Duplicate character identifier.')
/** New ambient IDs use the existing native citizen, without creating another portrait of Ivan. */
export function getCharacterDefinition(id:string):CharacterDefinition{return byId.get(id)??base(id,'theo','resident')}
