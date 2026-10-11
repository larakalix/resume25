import houses from '../globe/assets/simple-houses.json' with {type:'json'}
import japanese from '../globe/assets/japanese-town.json' with {type:'json'}
import kaykit from '../../../public/models/kaykit/manifest.json' with {type:'json'}
import japaneseProps from '../../../public/models/japanese-props/manifest.json' with {type:'json'}
import type {AssetDefinition} from './types.ts'

interface ModelBounds {name:string;width:number;height:number;depth:number;sourceFile?:string;sourceSha256?:string}
function entries(models:readonly ModelBounds[],pack:AssetDefinition['pack'],kind:AssetDefinition['kind'],source:AssetDefinition['source']):AssetDefinition[]{
 return models.map(model=>{
  if(![model.width,model.height,model.depth].every(value=>Number.isFinite(value)&&value>0))throw new Error(`Invalid asset bounds: ${model.name}`)
  return Object.freeze({id:model.name,sourceId:model.name,pack,kind:pack==='kaykit-city-builder'&&!model.name.startsWith('kay-building-')?'prop':kind,bounds:Object.freeze({width:model.width,height:model.height,depth:model.depth}),source:Object.freeze({...source,...(model.sourceFile?{file:model.sourceFile}:{}),...(model.sourceSha256?{modelSha256:model.sourceSha256}:{})})})
 })
}

/** Prepared native source bounds and provenance; no loader, Three.js or DOM dependency. */
export const assetDefinitions:readonly AssetDefinition[]=Object.freeze([
 ...entries(houses.models,'simplepolygon-houses','building',{url:houses.source,reference:houses.reference,creator:houses.creator,credit:houses.credit,licenseId:houses.licenseUrl,licenseUrl:houses.licenseUrl,terms:houses.terms,preparedSha256:houses.sha256}),
 ...entries(japanese.models,'japanese-town','building',{url:japanese.source,reference:japanese.reference,creator:japanese.creator,credit:japanese.credit,licenseId:japanese.licenseUrl,licenseUrl:japanese.licenseUrl,terms:japanese.terms,preparedSha256:japanese.sha256}),
 ...entries(kaykit.models,'kaykit-city-builder','building',{url:kaykit.source,creator:kaykit.creator,credit:`${kaykit.title} by ${kaykit.creator}`,licenseId:kaykit.license,preparedSha256:kaykit.sha256}),
 ...entries(japaneseProps.models,'japanese-props','prop',{url:japaneseProps.source,creator:japaneseProps.creator,credit:japanese.credit,licenseId:japanese.licenseUrl,licenseUrl:japanese.licenseUrl,terms:japaneseProps.terms,preparedSha256:japaneseProps.sha256}),
])
const byId=new Map(assetDefinitions.map(asset=>[asset.id,asset]))
if(byId.size!==assetDefinitions.length)throw new Error('Duplicate prepared asset identifier.')
export function getAssetDefinition(id:string):AssetDefinition{const asset=byId.get(id);if(!asset)throw new Error(`Unknown world asset: ${id}`);return asset}
