import type {Dialogue,Reply} from './conversation.ts'

export interface ConversationBeat {text:string}
export interface TalkHandle {focus:()=>void}
const beatLimit=210

/** Keep authored words intact; prefer sentence/list boundaries before wrapping a long phrase. */
function paragraphBeats(paragraph:string){
 const phrases=paragraph.split(/(?<=[.!?;])\s+/u).flatMap(sentence=>sentence.length<=beatLimit?[sentence]:sentence.split(/(?<=,)\s+/u))
 const pieces=phrases.flatMap(phrase=>phrase.length<=beatLimit?[phrase]:phrase.split(' ')),beats:string[]=[]
 let current=''
 for(const piece of pieces){
  if(current&&current.length+piece.length+1>beatLimit){beats.push(current);current=''}
  current=current?`${current} ${piece}`:piece
 }
 if(current)beats.push(current)
 return beats
}

/** Turn text and detail into short user-paced lines without dropping professional content. */
export function dialogueBeats(dialogue:Dialogue):ConversationBeat[]{
 const pieces=[dialogue.text,dialogue.detail??''].flatMap(value=>value.split(/\n\s*\n/u)).map(paragraph=>paragraph.trim().replace(/\s+/gu,' ')).filter(Boolean).flatMap(paragraph=>paragraphBeats(paragraph)),beats:ConversationBeat[]=[]
 for(const text of pieces){
  const previous=beats.at(-1)
  if(previous&&previous.text.length+text.length+1<=beatLimit)previous.text+=` ${text}`
  else beats.push({text})
 }
 return beats
}

/** A stale/invalid page stays within the available choices and never changes the source list. */
export function replyPage(choices:Reply[],page:number,size=3):Reply[]{
 const length=Number.isFinite(size)&&size>=1?Math.floor(size):3,last=Math.max(0,Math.ceil(choices.length/length)-1),index=Math.max(0,Math.min(last,Number.isFinite(page)?Math.floor(page):0))
 return choices.slice(index*length,(index+1)*length)
}

/** Start with a question about Ivan; actions such as travelling to the workshop remain explicit. */
export function conversationReplies(dialogue:Dialogue,node:string):Reply[]{
 const choices=[...dialogue.choices]
 if(node!=='start'||!dialogue.fictional)return choices
 const questions=choices.filter(reply=>reply.node),other=choices.filter(reply=>!reply.node)
 const first=questions.findIndex(reply=>['about','skills','toolkit','history'].includes(reply.node!)||reply.node!.startsWith('role:'))
 if(first>0)questions.unshift(...questions.splice(first,1))
 return [...questions,...other]
}
