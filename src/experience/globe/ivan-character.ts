import type {ArtKit} from '../explorer/art-kit.ts'
import {createStreetCharacter} from '../street/character.ts'

/** Portrait-inspired host, using the cast's shared rig and authored locomotion. */
export function createIvanCharacter(kit:ArtKit){
 const character=createStreetCharacter(kit,true,{portrait:'ivan',scale:1.02})
 character.avatar.name='Ivan'
 return character
}
