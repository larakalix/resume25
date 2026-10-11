import type { WorldDestination, WorldObject, WorldObjectState, WorldResident, WorldTarget, WorldPet } from './types.ts'
export const SPAWN = { x: 0, z: 11 }
export const villageBenches = [{x:-6.4,z:11.5,radius:1.15,yaw:.25},{x:-8.4,z:21.5,radius:1.15,yaw:-.6},{x:22.3,z:21,radius:1.15,yaw:.7}]
export const villagePaths = [
    [SPAWN, { x: 0, z: 5 }, { x: -14, z: -6 }],
    [{ x: 0, z: 5 }, { x: 1.2, z: 5 }, { x: 11.2, z: 5 }, { x: 14, z: -10 }],
    [{ x: 11.2, z: 5 }, { x: 18, z: 10 }, { x: 25, z: 19 }],
    [SPAWN, { x: -15, z: 15 }, { x: -20, z: 14 }],
    [{ x: -14, z: -6 }, { x: -25, z: -8 }],
    [{ x: 0, z: 5 }, { x: 0, z: -30 }],
]

export const destinations: WorldDestination[] = [
    { id: 'about', kind: 'place', label: 'About me', x: -14, z: -6, radius: 4, arrival: { x: -14, z: -2.8 } },
    { id: 'toolkit', kind: 'place', label: 'My toolkit', x: 14, z: -10, radius: 4, arrival: { x: 14, z: -6.8 } },
    { id: 'approach', kind: 'place', label: 'How I build', x: 18, z: 10, radius: 4, arrival: { x: 18, z: 13.2 } },
    { id: 'contact', kind: 'place', label: 'Say hello', x: -15, z: 15, radius: 4, arrival: { x: -15, z: 18.2 } },
]
export const residents: WorldResident[] = [
    { id: 'mira', kind: 'resident', name: 'Mira', label: 'Talk to Mira', occupation: 'Village guide', x: -4, z: 10, radius: 3, arrival: { x: -4, z: 12 } },
    { id: 'theo', kind: 'resident', name: 'Theo', label: 'Talk to Theo', occupation: 'Workshop tinkerer', x: 13, z: -4, radius: 3, arrival: { x: 13, z: -2 } },
    { id: 'sol', kind: 'resident', name: 'Sol', label: 'Talk to Sol', occupation: 'Dock keeper', x: -11, z: 19, radius: 3, arrival: { x: -11, z: 21 } },
]
export const worldObjects: WorldObject[] = [
    { id: 'fountain', kind: 'object', label: 'Village fountain', description: 'A little water for the village square. Turn the fountain on or off and watch the jets respond.', x: -5, z: 5, radius: 3, arrival: { x: -5, z: 7.4 } },
    { id: 'windmill', kind: 'object', label: 'Hilltop windmill', description: 'Give the old mill a little extra energy. Its sails can turn gently or pick up speed.', x: -25, z: -8, radius: 4, arrival: { x: -25, z: -4.8 } },
    { id: 'bell', kind: 'object', label: 'Harbor bell', description: 'Send a silent greeting across the harbor. Ring the bell to set it swinging.', x: -20, z: 14, radius: 3, arrival: { x: -20, z: 16.3 } },
    { id: 'campfire', kind: 'object', label: 'Forest campfire', description: 'A quiet clearing above the river. Light the fire and return after dark to see its warm glow.', x: 25, z: 19, radius: 3, arrival: { x: 25, z: 21.4 } },
    { id: 'bridge-lights', kind: 'object', label: 'River bridge', description: 'Walk across the arched bridge to reach the eastern village. Its lanterns can be switched on or off.', x: 6.2, z: 5, radius: 5.2, arrival: { x: 1.5, z: 5 } },
]
export const pets: WorldPet[] = [
    {id:'patch',kind:'pet',name:'Patch',species:'dog',label:'Meet Patch',description:'A cheerful village dog. Say hello, invite him along, or start a little game.',x:-2,z:13,radius:2.8,arrival:{x:0,z:13}},
    {id:'miso',kind:'pet',name:'Miso',species:'cat',label:'Meet Miso',description:'The harbor cat has a curious streak. A little attention usually earns a happy tail.',x:-12,z:17,radius:2.8,arrival:{x:-10,z:17}},
]
export const worldTargets: WorldTarget[] = [...destinations, ...residents, ...pets, ...worldObjects]
export function createObjectState(): WorldObjectState { return { fountain: true, windmill: false, bell: 0, campfire: false, 'bridge-lights': true } }
export function objectAction(id: WorldObject['id'], state: WorldObjectState) {
    if (id === 'bell') return 'Ring the bell'
    const active = state[id]
    return id === 'fountain' ? active ? 'Stop the fountain' : 'Start the fountain' : id === 'windmill' ? active ? 'Let the mill settle' : 'Speed up the sails' : id === 'campfire' ? active ? 'Put out the fire' : 'Light the fire' : active ? 'Turn lanterns off' : 'Light the lanterns'
}
