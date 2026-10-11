import data from './assets/simple-houses.json' with {type:'json'}

export const cityModelCredit={text:data.credit,creator:data.creator,source:data.source,reference:data.reference,licenseUrl:data.licenseUrl}

/** Front-door centres measured on the prepared source panels, in unit-width model coordinates. */
export const cityModelDoors:Record<string,{x:number;z:number}>={Cube008:{x:.017235,z:.401996},Cube010:{x:.176095,z:.407073}}

/** Pure dimensions: layouts can use real model bounds without importing Three.js or the loader. */
export function fittedCityModel(name:string,maxWidth:number,maxDepth:number){
 const source=data.models.find(model=>model.name===name)
 if(!source)throw new Error(`Unknown city source mesh: ${name}`)
 if(!Number.isFinite(maxWidth)||!Number.isFinite(maxDepth)||maxWidth<=0||maxDepth<=0)throw new Error('City model bounds must be positive finite metres.')
 const scale=Math.min(maxWidth/source.width,maxDepth/source.depth)
 return{width:source.width*scale,depth:source.depth*scale,height:source.height*scale}
}
