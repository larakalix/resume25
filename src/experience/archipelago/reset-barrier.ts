interface VisitHistory {readonly state:unknown;replaceState:(state:unknown,unused:string)=>void}
const key='ivanWorldFreshVisits'
function stateOf(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}}
/** History state survives a reload even when every localStorage mutation is denied. */
export function hasSessionReset(history:Pick<VisitHistory,'state'>,world:string){const state=stateOf(history.state);return Array.isArray(state[key])&&state[key].includes(world)}
export function rememberSessionReset(history:VisitHistory,world:string,persistent:boolean){
 const state=stateOf(history.state),worlds=new Set(Array.isArray(state[key])?state[key].filter((value):value is string=>typeof value==='string'):[])
 if(persistent)worlds.delete(world);else worlds.add(world)
 try{history.replaceState({...state,[key]:[...worlds]},'')}catch{/* The current visit remains session-only if history is restricted too. */}
}
