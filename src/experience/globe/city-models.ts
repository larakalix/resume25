import data from './assets/simple-houses.json' with {type:'json'}
import {parseModelLibrary} from './model-library.ts'
import type {ModelLibrary} from './model-library.ts'

export type CityModelLibrary=ModelLibrary
export const parseCityModels=(bytes:ArrayBuffer,signal?:AbortSignal)=>parseModelLibrary(bytes,data,signal)

/** A required same-origin asset: errors use the world's existing loading/text fallback. */
export async function loadCityModels(signal:AbortSignal):Promise<CityModelLibrary>{
 const response=await fetch(`/models/city-street/simple-houses.glb?v=${data.sha256.slice(0,12)}`,{signal})
 if(!response.ok)throw new Error(`City model asset could not load (${response.status}).`)
 return parseCityModels(await response.arrayBuffer(),signal)
}
