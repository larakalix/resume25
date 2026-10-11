import type { MoveInput, TimeMode } from '../explorer/types.ts'
import type { HatId } from '../explorer/seasonal-hats.ts'
import type {WorkshopState} from './workshop.ts'
import type {QualityChoice,QualitySnapshot} from './quality.ts'
import type {TalkView} from './talk-view.ts'
import type {WorldLoadState} from './loading.ts'
import type {PhotoOptions,PhotoExport} from './photo.ts'
import type {WeatherChoice} from './weather.ts'
import type {WorldEvent,PassportSnapshot} from './passport.ts'
import type {DeliverySnapshot,FerrySnapshot} from '../archipelago/activities.ts'
import type {TrailGuidance} from './trail-guidance.ts'
export type RoomId='home'|'home-studio'|'home-balcony'|'workshop'|'library'|'cafe'|'bookshop'|'arcade'|'ceramics'|'crystal-cave'|'tide-cave'
export type Topic='about'|'toolkit'|'history'|'approach'|'contact'|'animal'|'environment'
export interface MapPoint {x:number;z:number}
export interface NavigationState extends MapPoint {yaw:number;inside:RoomId|null;cameraYaw?:number}
export interface Target extends MapPoint {id:string;name:string;label:string;kind:'person'|'door'|'animal'|'object'|'place'|'exit';topic:Topic;radius:number;arrival:MapPoint;room?:RoomId;interior?:RoomId;entry?:MapPoint}
export interface Walker extends MapPoint {id:string;yaw:number;speed:number;stopped:boolean;phase:number;greeting?:number}
export interface Player extends MapPoint {y:number;vy:number;yaw:number;speed:number;crouched:boolean;vx:number;vz:number;landing:number;steps:number;stepProgress:number}
export interface Snapshot {near:string|null;inside:RoomId|null;overview:boolean;crouched:boolean;discovered:number;total:number;workshop:WorkshopState;delivery?:DeliverySnapshot;ferry?:FerrySnapshot}
export type SoundStatus='off'|'on'|'paused'|'unavailable'
export interface RuntimeState {sound:SoundStatus;quality:QualitySnapshot}
export interface Outcome {message:string}
export interface ResidentGreeting {text:string;sequence:number}
export interface GlobeOptions {reduced:boolean;world?:'archipelago'|'legacy';controls?:'v2'|'legacy';onEvent?:(event:WorldEvent)=>void;onGuidance?:(value:TrailGuidance|null)=>void;onLoad?:(value:WorldLoadState)=>void;onState:(value:Snapshot)=>void;onNavigation:(value:NavigationState)=>void;onTalkView?:(value:TalkView|null)=>void;onGreeting?:(value:ResidentGreeting|null)=>void;onRuntime:(value:RuntimeState)=>void;onInteract:(id:string)=>void;onMove:()=>void;onFailure:()=>void}
export interface GlobeController {
 setInput:(value:MoveInput)=>void;setCrouch:(value:boolean)=>void;setEngaged:(id:string|null)=>void
 setActive:(value:boolean)=>void;setReduced:(value:boolean)=>void;setHat:(value:HatId)=>void;setTimeMode:(value:TimeMode)=>void
 halt:()=>void;setSound:(value:boolean)=>Promise<boolean>;setQuality:(value:QualityChoice)=>void;measure:()=>void
 explore:()=>void;overview:()=>void;orbit:(x:number,y:number)=>void;visit:(id:string)=>void;interact:()=>void;leave:()=>void
 zoom:(delta:number)=>void;recenter:()=>void;setWeather:(value:WeatherChoice)=>void;setProgress:(value:PassportSnapshot)=>void
 setPhoto:(value:boolean)=>void;setPhotoOptions:(value:PhotoOptions)=>void;capturePhoto:()=>Promise<PhotoExport>
 jump:()=>void;wave:()=>void;action:(id:string,action:string)=>Outcome;reset:()=>void;dispose:()=>void
}
export interface GlobeHandle extends Omit<GlobeController,'dispose'|'setActive'|'setReduced'> {focus:()=>void;resumeKey:(code:string)=>void}
