import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDelivery,deliveryStops,deliveryStampDefinition,createFerryJourney,ferryStops} from '../src/experience/archipelago/activities.ts';

test('delivery follows its three real stops in order and emits its passport award exactly once',()=>{
 const delivery=createDelivery(),awards=[];
 assert.equal(delivery.snapshot().phase,'ready');assert.equal(delivery.snapshot().total,deliveryStops.length);
 for(let index=0;index<deliveryStops.length;index++){
  const stop=deliveryStops[index],before=delivery.snapshot();assert.equal(before.nextTargetId,stop.targetId);assert.equal(before.nextAction,stop.action);
  for(const other of deliveryStops.filter(candidate=>candidate!==stop))assert.equal(delivery.act(other.targetId,other.action).accepted,false);
  assert.deepEqual(delivery.snapshot(),before,'out-of-order actions cannot move a parcel');
  const result=delivery.act(stop.targetId,stop.action);assert.equal(result.accepted,true);assert.ok(result.message.length>30);awards.push(...result.events);
  assert.equal(delivery.snapshot().step,index+1);assert.equal(delivery.snapshot().carrying,index<deliveryStops.length-1);
  assert.equal(delivery.act(stop.targetId,stop.action).accepted,false,'a duplicate action cannot advance the next checkpoint');
 }
 assert.deepEqual(awards,[{type:'activity',id:deliveryStampDefinition.id}]);assert.equal(delivery.snapshot().phase,'complete');assert.equal(delivery.snapshot().nextTargetId,null);assert.deepEqual(delivery.act('delivery-harbor','deliver').events,[]);
});

test('completed delivery restores from its semantic stamp and Restart begins a fresh optional parcel',()=>{
 const delivery=createDelivery({completed:true});assert.equal(delivery.snapshot().phase,'complete');assert.equal(delivery.act('delivery-workshop','collect').accepted,false);delivery.reset();
 assert.equal(delivery.snapshot().phase,'ready');assert.equal(delivery.snapshot().carrying,false);assert.equal(delivery.act(deliveryStops[0].targetId,deliveryStops[0].action).accepted,true);
 delivery.restore(false);assert.equal(delivery.snapshot().step,1,'an unrelated passport refresh cannot lose a carried parcel');delivery.restore(true);assert.equal(delivery.snapshot().phase,'complete');
});

test('delivery rejects unknown targets and actions without emitting professional or progression data',()=>{
 const delivery=createDelivery(),before=delivery.snapshot();for(const [id,action] of [['notebook','collect'],['delivery-workshop','deliver'],['forged','forged']]){const result=delivery.act(id,action);assert.equal(result.accepted,false);assert.deepEqual(result.events,[])}assert.deepEqual(delivery.snapshot(),before);
});

test('ferry journeys reach each island once with equivalent progress at 30, 60 and 120 Hz',()=>{
 for(const rate of [30,60,120]){
  const ferry=createFerryJourney();assert.equal(ferry.board('harbor',100),null);assert.equal(ferry.snapshot().phase,'sailing');const arrivals=[];
  for(let frame=0;frame<=9*rate;frame++){const arrived=ferry.update(100+frame/rate);if(arrived)arrivals.push(arrived);if(frame===Math.floor(4.5*rate))assert.ok(Math.abs(ferry.snapshot().progress-.5)<1e-10)}
  assert.deepEqual(arrivals,[{from:'harbor',to:'orchard',skipped:false}]);assert.equal(ferry.snapshot().phase,'docked');assert.equal(ferry.snapshot().progress,1);assert.equal(ferry.update(200),null);
  ferry.board('orchard',201);assert.deepEqual(ferry.update(210),{from:'orchard',to:'harbor',skipped:false});assert.equal(ferryStops.find(stop=>stop.id==='orchard').targetId,'ferry-orchard');
 }
});

test('ferry uses only supplied active world time and ignores reversed or invalid clock values',()=>{
 const ferry=createFerryJourney({duration:8});ferry.board('harbor',20);ferry.update(22);const quarter=ferry.snapshot();assert.equal(quarter.progress,.25);
 for(const time of [22,22,21,NaN,Infinity]){assert.equal(ferry.update(time),null);assert.deepEqual(ferry.snapshot(),quarter)}
 assert.equal(ferry.board('orchard',23),null);assert.deepEqual(ferry.snapshot(),quarter,'a second boarding cannot replace a live journey');
 assert.deepEqual(ferry.update(28),{from:'harbor',to:'orchard',skipped:false});
});

test('skip and reduced motion arrive immediately without late duplicate arrivals',()=>{
 for(const preference of [{skip:true},{reduced:true}]){const ferry=createFerryJourney();assert.deepEqual(ferry.board('orchard',0,preference),{from:'orchard',to:'harbor',skipped:true});assert.equal(ferry.snapshot().phase,'docked');assert.equal(ferry.update(50),null);assert.equal(ferry.skip(),null)}
 const ferry=createFerryJourney();ferry.board('harbor',1);ferry.update(2);assert.deepEqual(ferry.skip(),{from:'harbor',to:'orchard',skipped:true});assert.equal(ferry.skip(),null);assert.equal(ferry.update(100),null);
});

test('ferry cancellation and Restart cannot produce a delayed arrival or move the visitor',()=>{
 const ferry=createFerryJourney();ferry.board('harbor',0);ferry.update(3);ferry.cancel();assert.equal(ferry.snapshot().phase,'docked');assert.equal(ferry.snapshot().to,'harbor');assert.equal(ferry.update(30),null);
 ferry.board('orchard',31);ferry.reset();assert.deepEqual(ferry.snapshot(),{phase:'docked',from:'harbor',to:'harbor',progress:0,easedProgress:0,canSkip:false});assert.equal(ferry.update(80),null);
 for(const duration of [0,-1,NaN,Infinity]){const invalid=createFerryJourney({duration});invalid.board('harbor',0);assert.equal(invalid.update(8.9),null);assert.deepEqual(invalid.update(9),{from:'harbor',to:'orchard',skipped:false})}
 const before=ferry.snapshot();for(const [origin,time] of [['harbor',NaN],['harbor',-1],['forged',0]])assert.equal(ferry.board(origin,time),null);assert.deepEqual(ferry.snapshot(),before);
});
