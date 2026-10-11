import manifest from '../../../public/models/japanese-props/manifest.json' with {type:'json'}
import {parseModelLibrary,type ModelLibrary} from '../globe/model-library.ts'

export type JapanesePropsLibrary=ModelLibrary
export const japanesePropMetrics=manifest.models

/** Six native creator models, original topology/normals and linear material colours retained. */
export async function loadJapaneseProps(signal:AbortSignal):Promise<JapanesePropsLibrary>{
 const response=await fetch(`/models/japanese-props/props.glb?v=${manifest.sha256.slice(0,12)}`,{signal})
 if(!response.ok)throw new Error(`Japanese scenery could not load (${response.status}).`)
 return parseModelLibrary(await response.arrayBuffer(),manifest,signal)
}
