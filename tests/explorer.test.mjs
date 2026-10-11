import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorldSimulation, destinations, obstacles } from '../src/experience/explorer/simulation.ts';
import { advance, dot, PLANET_RADIUS, surfaceDistance, surfaceFrame, surfacePoint } from '../src/experience/explorer/planet.ts';
import { SPAWN, worldTargets, worldObjects, residents, createObjectState } from '../src/experience/explorer/world-data.ts';
import { bridge, river, riverX, isWater, onBridge, constrainWater, groundHeight } from '../src/experience/explorer/terrain.ts';
import { daylight, DAY_LENGTH } from '../src/experience/explorer/daylight.ts';
import { activateObject, residentDialogue } from '../src/experience/explorer/dialogue.ts';
import { panelShortcut } from '../src/experience/explorer/keyboard.ts';
import { hatChoice, seasonalHat, thanksgivingDay } from '../src/experience/explorer/seasonal-hats.ts';
import { createArtKit } from '../src/experience/explorer/art-kit.ts';
import { createCharacter } from '../src/experience/explorer/character.ts';
import * as THREE from 'three';
const idle = { x: 0, forward: 0, run: false };

test('seasonal hats use Ivan’s Eastern calendar and include exact holiday boundaries', () => {
    const cases = [
        ['2026-06-01T03:59:59Z','everyday'], ['2026-06-01T04:00:00Z','birthday'],
        ['2026-06-02T03:59:59Z','birthday'], ['2026-06-02T04:00:00Z','everyday'],
        ['2026-10-24T16:00:00Z','everyday'], ['2026-10-25T16:00:00Z','halloween'],
        ['2026-10-31T16:00:00Z','halloween'], ['2026-11-01T16:00:00Z','everyday'],
        ['2026-11-22T16:00:00Z','everyday'], ['2026-11-23T16:00:00Z','thanksgiving'],
        ['2026-11-29T16:00:00Z','thanksgiving'], ['2026-11-30T16:00:00Z','everyday'],
        ['2024-12-01T16:00:00Z','thanksgiving'], ['2024-12-02T16:00:00Z','everyday'],
        ['2026-12-20T04:59:59Z','everyday'], ['2026-12-20T05:00:00Z','christmas'],
        ['2026-12-27T04:59:59Z','christmas'], ['2026-12-27T05:00:00Z','everyday'],
        ['2027-01-01T16:00:00Z','everyday'],
    ];
    for (const [date, expected] of cases) assert.equal(seasonalHat(new Date(date)), expected, date);
    assert.equal(seasonalHat(new Date(NaN)), 'everyday');
    for (let year=2020;year<2040;year++) {
        const day=thanksgivingDay(year);
        assert.ok(day>=22&&day<=28);assert.equal(new Date(Date.UTC(year,10,day)).getUTCDay(),4);
    }
    for (const value of [null,undefined,'','unknown',['birthday'],'__proto__']) assert.equal(hatChoice(value),'auto');
    for (const value of ['auto','everyday','birthday','christmas','thanksgiving','halloween']) assert.equal(hatChoice(value),value);
});

test('the articulated character stays grounded and reuses each hat without moving body geometry', () => {
    const scene=new THREE.Scene(),kit=createArtKit(scene),character=createCharacter(kit);
    const bodyBounds=new THREE.Box3().setFromObject(character.avatar);
    assert.ok(bodyBounds.min.y>=-.02&&bodyBounds.min.y<=.02);
    const styles=['everyday','birthday','christmas','thanksgiving','halloween'];
    for (const style of styles) {
        character.hats.set(style);
        character.avatar.updateMatrixWorld(true);
        const visible=character.head.children.filter(child=>child.type==='Group'&&child!==character.eyes&&child.visible);
        assert.equal(visible.length,1);
        const bounds=new THREE.Box3().setFromObject(visible[0]);
        assert.ok(Object.values(bounds.min).every(Number.isFinite));assert.ok(bounds.max.y<3.5);
        assert.ok(bounds.min.y>2.3);
    }
    const counts={geometries:kit.geometries.length,materials:kit.extras.length};
    for(let i=0;i<20;i++) for(const style of styles)character.hats.set(style);
    assert.deepEqual({geometries:kit.geometries.length,materials:kit.extras.length},counts);
    character.head.rotation.z=.12;character.knees[0].rotation.x=.4;
    assert.ok(new THREE.Box3().setFromObject(character.avatar).max.y<3.5);
    kit.dispose();
});

