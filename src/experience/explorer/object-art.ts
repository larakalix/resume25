import * as THREE from 'three'
import { worldObjects } from './world-data'
import type { ArtKit } from './art-kit'

export function createObjectArt(kit: ArtKit) {
    const { surface, mesh, cylinder, sphere, cone, box, rounded, torus, geometries, extras } = kit
    const locate = (id: string) => { const item = worldObjects.find(value => value.id === id)!; return surface(item.x,item.z) }
    const fountain = locate('fountain')
    mesh(cylinder,'pale',[0,.15,0],[1.3,.3,1.3],fountain)
    const rim = mesh(torus,'cream',[0,.4,0],[1.15,1.15,1.15],fountain); rim.rotation.x=Math.PI/2
    mesh(cylinder,'blue',[0,.32,0],[1.05,.08,1.05],fountain)
    mesh(cylinder,'cream',[0,.7,0],[.18,1.1,.18],fountain)
    const jets = new THREE.Group(); fountain.add(jets)
    const jet = mesh(cone,'mint',[0,1.15,0],[.2,1.1,.2],jets,true,false); jet.rotation.z=Math.PI
    const droplets=Array.from({length:9},(_,i)=>mesh(sphere,'mint',[Math.cos(i)*.65,.9,Math.sin(i)*.65],[.07,.12,.07],jets,true,false))
    const mill = locate('windmill')
    mesh(cone,'cream',[0,1.8,0],[1.5,3.6,1.5],mill)
    mesh(cone,'coral',[0,3.8,0],[1.35,1.2,1.35],mill)
    mesh(box,'wood',[0,.7,1.2],[.6,1.4,.12],mill)
    const sails=new THREE.Group(); sails.position.set(0,3,1.25); mill.add(sails)
    mesh(sphere,'gold',[0,0,.1],[.2,.2,.2],sails,true)
    for(let i=0;i<4;i++){
        const blade=new THREE.Group(); blade.rotation.z=i*Math.PI/2; sails.add(blade)
        mesh(box,'wood',[0,1.15,0],[.1,2.4,.1],blade,true)
        for(let slat=0;slat<5;slat++) mesh(box,slat%2?'cream':'sand',[.22,.5+slat*.35,0],[.65,.25,.1],blade,true)
    }
    const harbor = locate('bell')
    for(const x of [-.8,.8])mesh(box,'wood',[x,1.1,0],[.16,2.2,.16],harbor)
    mesh(box,'wood',[0,2.2,0],[1.9,.18,.22],harbor)
    const bell=new THREE.Group(); bell.position.set(0,1.95,0); harbor.add(bell)
    const bellGeometry=new THREE.LatheGeometry([new THREE.Vector2(.07,0),new THREE.Vector2(.14,-.2),new THREE.Vector2(.3,-.45),new THREE.Vector2(.49,-.6),new THREE.Vector2(.55,-.65)],16); geometries.push(bellGeometry)
    mesh(bellGeometry,'gold',[0,0,0],[1,1,1],bell,true)
    mesh(sphere,'navy',[0,-.63,0],[.1,.12,.1],bell,true)
    const rippleMaterial=new THREE.MeshBasicMaterial({color:0xe8bc59,transparent:true,opacity:0,depthWrite:false});extras.push(rippleMaterial)
    const ripples=Array.from({length:2},()=>{const ring=new THREE.Mesh(torus,rippleMaterial);ring.position.y=1.3;harbor.add(ring);return ring})
    const clearing=locate('campfire')
    for(let i=0;i<6;i++){const log=mesh(cylinder,'wood',[Math.cos(i)*.28,.12,Math.sin(i)*.28],[.13,.9,.13],clearing);log.rotation.set(Math.PI/2,0,i)}
    for(let i=0;i<9;i++)mesh(sphere,'pale',[Math.cos(i*Math.PI*2/9)*.75,.12,Math.sin(i*Math.PI*2/9)*.75],[.17,.13,.17],clearing,false,false)
    const flames=new THREE.Group();clearing.add(flames)
    const flameMaterial=new THREE.MeshBasicMaterial({color:0xffb34e});extras.push(flameMaterial)
    for(let i=0;i<3;i++){const flame=new THREE.Mesh(cone,flameMaterial);flame.position.set(Math.sin(i*2.1)*.18,.55,Math.cos(i*2.1)*.18);flame.scale.set(.24,.85+i*.12,.24);flames.add(flame)}
    const fireLight=new THREE.PointLight(0xffb76b,0,8,2);fireLight.position.y=1;clearing.add(fireLight)
    const boat=surface(-21,22,.15)
    mesh(rounded,'wood',[0,.1,0],[2.4,.3,1.05],boat,true)
    for(const side of [-1,1])mesh(box,'coral',[0,.4,side*.55],[2.45,.35,.1],boat,true)
    for(const x of [-1.15,1.15])mesh(box,'wood',[x,.32,0],[.12,.4,1.1],boat,true)
    mesh(box,'cream',[0,.4,0],[.4,.1,1],boat,true)
    // Lamps use instanced emissive meshes in art.ts, not dozens of point lights.
    return { jets,droplets,sails,bell,ripples,rippleMaterial,flames,fireLight,boat }
}
