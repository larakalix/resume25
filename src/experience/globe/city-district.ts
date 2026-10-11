import type {MapPoint} from './types.ts'

/** Three linked neighbourhoods on the dry southern shoulder of the globe. */
export const cityDistrict={minX:-58,maxX:58,minZ:28,maxZ:55,arrival:{x:0,z:39.5},name:'Little City'}
export const cityPavingBounds={minX:-56,maxX:56,minZ:28,maxZ:54}
export const cityCrossStreets=[28,36,45,53] as const
export const cityAlleys=[-41.5,-25,25,41.5] as const
export const cityQuarters=[
 {id:'city-square',name:'Little City',label:'Visit the city',x:0,z:40,arrival:cityDistrict.arrival},
 {id:'city-west',name:'The Old Quarter',label:'Explore the Old Quarter',x:-41.5,z:39.5,arrival:{x:-41.5,z:39.5}},
 {id:'city-east',name:'Bluebird Quarter',label:'Explore Bluebird Quarter',x:41.5,z:39.5,arrival:{x:41.5,z:39.5}},
] as const
export const cityAlleyRoutes:MapPoint[][]=cityAlleys.map(x=>Math.abs(x)===25?[{x,z:28},{x,z:36},{x,z:45},{x,z:49.8},{x:x+Math.sign(x)*4,z:51.2},{x:x+Math.sign(x)*4,z:53}]:[{x,z:28},{x,z:36},{x,z:45},{x,z:53}])
export const cityPaths:MapPoint[][]=[
 [{x:0,z:28},{x:0,z:39.5},{x:0,z:53}],
 ...cityCrossStreets.map(z=>[{x:-54,z},{x:0,z},{x:54,z}]),
 ...cityAlleyRoutes,
]
export function inCity(point:MapPoint,margin=0){return point.x>=cityDistrict.minX-margin&&point.x<=cityDistrict.maxX+margin&&point.z>=cityDistrict.minZ-margin&&point.z<=cityDistrict.maxZ+margin}
export function cityGroundWeight(point:MapPoint){
 const dx=Math.max(cityDistrict.minX-point.x,0,point.x-cityDistrict.maxX),dz=Math.max(cityDistrict.minZ-point.z,0,point.z-cityDistrict.maxZ),t=Math.min(1,Math.hypot(dx,dz)/3)
 return 1-t*t*(3-2*t)
}
// Trees live beyond the through-streets, leaving every connected alley open.
export const cityTrees=[38.5,47.5].flatMap(z=>[-1,1].map(side=>({x:side*55,z,size:.68,pine:false})))
export function cityPaved(point:MapPoint){return point.x>cityPavingBounds.minX&&point.x<cityPavingBounds.maxX&&point.z>cityPavingBounds.minZ&&point.z<cityPavingBounds.maxZ&&!cityTrees.some(tree=>Math.hypot((point.x-tree.x)*Math.cos(tree.z/40),point.z-tree.z)<1.3)}
export function cityRoad(point:MapPoint){return Math.abs(point.x)<4.4||cityCrossStreets.some(z=>Math.abs(point.z-z)<1.25)||cityAlleyRoutes.some(route=>route.some((end,i)=>{if(!i)return false;const start=route[i-1]!,scale=Math.cos(point.z/40),dx=(end.x-start.x)*scale,dz=end.z-start.z,t=Math.max(0,Math.min(1,((point.x-start.x)*scale*dx+(point.z-start.z)*dz)/(dx*dx+dz*dz)));return Math.hypot((point.x-start.x)*scale-dx*t,point.z-start.z-dz*t)<.8}))}
export const cityBenches=[{x:-5.4,z:37.6,width:1.9,depth:.65},{x:5.4,z:37.6,width:1.9,depth:.65},...[-1,1].map(side=>({x:side*30,z:38,width:1.9,depth:.65}))]
export const cityLamps=[...([36.8,44,52].flatMap(z=>[-1,1].map(side=>({x:side*(z===36.8?4.9:7),z,width:.35,depth:.35})))),...[30.5,34.5,43.5].flatMap(z=>[-1,1].map(side=>({x:side*39,z,width:.35,depth:.35})))]
export const cityPlanters=[{x:-4.9,z:39,width:.8,depth:.8},{x:4.9,z:39,width:.8,depth:.8},...[-1,1].flatMap(side=>[{x:side*31,z:37.7,width:.8,depth:.8},{x:side*47,z:38,width:.8,depth:.8}])]
export const cityObstacles=[...cityBenches,...cityLamps,...cityPlanters,...[-1,1].map(side=>({x:side*4.3,z:29,width:.22,depth:.22}))]
