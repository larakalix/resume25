export const worldLoadStages=['module','terrain','models','buildings','city','residents','shaders','ready'] as const
export type WorldLoadStage=typeof worldLoadStages[number]
export interface WorldLoadState {stage:WorldLoadStage;completed:number;total:number;title:string;detail:string}

const copy:Record<WorldLoadStage,{title:string;detail:string}>={
 module:{title:'Opening a little adventure',detail:'Getting the world ready. You can read the complete portfolio below while it opens.'},
 terrain:{title:'Shaping the meadow',detail:'Preparing the grass, water and winding shoreline.'},
 models:{title:'Unpacking the city',detail:'Loading the houses and lighthouse, and preparing their materials.'},
 buildings:{title:'Opening the neighbourhood',detail:'Putting the houses, workshop and welcoming signs in place.'},
 city:{title:'Finding your way around',detail:'Laying out the city lanes, temple garden and harbour.'},
 residents:{title:'Waking up the locals',detail:'Getting Ivan, the neighbours and their animal friends ready to meet you.'},
 shaders:{title:'Checking the view',detail:'Preparing the first view for your screen. Almost time to explore.'},
 ready:{title:'Your world is ready',detail:'Walk, wander and say hello. There is plenty to discover.'},
}

/** Completed setup phases, rather than an estimated download percentage or timer. */
export function worldLoadState(stage:WorldLoadStage):WorldLoadState{
 return{stage,completed:worldLoadStages.indexOf(stage),total:worldLoadStages.length-1,...copy[stage]}
}

/** Ignore delayed callbacks from an earlier setup phase; ready is an explicit renderer signal. */
export function advanceWorldLoad(current:WorldLoadState,next:WorldLoadState):WorldLoadState{
 const canonical=worldLoadState(next.stage)
 return canonical.completed>current.completed?canonical:current
}