test('reading panels return to play without intercepting browser or reading controls', () => {
    for (const code of ['KeyE', 'Escape']) {
        assert.equal(panelShortcut(code, false, false, false, false), 'close');
        assert.equal(panelShortcut(code, true, false, false, false), null);
    }
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) {
        assert.equal(panelShortcut(code, false, false, false, false), 'walk');
        assert.equal(panelShortcut(code, true, false, false, false), 'walk');
        assert.equal(panelShortcut(code, false, false, false, true), null);
    }
    for (const code of ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End']) {
        assert.equal(panelShortcut(code, false, false, false, false), 'read');
        assert.equal(panelShortcut(code, false, false, false, true), null);
    }
    for (const code of ['Tab', 'Space', 'Enter']) assert.equal(panelShortcut(code, false, false, false, false), null);
    assert.equal(panelShortcut('KeyE', false, true, false, false), null);
    assert.equal(panelShortcut('KeyE', false, false, true, false), null);
    assert.equal(panelShortcut('KeyW', false, false, true, false), null);
});

test('movement normalizes diagonal input, stops on release, and clamps stalled frames', () => {
    const straight = createWorldSimulation(), diagonal = createWorldSimulation();
    straight.step(.05, { ...idle, x: 1 }); diagonal.step(.05, { ...idle, x: 1, forward: 1 });
    assert.ok(Math.abs(straight.body.speed - diagonal.body.speed) < .00001);
    const position = { x: diagonal.body.x, z: diagonal.body.z };
    diagonal.step(.05, idle); assert.equal(diagonal.body.speed, 0);
    assert.deepEqual({ x: diagonal.body.x, z: diagonal.body.z }, position);
    const stalled = createWorldSimulation(); stalled.step(1000, { ...idle, x: 1, run: true });
    assert.ok(stalled.body.speed <= 6.00001); assert.ok(surfaceDistance(stalled.body, SPAWN) <= .30001);
    stalled.step(NaN, { x: Infinity, forward: NaN, run: false });
    assert.ok(Object.values(stalled.body).every(Number.isFinite));
});

test('walking stays on the spherical surface and outside static obstacles', () => {
    for (const input of [{ x: 1, forward: 0 }, { x: -1, forward: 1 }, { x: 0, forward: -1 }]) {
        const simulation = createWorldSimulation();
        for (let i = 0; i < 900; i++) simulation.step(1 / 60, { ...input, run: true });
        const p = surfacePoint(simulation.body);
        assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - PLANET_RADIUS) < .00001);
        for (const obstacle of obstacles) assert.ok(surfaceDistance(simulation.body, obstacle) >= obstacle.radius + .35);
    }
});

test('a full great-circle walk crosses both poles without barriers or frame flips', () => {
    const frame = surfaceFrame({ x: 0, z: 0 }), start = structuredClone(frame);
    for (let i = 0; i < 1200; i++) {
        const previous = structuredClone(frame);
        advance(frame, 0, 1, 2 * Math.PI * PLANET_RADIUS / 1200);
        for (const axis of ['normal', 'east', 'south']) {
            assert.ok(Math.abs(dot(frame[axis], frame[axis]) - 1) < .00001);
            assert.ok(dot(previous[axis], frame[axis]) > .999);
        }
        assert.ok(Math.abs(dot(frame.normal, frame.east)) < .00001);
        assert.ok(Math.abs(dot(frame.normal, frame.south)) < .00001);
    }
    assert.ok(dot(start.normal, frame.normal) > .99999);
    assert.ok(dot(start.east, frame.east) > .99999);
});

test('hop is grounded, cannot accumulate midair impulses, and lands', () => {
    const simulation = createWorldSimulation(); simulation.jump(); simulation.step(.05, idle);
    const velocity = simulation.body.vy; assert.ok(simulation.body.y > 0);
    simulation.jump(); assert.equal(simulation.body.vy, velocity);
    for (let i = 0; i < 90; i++) simulation.step(1 / 60, idle);
    assert.equal(simulation.body.y, 0); assert.equal(simulation.body.vy, 0);
});

