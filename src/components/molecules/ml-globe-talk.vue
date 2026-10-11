<script setup lang="ts">
import {useElementSize} from '@vueuse/core'
import type {Profile,Resume,RoleSummary} from '~/domain/content/models'
import type {Target} from '~/experience/globe/types'
import type {TalkView} from '~/experience/globe/talk-view'
import type {Reply} from '~/experience/globe/conversation'
import {dialogueFor} from '~/experience/globe/conversation'
import {dialogueBeats,replyPage,conversationReplies} from '~/experience/globe/conversation-flow'
import {copyEmail} from '~/utils/copy-email'

const {target,profile,roles,skillGroups,view,greeting,calm=false}=defineProps<{target:Target;profile:Profile;roles:RoleSummary[];skillGroups:Resume['skillGroups'];view:TalkView|null;greeting?:string;calm?:boolean}>()
const emit=defineEmits<{action:[value:string];close:[];walk:[code:string];reply:[node:string]}>()
const surface=useTemplateRef<HTMLElement>('surface'),speech=useTemplateRef<HTMLElement>('speech'),speechTitle=useTemplateRef<HTMLElement>('speechTitle'),userSpeech=useTemplateRef<HTMLElement>('userSpeech'),dock=useTemplateRef<HTMLElement>('dock')
const {width:surfaceWidth,height:surfaceHeight}=useElementSize(surface,undefined,{box:'border-box'}),{height:speechHeight}=useElementSize(speech,undefined,{box:'border-box'}),{height:userHeight}=useElementSize(userSpeech,undefined,{box:'border-box'}),{height:dockHeight}=useElementSize(dock,undefined,{box:'border-box'})
const node=ref('start'),beatIndex=ref(0),page=ref(0),highlight=ref(0),lastReply=ref(''),feedback=ref(''),copying=ref(false),posthog=usePostHog()
const dialogue=computed(()=>dialogueFor(target,node.value,profile,roles,skillGroups,greeting)),beats=computed(()=>dialogueBeats(dialogue.value)),beat=computed(()=>beats.value[beatIndex.value]?.text??dialogue.value.text)
const hasNext=computed(()=>beatIndex.value<beats.value.length-1),replies=computed(()=>conversationReplies(dialogue.value,node.value)),pages=computed(()=>Math.max(1,Math.ceil(replies.value.length/3))),choices=computed(()=>replyPage(replies.value,page.value))
const contact=computed(()=>node.value==='contact'||target.topic==='contact')
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(Math.max(min,max),value))
const speechPosition=computed(()=>{
 const width=surfaceWidth.value||1280,height=surfaceHeight.value||720,bubbleWidth=Math.min(340,width-32),bubbleHeight=speechHeight.value||160,anchor=view?.speaker.visible?view.speaker:{x:62,y:36}
 return{left:clamp(anchor.x/100*width-bubbleWidth/2,16,width-bubbleWidth-16),top:clamp(anchor.y/100*height-bubbleHeight-18,width<768?78:98,height-(dockHeight.value||200)-bubbleHeight-32),width:bubbleWidth}
})
const speechTail=computed(()=>{const anchor=view?.speaker.visible?view.speaker:{x:62,y:36},position=speechPosition.value;return`${clamp(anchor.x/100*(surfaceWidth.value||1280)-position.left,24,position.width-24)}px`})
const playerPosition=computed(()=>{
 const width=surfaceWidth.value||1280,height=surfaceHeight.value||720,bubbleWidth=Math.min(216,width-32),bubbleHeight=userHeight.value||54,anchor=view?.player.visible?view.player:{x:36,y:48},other=speechPosition.value
 let left=clamp(anchor.x/100*width-bubbleWidth/2,16,width-bubbleWidth-16)
 const maxTop=height-(dockHeight.value||200)-bubbleHeight-24
 let top=clamp(anchor.y/100*height-bubbleHeight-18,98,maxTop)
 if(left+bubbleWidth>other.left-12&&left<other.left+other.width+12&&top+bubbleHeight>other.top&&top<other.top+(speechHeight.value||160)){
  const candidates=[other.left-bubbleWidth-16,other.left+other.width+16].filter(candidate=>candidate>=16&&candidate+bubbleWidth<=width-16)
  if(candidates.length)left=candidates.sort((a,b)=>Math.abs(a-left)-Math.abs(b-left))[0]!
  else{const above=other.top-bubbleHeight-16,below=other.top+(speechHeight.value||160)+20;top=above>=98?above:below<=maxTop?below:clamp(above,98,maxTop)}
 }
 return{left,top,width:bubbleWidth}
})
const playerTail=computed(()=>{const anchor=view?.player.visible?view.player:{x:36,y:48},position=playerPosition.value;return`${clamp(anchor.x/100*(surfaceWidth.value||1280)-position.left,24,position.width-24)}px`})
function placement(position:{left:number;top:number;width:number}){return{transform:`translate3d(${position.left}px,${position.top}px,0)`,width:`${position.width}px`}}
function focus(){speechTitle.value?.focus({preventScroll:true})}
defineExpose({focus})
watch(()=>target.id,()=>{node.value='start';beatIndex.value=page.value=highlight.value=0;lastReply.value=feedback.value=''})
watch([node,beatIndex],async()=>{await nextTick();focus()})
function advance(){if(hasNext.value)beatIndex.value++}
function choose(reply:Reply){
 if(reply.node)emit('reply',reply.node)
 lastReply.value=reply.label;feedback.value=''
 if(reply.action){emit('action',reply.action);return}
 if(reply.node){node.value=reply.node;beatIndex.value=page.value=highlight.value=0}
}
function link(reply:Reply){lastReply.value=reply.label;if(reply.href?.startsWith('mailto:'))posthog?.capture('contact_link_clicked',{link_name:'Email',link_type:'email'})}
function replyElements(){return Array.from(surface.value?.querySelectorAll<HTMLElement>('[data-talk-reply]')??[])}
function activate(index:number){replyElements()[index]?.click()}
async function more(){page.value=(page.value+1)%pages.value;highlight.value=0;await nextTick();replyElements()[0]?.focus({preventScroll:true})}
async function copy(){copying.value=true;feedback.value=await copyEmail(profile.email,navigator.clipboard?.writeText.bind(navigator.clipboard));copying.value=false}
function key(event:KeyboardEvent){
 if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||!(event.target instanceof Element)||event.target.closest('input,textarea,select,[contenteditable]'))return
 const interactive=!!event.target.closest('button,a,summary,[role="button"]')
 if(event.code==='Escape'){event.preventDefault();event.stopPropagation();emit('close');return}
 if(!interactive&&['KeyW','KeyA','KeyS','KeyD'].includes(event.code)){event.preventDefault();event.stopPropagation();emit('walk',event.code);return}
 const digit=event.code.match(/^(?:Digit|Numpad)([1-3])$/)
 if(!hasNext.value&&digit){event.preventDefault();event.stopPropagation();activate(Number(digit[1])-1);return}
 if(event.code==='KeyE'||!interactive&&['Enter','Space'].includes(event.code)){event.preventDefault();event.stopPropagation();if(hasNext.value)advance();else activate(highlight.value);return}
 if(!hasNext.value&&choices.value.length&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
  event.preventDefault();event.stopPropagation();const direction=['ArrowUp','ArrowLeft'].includes(event.code)?-1:1;highlight.value=(highlight.value+direction+choices.value.length)%choices.value.length;replyElements()[highlight.value]?.focus({preventScroll:true})
 }
}
</script>

