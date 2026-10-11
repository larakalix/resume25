/** Original, locally authored greetings for the cartoon Ivan at home. */
export const ivanGreetings:readonly string[]=Object.freeze([
 'Oh, hey! I’m Ivan. Come on in. There’s a whole world outside, and a story behind it. What are you curious about?',
 'You found my place! I turn complicated ideas into things people can actually use. Want to hear how that starts?',
 'Come in, come in. You’ve met the little version of me. Shall I introduce you to the developer behind the glasses?',
 'Hey! The house comes with a view and a developer who enjoys a tricky problem. Got one you’d like to talk through?',
 'A visitor! Make yourself at home. We can talk about the things I build, the tools I use, or how I ended up here.',
 'Welcome to my corner of the map. The workshop is just outside. Want to know what happens before an idea gets there?',
 'There you are! I’m Ivan. Somewhere between an idea and a working product is my favourite part. Want a closer look?',
 'Oh, hello! That world outside is my way of making introductions. How about we start with the person who built it?',
 'Glad you dropped in. Do you want the story, a peek at the toolkit, or a conversation about something you’re imagining?',
 'Hey, fellow wanderer. Every useful product starts somewhere. Want to talk about turning a rough idea into a real one?',
 'Step inside. I’m a full-stack developer, which means I’m curious about what happens on both sides of the screen. You too?',
 'You can follow the paths outside in any order. Same goes for this conversation. What would you like to know about me?',
 'Hi! I’m Ivan. I like making complicated things feel simple to use. The interesting part is figuring out how. Shall we?',
 'Welcome in. A tiny house seems like a good place for a big conversation. What brings you here: curiosity or an idea?',
 'Good to see you. There’s a lot to explore out there. Want a little background on the developer before you head off?',
 'Hey! You’ve arrived at the part of the portfolio that talks back. I’m Ivan. Where should we start?',
 'Come on in. I can tell you about the work, the tools, or the thinking behind it all. Pick a thread and we’ll follow it.',
 'Hello, explorer. A neat interface can hide a wonderfully messy problem. Curious about how I put those pieces together?',
 'Oh, hey there! I’m Ivan. If you brought a half-formed idea, that’s plenty to start a conversation. What’s on your mind?',
 'Welcome! Consider this the starting point. My story, my toolkit, and a few interesting problems are all fair game.',
 'Hey there. The little world is playful; the work behind it is worth a look too. Want me to give you some context?',
 'You’re right on time for a conversation. I’m Ivan, and I build things for people to use. What would you like to explore?',
 'Come in. Behind every button is a decision someone had to make. Want to hear how I think through those decisions?',
 'Hi! If you’re wondering whether I work on the interface or the engine underneath, the answer is both. Curious how that fits?',
 'Welcome to the house. We can start at the beginning, jump to the tools, or talk about your next idea. Your call.',
 'Oh, hey. Take a moment before your next stop. Want to hear a little about the work that brought me to this point?',
 'A good question can take us somewhere interesting. I’m Ivan. What would you like to know about the way I build?',
 'Hello! The workshop is for trying things out. This is a good spot to talk about why I build them in the first place.',
 'Come on in. I’m happy to talk shop, but you don’t need to know the jargon. Want the story behind what I do?',
 'Hey, you made it! There’s a developer behind this tiny face. Want to hear about the projects, the process, or the journey?',
 'Welcome. If an idea has a lot of moving parts, I’m interested. Shall we talk about how those parts become a product?',
 'Oh, hello there. Looking for someone to build with, or just having a wander? Either way, I’m glad you stopped to chat.',
 'Hi! This world starts with a small introduction. I’m Ivan. What do you want to discover about the person behind the code?',
 'Come in. The most interesting part of a product is often the problem it solves. Want to hear how I approach that?',
 'Good to see you here. We can trace the career path, open the toolkit, or start with an idea of yours. What sounds good?',
 'Hey! I’m Ivan. I help ideas make the jump from “what if” to something useful. Curious about what that takes?',
 'Welcome, explorer. You’ve found the quiet corner of the map. Want to talk about the work before your next adventure?',
 'Oh, a visitor. I was hoping the little house would make a friendly introduction. I’m Ivan. What’s your first question?',
 'Hey there. There are a few ways to get to know a developer. The work, the tools, or the choices along the way. Pick one?',
 'Step right in. Complicated ideas are welcome here. Want to hear how I find a starting point when the pieces don’t fit yet?',
 'Hello! You can explore the world at your own pace. If you’d like some company for a minute, I can tell you about my work.',
 'Welcome in. I’m Ivan, the full-stack engineer behind this place. Want to peek at how the design and the code meet?',
 'Hey! The big question is usually “how do we make this useful?” That’s a conversation I’m always up for. Shall we start?',
 'Oh, hi. A portfolio can tell you what someone has done. A conversation can tell you how they think. Want to give it a go?',
 'You found the front door. Nice. I’m Ivan. Shall we follow the story of my work, or talk about something you’d like to build?',
 'Come on in. There’s room for a question here, even a very rough one. Want to start with what I do or how I do it?',
 'Hi, explorer. I build across the screen and the systems behind it. The fun is getting them to work together. Curious?',
 'Glad you came by. If you’re deciding whether we’d work well together, ask away. Where would you like to begin?',
 'Hey! A useful product starts as a possibility. Want to talk about the way I turn possibilities into things people can use?',
 'Welcome to my place. The next part of the conversation is yours. My story, my tools, or an idea you brought along?',
])

/** Shuffle without repetition; a reset discards the queue but remembers the last hello. */
export function createIvanGreetings(random:()=>number=Math.random){
 let bag:string[]=[],cursor=0,last:string|undefined
 function refill(){
  bag=[...ivanGreetings]
  for(let i=bag.length-1;i>0;i--){
   const sample=random(),unit=Number.isFinite(sample)?Math.max(0,Math.min(1,sample)):.5
   const j=Math.min(i,Math.floor(unit*(i+1)))
   ;[bag[i],bag[j]]=[bag[j]!,bag[i]!]
  }
  if(bag[0]===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1]!,bag[0]!]
  cursor=0
 }
 return{
  next(){if(cursor>=bag.length)refill();last=bag[cursor++]!;return last},
  reset(){bag=[];cursor=0},
 }
}
