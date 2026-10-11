import {test} from 'node:test'
import assert from 'node:assert/strict'
import {hasSessionReset,rememberSessionReset} from '../src/experience/archipelago/reset-barrier.ts'

test('a storage-denied reset survives realm recreation through the current history entry',()=>{
 const history={state:{back:'/blog',position:4},replaceState(value){this.state=value}}
 rememberSessionReset(history,'archipelago',false)
 const reloaded={state:structuredClone(history.state)}
 assert.equal(hasSessionReset(reloaded,'archipelago'),true)
 assert.equal(hasSessionReset(reloaded,'legacy'),false)
 assert.equal(reloaded.state.position,4);assert.equal(reloaded.state.back,'/blog')
 rememberSessionReset(history,'archipelago',true)
 assert.equal(hasSessionReset(history,'archipelago'),false)
})
test('malformed state and denied history writes remain safe without altering other worlds',()=>{
 assert.equal(hasSessionReset({state:{ivanWorldFreshVisits:'archipelago'}},'archipelago'),false)
 const history={state:{ivanWorldFreshVisits:['legacy']},replaceState(value){this.state=value}}
 rememberSessionReset(history,'archipelago',false)
 assert.equal(hasSessionReset(history,'legacy'),true)
 rememberSessionReset(history,'archipelago',true)
 assert.equal(hasSessionReset(history,'legacy'),true)
 assert.doesNotThrow(()=>rememberSessionReset({state:null,replaceState(){throw new Error('Denied')}},'archipelago',false))
})
