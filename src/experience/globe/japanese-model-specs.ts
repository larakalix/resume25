import data from './assets/japanese-town.json' with {type:'json'}

export const japaneseModelCredit={text:data.credit,creator:data.creator,source:data.source,reference:data.reference,licenseUrl:data.licenseUrl}
export const japaneseModelIds=new Set(data.models.map(model=>model.name))

/** The full source roof and porch bounds determine both visible scale and solid footprint. */
export function fittedJapaneseModel(name:string,maxWidth:number,maxDepth:number,maxHeight=Infinity){
 const source=data.models.find(model=>model.name===name)
 if(!source)throw new Error(`Unknown Japanese source mesh: ${name}`)
 if(!Number.isFinite(maxWidth)||!Number.isFinite(maxDepth)||maxWidth<=0||maxDepth<=0||maxHeight<=0||Number.isNaN(maxHeight))throw new Error('Japanese model bounds must be positive finite metres.')
 const scale=Math.min(maxWidth/source.width,maxDepth/source.depth,maxHeight/source.height)
 return{width:source.width*scale,depth:source.depth*scale,height:source.height*scale}
}
