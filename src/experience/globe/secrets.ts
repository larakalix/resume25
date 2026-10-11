import type {Target} from './types.ts'

/** Small authored curiosities use the existing E interaction and never gate portfolio content. */
export const secretDefinitions=[
 {id:'secret-arcade',name:'The tiny high score',hint:'A little trophy waits beside the arcade’s back row.',room:'arcade',x:-.3,z:-1.65,arrival:{x:-.6,z:-.8},variant:'trophy'},
 {id:'secret-tideglass',name:'A shell full of sky',hint:'Follow the pale stones inside Tideglass Cave.',room:'tide-cave',x:1.75,z:-.7,arrival:{x:1.0,z:.15},variant:'shell'},
 {id:'secret-cloudtop',name:'A good idea takes flight',hint:'Something folded is waiting on the path into Cloudtop Garden.',x:-90,z:48.4,arrival:{x:-90,z:47.4},variant:'plane'},
] as const
export type SecretId=typeof secretDefinitions[number]['id']
export const secretTargets:Target[]=secretDefinitions.map(secret=>({
 id:secret.id,name:secret.name,label:`Discover ${secret.name.toLowerCase()}`,kind:'object',topic:'environment',
 x:secret.x,z:secret.z,radius:1.8,arrival:{...secret.arrival},...('room' in secret?{room:secret.room}:{}),
}))
export function isSecret(id:string):id is SecretId{return secretDefinitions.some(secret=>secret.id===id)}
export function secretMessage(id:string){
 return id==='secret-arcade'?'A tiny high score for a curious explorer. The best discoveries aren’t always on the main path.':id==='secret-tideglass'?'Hold the shell to the light. A little piece of the sky seems to live inside.':id==='secret-cloudtop'?'Someone folded a good idea into a paper plane. There’s always room for one more.':''
}
