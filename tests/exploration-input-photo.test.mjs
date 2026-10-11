import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createLookRouter,legacyLook} from '../src/experience/globe/input-router.ts';
import {photoSize,defaultPhotoOptions} from '../src/experience/globe/photo.ts';

test('one finger uses viewport-relative orbit while a second canvas finger pinches without rotating',()=>{
 const router=createLookRouter();router.down(2,100,100);assert.deepEqual(router.move(99,200,100,400,800),{yaw:0,pitch:0,zoom:0});
 const look=router.move(2,200,200,400,800);assert.equal(look.yaw,-Math.PI/2);assert.equal(look.pitch,Math.PI/8);
 router.down(3,300,200);const pinch=router.move(3,400,200,400,800);assert.equal(pinch.yaw,0);assert.equal(pinch.pitch,0);assert.ok(pinch.zoom<0);
 router.down(4,200,200);assert.equal(router.count,2);router.up(3);assert.equal(router.move(2,200,200,400,800).zoom,0);router.clear();assert.equal(router.count,0);
});
test('drag sensitivity is independent of CSS viewport size and cancellation prevents stale deltas',()=>{
 const a=createLookRouter(),b=createLookRouter();a.down(1,0,0);b.down(1,0,0);
 assert.deepEqual(a.move(1,100,50,400,800),b.move(1,200,100,800,1600));a.clear();assert.deepEqual(a.move(1,200,100,400,800),{yaw:0,pitch:0,zoom:0});
});
test('postcard dimensions never upscale and respect both long-edge and area limits',()=>{
 for(const small of [true,false])for(const [width,height] of [[400,800],[6000,1000],[1000,6000],[3000,3000],[1920,1080]]){
  const size=photoSize(width,height,small);assert.ok(size.width<=width&&size.height<=height);assert.ok(Math.max(size.width,size.height)<=(small?1280:1920));assert.ok(size.width*size.height<=(small?921600:2073600));assert.ok(Math.abs(size.width/size.height-width/height)<.01);
 }
 assert.deepEqual(photoSize(375,812,true),{width:375,height:812});assert.throws(()=>photoSize(0,10,true));assert.throws(()=>photoSize(NaN,10,false));
 const a=defaultPhotoOptions();a.pose='wave';assert.equal(defaultPhotoOptions().pose,'idle');
});

test('legacy rollback retains its original pixel-based drag sensitivity without gaining pinch zoom',()=>{for(const [width,height]of [[375,812],[1440,900]]){const router=createLookRouter();router.down(1,0,0);const gesture=legacyLook(router.move(1,100,50,width,height),width,height);assert.ok(Math.abs(gesture.yaw+.8)<1e-12);assert.ok(Math.abs(gesture.pitch-.15)<1e-12);assert.equal(legacyLook({...gesture,zoom:.5},width,height).zoom,0)}});