test('every place is reachable directly, pushable objects react, and reset restores a fresh world', () => {
    const simulation = createWorldSimulation(), original = structuredClone(simulation.objects);
    for (const place of destinations) { simulation.visit(place.id); assert.equal(simulation.nearest(), place.id); assert.ok(surfaceDistance(simulation.body, place) < place.radius); }
    simulation.body.x = simulation.objects[0].x; simulation.body.z = simulation.objects[0].z + .4;
    simulation.step(.02, idle); assert.notDeepEqual(simulation.objects, original);
    for (let i = 0; i < 200; i++) simulation.step(.02, idle);
    assert.ok(simulation.objects.every(object => Object.values(object).every(Number.isFinite)));
    simulation.reset(); assert.deepEqual(simulation.objects, original); assert.equal(simulation.body.x, 0); assert.equal(simulation.body.z, SPAWN.z);
    const second = createWorldSimulation(); second.objects[0].x = 100;
    assert.deepEqual(simulation.objects, original);
});

test('water keeps walkers on shore while the bridge provides a continuous raised crossing', () => {
    const z = 0, middle = riverX(z), previous = { x: middle - river.halfWidth - 1, z }, point = { x: middle, z };
    assert.ok(isWater(point)); constrainWater(point, previous, .36);
    assert.ok(point.x < middle - river.halfWidth);
    const deck = { x: bridge.x, z: bridge.z };
    constrainWater(deck, { x: bridge.x - 3, z: bridge.z }, .36);
    assert.equal(deck.x, bridge.x); assert.ok(onBridge(deck)); assert.ok(groundHeight(deck) > .6);
    for (let x = bridge.x - bridge.halfLength; x <= bridge.x + bridge.halfLength; x += .2) {
        const step = { x, z: bridge.z }; constrainWater(step, { x: x - .2, z: bridge.z }, .36);
        assert.ok(onBridge(step)); assert.equal(step.x, x); assert.ok(Number.isFinite(groundHeight(step)));
    }
    const edge = { x: bridge.x, z: bridge.z + 2 };
    constrainWater(edge, deck, .36); assert.ok(onBridge(edge));
});

test('every portfolio place, resident and object has a safe direct arrival and matching interaction', () => {
    const simulation = createWorldSimulation();
    for (const target of worldTargets) {
        assert.ok(!isWater(target.arrival, .3) || onBridge(target.arrival), target.id);
        simulation.visit(target.id); assert.equal(simulation.nearest(), target.id);
        if(target.kind==='place'||target.kind==='object')assert.deepEqual({ x: simulation.body.x, z: simulation.body.z }, target.arrival);else assert.ok(surfaceDistance(simulation.body,simulation.target(target.id))<target.radius);
        for (const obstacle of obstacles) assert.ok(surfaceDistance(simulation.body, obstacle) >= obstacle.radius + .35, target.id);
    }
});

test('object actions change real local state independently and reset restores defaults', () => {
    const initial = createObjectState();
    for (const object of worldObjects) {
        const next = activateObject(initial, object.id);
        assert.notEqual(next, initial);
        assert.equal(next[object.id], object.id === 'bell' ? 1 : !initial[object.id]);
        for (const other of worldObjects.filter(item => item.id !== object.id)) assert.equal(next[other.id], initial[other.id]);
    }
    assert.deepEqual(createObjectState(), initial);
});

test('automatic daylight is periodic, manual modes are deterministic and reduced motion holds auto daylight', () => {
    assert.equal(daylight(0, 'cycle'), 1); assert.equal(daylight(DAY_LENGTH / 2, 'cycle'), 0);
    for (const t of [0, 25, 80, 130, 190]) {
        assert.ok(Math.abs(daylight(t, 'cycle') - daylight(t + DAY_LENGTH, 'cycle')) < .00001);
        assert.equal(daylight(t, 'day'), 1); assert.equal(daylight(t, 'night'), 0);
        assert.equal(daylight(t, 'cycle', true), 1);
    }
    assert.ok(Number.isFinite(daylight(NaN, 'cycle')));
});

test('fictional villager dialogue derives names and skill references from supplied profile content', () => {
    const profile = { name: 'Ivan Lara', headline: 'UI & Full-Stack Developer' };
    const skills = [{ id: 'frontend', label: 'Frontend', items: ['Test UI', 'Typed views'] }, { id: 'architecture', label: 'Architecture', items: ['Test architecture'] }];
    for (const person of residents) assert.ok(residentDialogue(person.id, profile, skills).every(line => typeof line === 'string' && line.length));
    assert.match(residentDialogue('theo', profile, skills).join(' '), /Test UI, Typed views/);
    assert.match(residentDialogue('theo', profile, skills).join(' '), /Test architecture/);
    assert.match(residentDialogue('mira', { ...profile, name: 'Alex Rivera' }, skills)[0], /Alex the dev/);
});
