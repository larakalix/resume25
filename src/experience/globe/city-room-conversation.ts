import type {Profile,Resume} from '../../domain/content/models.ts'
import type {Dialogue,Reply} from './conversation.ts'
import type {Target} from './types.ts'

/** Fictional shop activities; professional details always come from the published profile. */
export function cityRoomDialogue(target:Target,node:string,profile:Profile,groups:Resume['skillGroups']):Dialogue|null{
 if(target.id!=='kit'&&target.id!=='mara')return null
 const choices:Reply[]=[{label:'Explore the real projects.',href:'/projects'},{label:'What does Ivan do?',node:'about'}]
 const result=(text:string,replies:Reply[],detail?:string):Dialogue=>({speaker:target.name,text,detail,choices:replies,fictional:true})
 const toolkit=groups.find(group=>group.id==='frontend')??groups[0],practice=groups.filter(group=>['architecture','delivery'].includes(group.id))
 const tools=toolkit?`${toolkit.label}: ${toolkit.items.join(', ')}.`:undefined
 if(target.id==='kit'){
  if(node==='start')return result(`Hey, welcome to Pixel Arcade! I’m Kit. A tiny game, a little curiosity. Want to try a product-design round, or see what ${profile.name} builds with?`,[{label:'Let’s play one round.',node:'arcade:round'},{label:'Show me Ivan’s toolkit.',node:'skills'},...choices.slice(0,1)])
  if(node==='arcade:round')return result('Picture a booking form: people keep leaving at the last step. You have one move. What do you try first?',[{label:'Watch someone try to finish it.',node:'arcade:observe'},{label:'Add more options.',node:'arcade:options'},{label:'Rebuild the entire form.',node:'arcade:rebuild'}],'A fictional design challenge, not a claim about a past client.')
  if(node==='arcade:observe')return result('Good first move! Find the confusing moment before choosing a fix. A smaller, clearer change gives you something useful to test.',[{label:'What tools could help?',node:'skills'},{label:'Let’s shape an idea in the workshop.',action:'workshop'},...choices.slice(0,1)],tools)
  if(node==='arcade:options'||node==='arcade:rebuild')return result(node==='arcade:options'?'More options might help, but they can add another decision. We haven’t found the stumbling block yet. Want to take a closer look first?':'A fresh start is tempting. Before spending that effort, let’s find the part that actually needs to change.',[{label:'Watch someone use it first.',node:'arcade:observe'},{label:'Try the round again.',node:'arcade:round'},...choices.slice(0,1)])
 }else{
  if(node==='start')return result(`Come in, there’s room at the table. I’m Mara. Clay starts as a rough shape; products often do too. Shall we shape a pretend idea, or talk about ${profile.name}’s work?`,[{label:'I have a rough idea.',node:'ceramics:shape'},{label:'How does Ivan approach products?',node:'approach'},...choices.slice(0,1)])
  if(node==='ceramics:shape')return result('Let’s imagine a little tool that helps a team organize their work. Before we add features, which question should we ask?',[{label:'Who is it for, and what gets in their way?',node:'ceramics:people'},{label:'Which framework should we choose?',node:'ceramics:tools'},{label:'How polished can we make it?',node:'ceramics:polish'}],'A fictional idea to explore together; no invented client or project history.')
  if(node==='ceramics:people')return result('There’s the shape. Pick one person, one task, and one outcome. Make that first path useful; then test it before adding the next layer.',[{label:'Take this idea to the workshop.',action:'workshop'},{label:'Explore the actual toolkit.',node:'skills'},...choices.slice(0,1)],practice.length?practice.map(group=>`${group.label}: ${group.items.join(', ')}.`).join('\n\n'):profile.summary)
  if(node==='ceramics:tools'||node==='ceramics:polish')return result(node==='ceramics:tools'?'We’ll need tools, but the shape comes first. A framework is easier to choose once we know whose day we’re trying to improve.':'A lovely finish matters. Let’s give it something useful to sit on first: one clear task, for one real person.',[{label:'Start with the person using it.',node:'ceramics:people'},{label:'Explore Ivan’s toolkit.',node:'skills'},...choices.slice(0,1)])
 }
 return null
}