<template>
 <section ref="surface" class="globe-talk" :data-calm="calm" :aria-label="`Conversation with ${dialogue.speaker}`" @keydown="key">
  <div ref="speech" class="talk-speech" :style="placement(speechPosition)">
   <div class="talk-speaker"><h2 ref="speechTitle" tabindex="-1">{{ dialogue.speaker }}</h2><span v-if="dialogue.fictional">Fictional villager</span></div>
   <p class="talk-line" aria-live="polite" aria-atomic="true">{{ beat }}</p>
   <div v-if="hasNext" class="talk-beat-footer"><span>{{ beatIndex+1 }} / {{ beats.length }}</span><button type="button" class="talk-continue" @click="advance">Continue <kbd aria-hidden="true">E</kbd></button></div>
   <span class="talk-tail" :style="{left:speechTail}" aria-hidden="true" />
  </div>
  <div v-if="lastReply" ref="userSpeech" class="talk-user-world" :style="placement(playerPosition)"><span>You</span><p>{{ lastReply }}</p><span class="talk-user-tail" :style="{left:playerTail}" aria-hidden="true" /></div>
  <div ref="dock" class="talk-dock">
   <p v-if="lastReply" class="talk-user-mobile" :title="lastReply"><span>You</span>{{ lastReply }}</p>
   <p v-else class="talk-reply-heading">{{ hasNext?`Listening to ${dialogue.speaker}…`:'Your reply' }}</p>
   <template v-if="!hasNext">
    <div class="talk-replies" aria-label="Your reply">
     <template v-for="(reply,index) in choices" :key="`${node}-${page}-${index}`">
      <NuxtLink v-if="reply.href" :data-talk-reply="index" :to="reply.href" :class="{highlighted:highlight===index}" @focus="highlight=index" @click="link(reply)"><kbd aria-hidden="true">{{ index+1 }}</kbd><span>{{ reply.label }}</span><AtMotionArrow /></NuxtLink>
      <button v-else type="button" :data-talk-reply="index" :class="{highlighted:highlight===index}" @focus="highlight=index" @click="choose(reply)"><kbd aria-hidden="true">{{ index+1 }}</kbd><span>{{ reply.label }}</span></button>
     </template>
    </div>
   </template>
   <button v-else type="button" class="talk-next" @click="advance"><span>Go on, I’m listening.</span><kbd aria-hidden="true">E</kbd></button>
   <div class="talk-dock-footer">
    <button v-if="!hasNext&&pages>1" type="button" class="talk-secondary" @click="more">More questions <span>{{ page+1 }} / {{ pages }}</span></button>
    <button v-else-if="!hasNext&&contact" type="button" class="talk-secondary" :disabled="copying" @click="copy">{{ feedback.startsWith('Email copied.')?'Copied':'Copy email' }}<UIcon name="i-mdi-content-copy" aria-hidden="true" /></button>
    <span v-else class="talk-key-help">{{ hasNext?'E to continue':'E to choose · 1–3 to reply' }}</span>
    <button type="button" class="talk-secondary talk-goodbye" aria-label="End conversation" @click="emit('close')">See you around <kbd aria-hidden="true">Esc</kbd></button>
   </div>
   <p v-if="feedback" class="talk-feedback" role="status">{{ feedback }}</p>
  </div>
 </section>
