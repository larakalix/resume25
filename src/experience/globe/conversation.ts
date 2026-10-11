import type {Profile,Resume,RoleSummary} from '../../domain/content/models.ts'
import {formatResumeDate} from '../../utils/resume-date.ts'
import type {Target} from './types.ts'
import {worldPlaces} from './world-expansion.ts'
import {cityRoomDialogue} from './city-room-conversation.ts'
import {riverCrossings} from './bridge.ts'
import {isSecret,secretMessage} from './secrets.ts'

export interface Reply {label:string;node?:string;action?:string;href?:string}
export interface Dialogue {speaker:string;text:string;detail?:string;choices:Reply[];fictional:boolean}
const roleDates=(role:RoleSummary)=>`${formatResumeDate(role.startDate)} — ${role.endDate?formatResumeDate(role.endDate):'Present'}`
const skillText=(group:Resume['skillGroups'][number])=>`${group.label}: ${group.items.join(', ')}.`

/** Scripted hosts, published professional facts. No generated endorsements or remote chat service. */
export function dialogueFor(target:Target,node:string,profile:Profile,roles:RoleSummary[],groups:Resume['skillGroups'],greeting?:string):Dialogue{
 const topics:Reply[]=[{label:'What does Ivan do?',node:'about'},{label:'Where has he worked?',node:'role:0'},{label:'What does he build with?',node:'skills'},{label:'How does he approach a product?',node:'approach'},{label:'How can we get in touch?',node:'contact'}]
 const workshop:Reply={label:'Can we bring an idea to life?',action:'workshop'}
 const links:Reply[]=[{label:'View the full resume',href:'/resume'},{label:'Explore his projects',href:'/projects'}]
 const d:Dialogue={speaker:target.name,text:'',choices:[],fictional:target.kind==='person'}
 if(isSecret(target.id)){d.text=secretMessage(target.id);return d}
 const cityRoom=cityRoomDialogue(target,node,profile,groups);if(cityRoom)return cityRoom
 if(target.id==='ivan'){
  d.fictional=false
  const questions:Reply[]=[{label:'What’s your story?',node:'about'},{label:'What do you like to build with?',node:'skills'},{label:'How did you get here?',node:'role:0'},{label:'How do you bring ideas to life?',node:'approach'},{label:'I’ve got something in mind.',node:'contact'}]
  if(node==='start'){d.text=greeting??'Hey, come on in. I’m Ivan. There’s a whole world outside, but the story starts here. What brought you this way?';d.choices=questions}
  else if(node==='about'){d.text=`I’m ${profile.name}, a ${profile.headline}.`;d.detail=profile.summary;d.choices=[...questions.filter(q=>q.node!=='about'),...links]}
  else if(node==='skills'){d.text='A good tool earns its place by making the product better. Which part of my toolkit are you curious about?';d.choices=[...groups.map(group=>({label:group.label,node:`group:${group.id}`})),{label:'Something else.',node:'topics'}]}
  else if(node.startsWith('group:')){const group=groups.find(group=>group.id===node.slice(6));d.text=group?skillText(group):'Which part shall we explore?';d.choices=[{label:'Another part of your toolkit.',node:'skills'},{label:'How do you put it together?',node:'approach'},...links]}
  else if(node.startsWith('role:')){const index=Math.max(0,Number.parseInt(node.slice(5),10)||0),role=roles[index];d.text=role?`${role.role} at ${role.company}.`:'You can find the full story in my resume.';if(role)d.detail=roleDates(role);d.choices=[...(roles[index+1]?[{label:'And before that?',node:`role:${index+1}`}]:[]),...links,{label:'Something else.',node:'topics'}]}
  else if(node==='approach'){d.text='I turn complex ideas into usable products. I like to start with the person using the product, then make the moving parts fit together.';d.detail=groups.filter(group=>['architecture','delivery'].includes(group.id)).map(skillText).join('\n\n');d.choices=[workshop,{label:'Show me your projects.',href:'/projects'},{label:'I have something in mind.',node:'contact'}]}
  else if(node==='contact'){d.text='A product idea, a tricky problem, or a role to talk about? I’d love to hear what you have in mind.';d.detail=profile.email;d.choices=[{label:'Write an email.',href:`mailto:${profile.email}`},{label:'All contact details.',href:'/contact'},{label:'Keep chatting.',node:'topics'}]}
  else{d.text='What else would you like to know?';d.choices=questions}
  return d
 }
 if(node==='start'&&(target.id.startsWith('city-')||target.id==='pip'||target.id==='rowan')&&target.kind==='person'){
  const openings:Record<string,string>={
   'city-nico':'Oh, hey! First wander through Little City? The café is open, and Paper & Ink is just across the street. Where shall we go?',
   'city-aya':'Hi there. Taking the scenic route? There’s a bookshop to explore, a café to duck into, and a little story behind this whole place.',
   'city-june':'You found the far end of the street! No rush heading back. Fancy a look inside one of the shops?',
   'city-ben':'Hey! I’m Ben. This lane connects the quiet corners of the city. Looking for a place to stop, or curious about Ivan’s work?',
   pip:'Welcome to Corner Café! I’m Pip. Come have a look around. A little change of scenery can be a good place to start a conversation.',
   rowan:'Oh, hello. I’m Rowan. Welcome to Paper & Ink. Take your time looking around. Curious about the story behind this world?',
  }
  d.text=openings[target.id]!
  d.choices=[...(target.room?[{label:'Tell me about Ivan.',node:target.room==='bookshop'?'role:0':'about'}]:[{label:'Let’s stop at the café.',action:'travel:cafe-door'},{label:'Show me the bookshop.',action:'travel:bookshop-door'},{label:'Who built this place?',node:'about'}]),...links]
  return d
 }
 if(target.id==='bluebird-lighthouse'){d.text='A red roof, a striped tower, and a little light above the city. Welcome to Bluebird Lighthouse.';d.detail='The beacon turns after dark. Follow the waterfront path back to the city, or keep exploring the globe. This tower is an outdoor landmark.';d.choices=[{label:'Back to Bluebird Quarter.',action:'travel:city-east'},{label:'Find the coastal crossing.',action:'travel:coastal-lookout'},{label:'Visit Ivan’s house.',action:'travel:home-door'}];return d}
 if(target.id==='coastal-lookout'){d.text='The city ends here. The adventure keeps going. Horizon Causeway crosses the bay to the far-side trails.';d.detail='Follow the white stone span. Solid parapets protect both sides; the ends are open. Tideglass Cave is beside the far landing.';d.choices=[{label:'Find Tideglass Cave.',action:'travel:tide-cave-door'},{label:'Visit the far-side orchard.',action:'travel:sunlit-orchard'},{label:'Explore the pottery studio.',action:'travel:ceramics-door'}];return d}
 if(target.kind==='place'){
  const destination=worldPlaces.find(place=>place.id===target.id),crossing=riverCrossings.find(bridge=>bridge.id===target.id)
  if(destination){
   const descriptions={
    orchard:'A little harvest stop, on the other side of the planet. Follow the path past the fruit cart and you’ll eventually come back to town. Shall we keep wandering?',
    stars:'You made it all the way around to Star Garden. The little observatory has the best company after dark. Want to climb higher, or follow the trail home?',
    lookout:'A breeze, a distant horizon, and a whole world below. You reached Northwind Lookout. The trail continues around the polar garden. Where next?',
    garden:'Welcome to Cloudtop Garden. A quiet bench, flowers in the breeze, and a path back to the city. There’s no wrong way to take the scenic route.',
   }
   d.text=descriptions[destination.theme]
   d.detail='All of these places are connected by walkable trails. The left and right edges of the atlas meet on the far side of the globe.'
   const next=worldPlaces[(worldPlaces.indexOf(destination)+1)%worldPlaces.length]!
   d.choices=[{label:`Show me ${next.name}.`,action:`travel:${next.id}`},{label:'Back to the city.',action:'travel:city-square'},{label:'Let’s visit Ivan.',action:'travel:home-door'}]
   return d
  }
  if(crossing){
   d.text=`You found ${crossing.name}. Another way across the river, with white stone underfoot. Shall we see what’s on the other bank?`
   d.detail='Walk straight through the open ends. The stone borders keep you safely on the deck.'
   d.choices=[{label:crossing.x<0?'Visit the lantern streets.':crossing.x>80?'Find the northern lookout.':'Visit the gardener.',action:`travel:${crossing.x<0?'japan-quarter':crossing.x>80?'north-lookout':'sol'}`},{label:'Show me the far-side orchard.',action:'travel:sunlit-orchard'},{label:'Back to Ivan’s house.',action:'travel:home-door'}]
   return d
  }
  if(target.id==='japan-quarter'||target.id==='japan-courtyard'){
   const courtyard=target.id==='japan-courtyard'
   d.text=courtyard?'You found the quiet end of the lane. A little courtyard, broad tiled eaves and a moment to slow down.':'Welcome to Komorebi Quarter. Shall we follow the lantern lane past the little shops, or find a quiet corner by the hall?'
   d.detail=node==='inspiration'?'Two references helped shape the mood: a temple district and a colourful everyday town street. Komorebi is a fictional neighbourhood built with imported Japanese models.':courtyard?'The shops and hall here are outdoor scenery. Ivan’s house, the workshop, library, city café and bookshop are open to explore.':'Watch for the dark tiled roofs, wooden façades and shop curtains. The street lanterns glow after dark.'
   d.choices=[{label:courtyard?'Back to the lantern lane.':'Show me the courtyard.',action:`travel:${courtyard?'japan-quarter':'japan-courtyard'}`},{label:'What inspired this place?',node:'inspiration'},...links]
   if(node==='inspiration')d.choices=[{label:'Sensoji architecture reference',href:'https://sketchfab.com/3d-models/fm-polygon-japan-sensoji-b57471898c00466381b2395f0a204309'},{label:'Japanese town street reference',href:'https://sketchfab.com/3d-models/stylized-little-japanese-town-street-200fc33b8a2b4da98e71590feeb255a8'},d.choices[0]!]
   return d
  }
  if(target.id==='harbor'){d.text='Welcome to the harbor. The Small World cruise is moored beside the pier.';d.detail='Take a walk along the waterfront, enjoy the view, or ring the harbor bell for a little send-off.';d.choices=[{label:'Ring the harbor bell',action:'ring'},...links];return d}
  d.text=target.id==='city-west'?'Welcome to the Old Quarter. Follow the little lanes past the bakery, flower shop and colourful old houses.':target.id==='city-east'?'Welcome to Bluebird Quarter. Take a stroll past the record shop, tea room and pixel arcade.':'Welcome to Little City. Follow the avenue through the square, then explore the lanes of the Old Quarter and Bluebird Quarter.'
  d.detail='Corner Café and Paper & Ink are open. Say hello to the people along the avenue, or step inside and meet the shopkeepers. Pixel Arcade and Clay & Co. are open too. Look for the blue door markers.'
  d.choices=[{label:'Step into Corner Café.',action:'travel:cafe-door'},{label:'Visit Paper & Ink.',action:'travel:bookshop-door'},{label:'Visit Pixel Arcade.',action:'travel:arcade-door'},{label:'Try Clay & Co.',action:'travel:ceramics-door'},{label:'Visit the idea workshop',action:'workshop'},...links];return d
 }
 if(node==='start'&&target.kind==='person'){
  d.text=target.id==='mira'?`Welcome to the meadow! I’m ${target.name}. Want to get to know Ivan?`:target.id==='theo'?'Welcome to the workshop! I’m Theo. This is where ideas start taking shape. What are you curious about?':target.id==='rue'?'I’m Rue, keeper of the library. Every product has a story. Shall we talk about the work behind Ivan’s?':'Hi, I’m Sol. Different problems, different tools. Want a peek inside Ivan’s toolkit?'
  const first=target.id==='rue'?'role:0':target.topic==='toolkit'?'skills':target.topic
  d.choices=[...topics.filter(c=>c.node===first),...topics.filter(c=>c.node!==first)]
  if(target.id==='mira'||target.id==='theo')d.choices.unshift(workshop)
  if(target.id==='sol')d.choices=[{label:'Let’s explore his toolkit',node:'skills'},...topics.filter(c=>c.node!=='skills')]
  return d
 }
 if(target.topic==='animal'){
  d.text=target.id==='patch'?'Patch leans in, tail already wagging. A walk is better with a friend.':target.id==='miso'?'Miso has found the warmest spot in the library. There might be room for one more friend.':target.id==='fox'?'A rustle, a twitch of an ear. Clover is curious about you.':'Three small ducks, one very important question: did you bring a snack?'
  d.choices=target.id==='patch'?[{label:'Give Patch a pat',action:'pet'},{label:'Play together',action:'play'},{label:'Toggle walking together',action:'follow'}]:target.id==='miso'?[{label:'Give Miso a gentle pat',action:'pet'}]:target.id==='fox'?[{label:'Say hello to Clover',action:'hello'}]:[{label:'Feed the ducks',action:'feed'}]
  return d
 }
 if(target.topic==='environment'){
  d.text=target.id==='windmill'?'The meadow has its own rhythm. Shall we let the sails turn?':target.id==='bell'?'Some wishes deserve a little fanfare. Ring the bell and send yours across the meadow.':target.id==='lamp'?'A small light for a big idea. You’re in charge of the desk lamp.':'A good spot to pause and watch the world go by. Shall we light a fire?'
  d.choices=[{label:target.id==='bell'?'Ring the wishing bell':target.id==='windmill'?'Start / stop the windmill':target.id==='lamp'?'Switch the desk lamp':'Light / put out the campfire',action:'toggle'}];return d
 }
 const first=node==='start'?target.topic:node
 if(first==='about'){
  d.text=node==='start'?`Welcome to the meadow! I’m ${target.name}. Want to get to know Ivan?`:`${profile.name} is a ${profile.headline}.`
  if(node!=='start')d.detail=profile.summary
  d.choices=node==='start'?topics:[...topics.filter(c=>c.node!=='about'),...links]
 }else if(first==='history'||first.startsWith('role:')){
  const index=first==='history'?0:Math.max(0,Number.parseInt(first.slice(5),10)||0),role=roles[index]
  if(role){d.text=`${role.role} at ${role.company}.`;d.detail=roleDates(role);d.choices=[...(roles[index+1]?[{label:'And before that?',node:`role:${index+1}`}]:[]),...(index>0?[{label:'Back to the most recent role',node:'role:0'}]:[]),...links,{label:'Let’s talk about something else',node:'topics'}]}
  else{d.text='His full resume is a good place to get to know the work behind the products.';d.choices=[...links,{label:'What else can you tell me?',node:'topics'}]}
 }else if(first==='toolkit'||first==='skills'){
  d.text='Different problems call for different tools. Which part of his toolkit are you curious about?';d.choices=[...groups.map(g=>({label:g.label,node:`group:${g.id}`})),{label:'Something else',node:'topics'}]
 }else if(first.startsWith('group:')){
  const group=groups.find(g=>g.id===first.slice(6));d.text=group?skillText(group):'Choose an area of the toolkit.';d.choices=[{label:'Explore another area',node:'skills'},{label:'How does he put it together?',node:'approach'},...links]
 }else if(first==='approach'){
  d.text='“I turn complex ideas into usable products.” That’s the idea at the heart of Ivan’s work.';d.detail=groups.filter(g=>['architecture','delivery'].includes(g.id)).map(skillText).join('\n\n');d.choices=[workshop,{label:'Show me the toolkit',node:'skills'},...links,{label:'I have something in mind',node:'contact'}]
 }else if(first==='contact'){
  d.text='Have something in mind? A product to build, a tricky problem, or a role to talk about? Say hello.';d.detail=profile.email;d.choices=[{label:'Write Ivan an email',href:`mailto:${profile.email}`},{label:'All contact details',href:'/contact'},{label:'Keep exploring',node:'topics'}]
 }else{d.text='Pull up a chair. What would you like to know?';d.choices=topics}
 return d
}
