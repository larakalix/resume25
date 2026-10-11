import {loadCityModels} from './city-models.ts'
import {loadJapaneseModels} from './japanese-models.ts'
import {japaneseModelIds} from './japanese-model-specs.ts'
import type {ModelLibrary} from './model-library.ts'

/** Load both source catalogs together and release successful loads if either pack fails. */
export async function loadBuildingModels(signal:AbortSignal):Promise<ModelLibrary>{
 const results=await Promise.allSettled([loadCityModels(signal),loadJapaneseModels(signal)])
 const failure=results.find(result=>result.status==='rejected')
 if(failure?.status==='rejected'){for(const result of results)if(result.status==='fulfilled')result.value.dispose();throw failure.reason}
 const [city,japanese]=results.map(result=>(result as PromiseFulfilledResult<ModelLibrary>).value)
 return{get(name){return japaneseModelIds.has(name)?japanese!.get(name):city!.get(name)},dispose(){city!.dispose();japanese!.dispose()}}
}
