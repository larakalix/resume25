import {useScrollLock} from '@vueuse/core'
import type {Ref} from 'vue'
import {createWorldScrollMode} from '~/experience/globe/scroll-mode'

/** The world owns page scrolling only while ready, fully visible, and explicitly in exploration mode. */
export function useWorldPageScroll(stage:Readonly<Ref<HTMLElement|null>>,ready:Readonly<Ref<boolean>>,overlay?:Readonly<Ref<boolean>>){
 const mounted=ref(false),locked=ref(false)
 const htmlLock=useScrollLock(()=>mounted.value?document.documentElement:null),bodyLock=useScrollLock(()=>mounted.value?document.body:null)
 let mode=createWorldScrollMode(),abort:AbortController|undefined,initialHash='',hashPending=false
 function apply(value:boolean){
  bodyLock.value=value&&!(overlay?.value??false);htmlLock.value=value;locked.value=value
  if(mounted.value){if(value)document.documentElement.dataset.worldScrollLocked='true';else delete document.documentElement.dataset.worldScrollLocked}
 }
 function sync(){
  if(!mounted.value)return
  const bounds=stage.value?.getBoundingClientRect(),fits=!!bounds&&bounds.height<=window.innerHeight+2,canOwn=ready.value&&fits&&!hashPending,protect=locked.value&&canOwn
  const wantsWorld=mode.scroll(window.scrollY,protect)
  if(protect&&wantsWorld&&window.scrollY>2){window.scrollTo({top:0,behavior:'instant'});return}
  apply(canOwn&&wantsWorld&&window.scrollY<=2)
 }
 function release(event?:MouseEvent){
  if(event&&(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return false
  mode.release();apply(false);return true
 }
 // Hand body ownership to the modal before it snapshots overflow. The html lock
 // keeps the globe still; the overlay stays suspended through its leave cleanup.
 watch(()=>overlay?.value??false,()=>{bodyLock.value=locked.value&&!(overlay?.value??false)},{flush:'sync'})
 watch(ready,sync,{flush:'post'})
 onNuxtReady(async()=>{
  if(!mounted.value||!hashPending)return
  hashPending=false
  if(location.hash===initialHash){release();await nextTick();if(!mounted.value)return;document.getElementById(initialHash.slice(1))?.scrollIntoView({block:'start',behavior:'instant'})}
  sync()
 })
 onMounted(async()=>{
  initialHash=location.hash;hashPending=!!initialHash&&initialHash!=='#main-content';mode=createWorldScrollMode(window.scrollY,hashPending);mounted.value=true;abort=new AbortController()
  const options={signal:abort.signal,passive:true}
  window.addEventListener('scroll',sync,options);window.addEventListener('resize',sync,options)
  window.addEventListener('hashchange',()=>{if(location.hash&&location.hash!=='#main-content')release();sync()},options)
  window.addEventListener('beforeprint',()=>apply(false),options);window.addEventListener('afterprint',sync,options)
  document.addEventListener('focusin',event=>{
   const target=event.target
   if(locked.value&&target instanceof HTMLElement&&target.closest('main')&&target.tagName!=='MAIN'&&!stage.value?.contains(target)){
    release();target.scrollIntoView({block:'nearest',behavior:'instant'})
   }
  },options)
  await nextTick();sync()
 })
 onBeforeUnmount(()=>{abort?.abort();apply(false);mounted.value=false})
 return{locked:readonly(locked),release}
}
