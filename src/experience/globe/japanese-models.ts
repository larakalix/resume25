import data from './assets/japanese-town.json' with {type:'json'}
import {parseModelLibrary} from './model-library.ts'
import type {ModelLibrary} from './model-library.ts'

export const parseJapaneseModels=(bytes:ArrayBuffer,signal?:AbortSignal)=>parseModelLibrary(bytes,data,signal)
export async function loadJapaneseModels(signal:AbortSignal):Promise<ModelLibrary>{
 const response=await fetch(`/models/japanese-town/town-buildings.glb?v=${data.sha256.slice(0,12)}`,{signal})
 if(!response.ok)throw new Error(`Japanese model asset could not load (${response.status}).`)
 return parseJapaneseModels(await response.arrayBuffer(),signal)
}
