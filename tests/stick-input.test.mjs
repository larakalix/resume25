import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createStickInput} from '../src/experience/explorer/stick-input.ts';
import {createLookRouter} from '../src/experience/globe/input-router.ts';

const idle={knobX:0,knobY:0,input:{x:0,forward:0,run:false}};
const down=(input,id,x,y,pointerType='touch',button=0)=>input.down({id,x,y,pointerType,button});
test('stick captures one touch regardless of its primary status and ignores unrelated pointer activity',()=>{
 const input=createStickInput(),secondary={pointerId:12,isPrimary:false,pointerType:'touch',button:0};
 assert.ok(input.down({...secondary,id:secondary.pointerId,x:16,y:-20}));assert.equal(input.pointerId,12);const held=input.snapshot();
 assert.equal(down(input,13,0,30),null);assert.equal(input.move(13,-30,0),null);assert.equal(input.end(13),null);assert.deepEqual(input.snapshot(),held);
 assert.ok(input.move(12,20,-26));assert.equal(input.end(12).input.forward,0);assert.equal(input.pointerId,undefined);assert.deepEqual(input.snapshot(),idle);assert.equal(input.move(12,32,0),null);
 const mouse=createStickInput();assert.equal(down(mouse,1,16,0,'mouse',2),null);assert.equal(mouse.pointerId,undefined);assert.ok(down(mouse,1,16,0,'mouse',0));
});

test('radial deadzone suppresses jitter, clamps diagonals and preserves the extended-drag run gesture',()=>{
 const input=createStickInput();assert.deepEqual(down(input,1,2,-2).input,idle.input);const half=input.move(1,18,0);assert.ok(Math.abs(half.input.x-.5)<1e-12);assert.equal(half.input.forward,0);
 const diagonal=input.move(1,400,-400);assert.ok(Math.abs(Math.hypot(diagonal.input.x,diagonal.input.forward)-1)<1e-12);assert.ok(Math.abs(Math.hypot(diagonal.knobX,diagonal.knobY)-32)<1e-12);assert.ok(diagonal.input.x>0&&diagonal.input.forward>0);assert.equal(diagonal.input.run,true);
 const extreme=input.move(1,1e308,1e308);assert.ok(Math.hypot(extreme.input.x,extreme.input.forward)<=1);assert.ok(Math.hypot(extreme.knobX,extreme.knobY)<=32);assert.equal(input.move(1,32,0).input.run,false);for(const point of [[NaN,2],[Infinity,0]])assert.deepEqual(input.move(1,...point),idle);
 const copy=input.snapshot();copy.input.x=99;assert.equal(input.snapshot().input.x,0);assert.equal(down(createStickInput(),1,NaN,0),null);
});

test('cancel, blur, hidden-page and disabled cleanup reset ownership and prevent held movement from resuming',()=>{
 const held=createStickInput();down(held,7,0,-60);assert.equal(held.snapshot().input.run,true);assert.deepEqual(held.clear(),idle);assert.equal(held.pointerId,undefined);assert.equal(held.move(7,0,-60),null);assert.equal(held.end(7),null);assert.deepEqual(held.clear(),idle);assert.deepEqual(down(held,8,0,0),idle);
 const input=createStickInput();down(input,5,24,0);assert.deepEqual(input.end(5),idle,'pointer cancellation/lost capture clears only its owner');assert.equal(input.end(5),null,'release-triggered lost capture does not emit another sample');
});

test('a held movement stick and camera orbit/pinch have independent touch ownership in either starting order',()=>{
 for(const cameraFirst of [true,false]){
  const stick=createStickInput(),look=createLookRouter();
  if(cameraFirst)look.down(11,250,100);const walking=stick.down({id:12,x:16,y:-24,pointerType:'touch',isPrimary:!cameraFirst});if(!cameraFirst)look.down(11,250,100);assert.ok(walking.input.forward>0);
  const orbit=look.move(11,300,120,400,800);assert.ok(orbit.yaw!==0&&orbit.pitch!==0);assert.deepEqual(stick.snapshot(),walking);assert.equal(look.count,1,'the stick pointer never joins the camera router');
  look.down(13,350,120);const pinch=look.move(13,390,120,400,800);assert.ok(pinch.zoom<0);assert.equal(pinch.yaw,0);assert.deepEqual(stick.snapshot(),walking);assert.equal(stick.end(13),null,'camera lift cannot release the stick');
  look.up(13);const resumedOrbit=look.move(11,310,120,400,800);assert.ok(resumedOrbit.yaw!==0);assert.equal(resumedOrbit.zoom,0);assert.deepEqual(stick.snapshot(),walking);
  stick.end(12);assert.equal(look.count,1,'releasing movement does not release a camera finger');assert.deepEqual(stick.snapshot(),idle);look.clear();stick.clear();assert.equal(look.count,0);assert.equal(stick.pointerId,undefined);
 }
});
