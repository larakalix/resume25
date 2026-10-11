import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Scene} from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createStreetCharacter} from '../src/experience/street/character.ts';
import {photoCharacterPresentation} from '../src/experience/globe/photo-presentation.ts';
const idle={speed:0,y:0,vy:0,crouched:false};
const options={active:false,pose:'idle',reduced:false,restore:false,waving:false,delta:0,crouchBlend:0};
function character(t){const art=createGlobeArt(new Scene()),hero=createStreetCharacter(art.kit);t.after(()=>{hero.dispose();art.dispose()});return hero}
const arm=hero=>['upperarm_r','lowerarm_r','hand_r'].map(name=>hero.avatar.getObjectByName(name).quaternion.toArray());
const difference=(a,b)=>Math.max(...a.flat().map((v,i)=>Math.abs(v-b.flat()[i])));

test('exiting a wave photograph restores the actual character arm and weights at zero elapsed time',t=>{
 const hero=character(t);hero.motion.update(0,photoCharacterPresentation(idle,options).motion);const before=arm(hero);
 const photo=photoCharacterPresentation(idle,{...options,active:true,pose:'wave'});hero.motion.update(0,photo.motion);assert.ok(difference(arm(hero),before)>.3);assert.equal(hero.motion.snapshot().wave,1);
 // The previous failure: normal delta-zero easing leaves the photo wave active.
 hero.motion.update(0,photoCharacterPresentation(idle,options).motion);assert.equal(hero.motion.snapshot().wave,1);
 const restored=photoCharacterPresentation(idle,{...options,restore:true,crouchBlend:1});hero.motion.update(0,restored.motion);assert.ok(difference(arm(hero),before)<1e-8);assert.equal(hero.motion.snapshot().wave,0);assert.equal(hero.motion.snapshot().idle,1);assert.equal(restored.crouchBlend,0);assert.equal(options.reduced,false);
 assert.equal(photoCharacterPresentation(idle,options).motion.reduced,false,'the one-frame reset must not change the visitor preference');
});

test('a gameplay wave still in progress resumes after an idle photo instead of being permanently cleared',t=>{
 const hero=character(t),expected=character(t);expected.motion.update(0,photoCharacterPresentation(idle,{...options,waving:true,restore:true}).motion);const expectedArm=arm(expected);
 hero.motion.update(0,photoCharacterPresentation(idle,{...options,active:true,pose:'idle'}).motion);assert.equal(hero.motion.snapshot().wave,0);
 hero.motion.update(0,photoCharacterPresentation(idle,{...options,restore:true,waving:true}).motion);assert.equal(hero.motion.snapshot().wave,1);assert.ok(difference(arm(hero),expectedArm)<1e-8);
});

test('photo poses leave player physics untouched and restore an airborne player to the actual jump animation',t=>{
 const hero=character(t),player={speed:2.65,y:.9,vy:-1,crouched:false},before={...player};
 hero.motion.update(0,photoCharacterPresentation(player,{...options,restore:true}).motion);assert.equal(hero.motion.snapshot().jumpAir,1);
 const photo=photoCharacterPresentation(player,{...options,active:true,pose:'crouch'});hero.motion.update(0,photo.motion);assert.equal(photo.crouchBlend,1);assert.equal(photo.motion.y,0);assert.equal(photo.motion.vy,0);assert.deepEqual(player,before);
 const restored=photoCharacterPresentation(player,{...options,restore:true,crouchBlend:1});hero.motion.update(0,restored.motion);assert.equal(hero.motion.snapshot().jumpAir,1);assert.equal(restored.crouchBlend,0);assert.equal(restored.motion.y,.9);assert.equal(restored.motion.vy,-1);assert.deepEqual(player,before);
});

test('a genuinely crouched player stays crouched on exit while ordinary motion keeps its existing easing and Calm policy',t=>{
 const player={...idle,crouched:true},hero=character(t),restored=photoCharacterPresentation(player,{...options,restore:true});hero.motion.update(0,restored.motion);assert.equal(restored.crouchBlend,1);
 const ordinary=photoCharacterPresentation({...idle,speed:2.65},{...options,delta:1/60,crouchBlend:1});hero.motion.update(1/60,ordinary.motion);assert.equal(ordinary.motion.reduced,false);assert.ok(ordinary.crouchBlend>0&&ordinary.crouchBlend<1);assert.ok(hero.motion.snapshot().walk>0&&hero.motion.snapshot().walk<1);
 const calm=photoCharacterPresentation(player,{...options,reduced:true,crouchBlend:0});assert.equal(calm.crouchBlend,1);assert.equal(calm.motion.reduced,true);
});
