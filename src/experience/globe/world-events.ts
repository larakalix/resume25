import type {MapPoint,RoomId} from './types.ts'
import type {ActivityId,TrailId} from './passport.ts'
import type {SecretId} from './secrets.ts'

/** Renderer and simulation boundary values. Transient events never become saved passport progress. */
export interface WorldFootstepEvent {
 type:'footstep'
 position:Readonly<MapPoint>
 heading:number
 foot:'left'|'right'
 inside:RoomId|null
 surface:'sand'|'wood'|'ground'
 time:number
}
export interface WorldInteractionEvent {
 type:'interaction'
 id:string
 action:string
 room:RoomId|null
 time:number
}
export interface WorldTrailProgressEvent {
 type:'trail-progress'
 trailId:TrailId
 completed:number
 total:number
 finished:boolean
}
/** No runtime event bus: the owning scene publishes these through its existing callback. */
export type WorldEvent=
 |WorldFootstepEvent
 |WorldInteractionEvent
 |WorldTrailProgressEvent
 |{type:'discover';id:string}
 |{type:'conversation';id:string}
 |{type:'activity';id:ActivityId}
 |{type:'secret';id:SecretId}
