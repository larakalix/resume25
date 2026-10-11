import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ivanGreetings,createIvanGreetings} from '../src/experience/globe/ivan-greetings.ts';

test('Ivan has fifty distinct short openings that fit one conversation beat',()=>{
 assert.equal(ivanGreetings.length,50);
 assert.equal(new Set(ivanGreetings).size,50);
 assert.ok(Object.isFrozen(ivanGreetings));
 for(const quote of ivanGreetings){
  assert.equal(quote,quote.trim());
  assert.ok(quote.length>=35&&quote.length<=175,`${quote.length}: ${quote}`);
  assert.ok(/[.!?]$/u.test(quote));
 }
});

test('each shuffled cycle contains every quote with no immediate repeat at cycle boundaries',()=>{
 let seed=913;
 const greetings=createIvanGreetings(()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32});
 let previous;
 for(let cycle=0;cycle<6;cycle++){
  const quotes=Array.from({length:50},()=>greetings.next());
  assert.notEqual(quotes[0],previous);
  assert.deepEqual([...quotes].sort(),[...ivanGreetings].sort());
  previous=quotes.at(-1);
 }
});

test('constant, invalid and extreme random samples stay in bounds and resets avoid a repeated hello',()=>{
 for(const value of [0,1,-1,3,NaN,Infinity,-Infinity]){
  const greetings=createIvanGreetings(()=>value);
  let previous;
  for(let cycle=0;cycle<3;cycle++){
   const quotes=Array.from({length:50},()=>greetings.next());
   assert.notEqual(quotes[0],previous);
   assert.equal(new Set(quotes).size,50);
   assert.ok(quotes.every(quote=>ivanGreetings.includes(quote)));
   previous=quotes.at(-1);
  }
  const last=greetings.next();greetings.reset();assert.notEqual(greetings.next(),last);
 }
});

test('greeting bags are independent and do not mutate the authored catalogue',()=>{
 const before=[...ivanGreetings],a=createIvanGreetings(()=>.1),b=createIvanGreetings(()=>.1);
 assert.equal(a.next(),b.next());
 a.next();a.reset();
 const remaining=Array.from({length:49},()=>b.next());
 assert.equal(new Set(remaining).size,49);
 assert.deepEqual(ivanGreetings,before);
});