</template>

<style scoped>
.globe-talk { position:absolute; z-index:6; inset:0; pointer-events:none; color:var(--world-ink); }
.talk-speech,.talk-user-world { position:absolute; top:0; left:0; will-change:transform; transition:transform 100ms linear; }
.talk-speech { padding:1rem 1.15rem; border:1px solid var(--world-line); border-radius:24px; background:var(--world-paper); box-shadow:0 5px 20px #153b2d18; pointer-events:auto; }
.talk-speaker { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:.55rem; }
.talk-speaker h2 { font-family:'Bricolage Grotesque',sans-serif; font-weight:650; font-size:1.0625rem; letter-spacing:-.025em; line-height:1.4; }
.talk-speaker h2:focus { outline:0; }
.talk-speaker>span { color:var(--world-muted); font-size:.625rem; }
.talk-line { font-size:1rem; line-height:1.6; overflow-wrap:anywhere; white-space:pre-line; }
.talk-tail,.talk-user-tail { position:absolute; bottom:-8px; left:50%; width:15px; height:15px; transform:translateX(-50%) rotate(45deg); background:var(--world-paper); border-right:1px solid var(--world-line); border-bottom:1px solid var(--world-line); }
.talk-beat-footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:.45rem; color:var(--world-muted); font-size:.6875rem; }
.talk-continue { display:flex; align-items:center; gap:.5rem; min-height:44px; padding:.4rem .6rem; margin-right:-.5rem; border-radius:999px; color:var(--world-blue); cursor:pointer; }
.talk-user-world { padding:.7rem .9rem; border:1px solid var(--world-blue); border-radius:20px; background:var(--world-blue); color:var(--world-paper); font-size:.8125rem; line-height:1.5; }
.talk-user-world>span:first-child { display:block; opacity:.75; font-size:.625rem; margin-bottom:.2rem; }
.talk-user-world p { overflow-wrap:anywhere; }
.talk-user-world .talk-user-tail { background:var(--world-blue); border-color:var(--world-blue); }
.talk-dock { position:absolute; bottom:var(--world-bottom,24px); left:50%; transform:translateX(-50%); width:min(760px,calc(100% - 2 * var(--world-edge,24px))); max-height:42svh; overflow:auto; overscroll-behavior:contain; pointer-events:auto; scrollbar-color:var(--world-line) transparent; padding:3px; }
.talk-reply-heading { display:table; margin:0 0 .4rem .5rem; padding:.25rem .6rem; border-radius:999px; background:var(--world-paper); color:var(--world-muted); font-size:.6875rem; }
.talk-replies { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; }
.talk-replies :is(a,button),.talk-next { display:flex; align-items:center; gap:.55rem; min-height:48px; padding:.7rem .85rem; border:1px solid var(--world-line); border-radius:18px; background:var(--world-paper); color:var(--world-ink); text-align:left; font-size:.8125rem; line-height:1.45; cursor:pointer; box-shadow:0 3px 12px #24443712; overflow-wrap:anywhere; }
.talk-replies :is(a,button).highlighted { border-color:var(--world-blue); }
.talk-replies :is(a,button)>span { flex:1; }
.talk-replies :deep(.motion-arrow) { flex:none; }
kbd { display:inline-flex; align-items:center; justify-content:center; flex:none; min-width:20px; min-height:20px; padding:0 .25rem; border:1px solid var(--world-line); border-bottom-width:2px; border-radius:5px; background:var(--world-soft); color:var(--world-ink); font:500 .625rem/1 ui-monospace,monospace; }
.talk-next { justify-content:space-between; width:100%; }
.talk-dock-footer { display:flex; align-items:center; justify-content:space-between; gap:.7rem; margin-top:.35rem; }
.talk-secondary { display:flex; align-items:center; justify-content:center; gap:.6rem; min-height:44px; padding:.35rem .75rem; border:1px solid var(--world-line); border-radius:999px; background:var(--world-paper); color:var(--world-ink); font-size:.6875rem; cursor:pointer; }
.talk-secondary>span { color:var(--world-muted); font-size:.625rem; }
.talk-goodbye { margin-left:auto; }
.talk-key-help { display:table; padding:.3rem .6rem; border-radius:999px; background:var(--world-paper); color:var(--world-muted); font-size:.625rem; }
.talk-feedback { margin-top:.4rem; padding:.65rem .8rem; background:var(--world-paper); border:1px solid var(--world-line); border-radius:14px; color:var(--world-muted); font-size:.75rem; line-height:1.5; }
.talk-user-mobile { display:none; }
.globe-talk :is(button,a):focus-visible { outline:3px solid var(--world-blue); outline-offset:-4px; }
button:disabled { opacity:.55; cursor:wait; }
.globe-talk[data-calm=true] :is(.talk-speech,.talk-user-world) { transition:none; }
@media (hover:hover) { .talk-replies :is(a,button):hover,.talk-secondary:hover,.talk-continue:hover { border-color:var(--world-blue); background:var(--world-soft); } }
@media (max-width:767px) {
 .talk-speech { padding:.85rem 1rem; border-radius:22px; }
 .talk-line { font-size:.875rem; line-height:1.55; }
 .talk-speaker h2 { font-size:1rem; }
 .talk-user-world { display:none; }
 .talk-user-mobile { display:flex; gap:.5rem; align-items:center; padding:.45rem .75rem; margin:0 0 .35rem; border-radius:16px; background:var(--world-blue); color:var(--world-paper); font-size:.75rem; line-height:1.4; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
 .talk-user-mobile>span { flex:none; font-size:.625rem; opacity:.75; }
 .talk-replies { grid-template-columns:1fr; gap:.3rem; }
 .talk-replies :is(a,button) { min-height:44px; padding:.45rem .7rem; border-radius:16px; font-size:.8125rem; }
 .talk-dock-footer { gap:.4rem; margin-top:.25rem; }
 .talk-secondary { padding-inline:.6rem; }
 .talk-key-help { font-size:.5625rem; }
}
@media (max-height:560px) { .talk-dock { max-height:40svh; } .talk-line { font-size:.8125rem; line-height:1.45; } .talk-speech { padding:.65rem .9rem; } .talk-speaker { margin-bottom:.3rem; } }
@media (prefers-reduced-motion:reduce) { .talk-speech,.talk-user-world { transition:none; } }
</style>
