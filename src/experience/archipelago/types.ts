import type {MapPoint,RoomId,Target,Topic} from '../globe/types.ts'
export type {MapPoint,RoomId,Target,Topic}
export type {CharacterDefinition} from './character-definitions.ts'
export interface AssetDefinition {readonly id:string;readonly sourceId:string;readonly pack:'simplepolygon-houses'|'japanese-town'|'kaykit-city-builder'|'japanese-props';readonly kind:'building'|'prop';readonly bounds:Readonly<{width:number;height:number;depth:number}>;readonly source:Readonly<{url:string;reference?:string;creator:string;credit:string;licenseId:string;licenseUrl?:string;terms?:string;preparedSha256:string;file?:string;modelSha256?:string}>}
export interface Vector {x:number;y:number;z:number}
export interface LocalPoint {frame:string;x:number;z:number}
export interface DistrictDefinition {id:string;name:string;anchor:MapPoint;radiusX:number;radiusZ:number;level:number;rotation?:number;theme:'harbor'|'market'|'maker'|'orchard'|'coast'|'islet';coastSeed:number;mounds?:readonly {x:number;z:number;radius:number;height:number}[]}
export type Island=DistrictDefinition
export interface RouteNode {id:string;at:LocalPoint}
export type RoadSurface='stone'|'sand'|'wood'|'grass'
export interface RouteEdge {id:string;from:string;to:string;via?:LocalPoint[];width:number;surface:RoadSurface;kind:'street'|'trail'|'bridge'|'dock';main?:boolean}
export interface BuildingLot {id:string;name:string;at:LocalPoint;assetId:string;maxWidth:number;maxDepth:number;maxHeight?:number;style:'village'|'city'|'japanese';roof:'blue'|'coral'|'violet'|'green';floors?:1|2|3;enter?:RoomId;front?:'front'|'east'|'west';doorOffset?:number;yaw?:number;approach?:LocalPoint[]}
export interface Placement {id:string;name:string;at:LocalPoint;arrival?:LocalPoint;via?:LocalPoint[];radius:number;kind:Target['kind'];topic:Topic;interior?:RoomId;solidRadius?:number;interactive?:boolean}
export interface ResidentDefinition {id:string;name:string;at:LocalPoint;arrival?:LocalPoint;route:LocalPoint[];shelter:LocalPoint;topic:Topic;coat:'coral'|'violet'|'mint'|'gold'|'green'|'blue';hair:'wood'|'navy';hairstyle:'quiff'|'bun'|'curls'|'crop'|'bob';glasses:boolean;scale:number}
export interface WorldDefinition {id:string;version:number;seed:number;radius:number;water:number;areas:readonly string[];islands:readonly DistrictDefinition[];nodes:readonly RouteNode[];edges:readonly RouteEdge[];lots:readonly BuildingLot[];placements:readonly Placement[];residents:readonly ResidentDefinition[];spawn:{edge:string;t:number;lookAt:string};pond:{at:LocalPoint;radius:number;bankWidth:number;dock:LocalPoint;feeding:LocalPoint};harbor:{at:LocalPoint;shore:LocalPoint;width:number;depth:number};ferryRoute:readonly LocalPoint[];wildlife:{patch:LocalPoint;fox:LocalPoint;rabbits:readonly LocalPoint[]};trees:readonly {at:LocalPoint;size:number;pine:boolean}[]}
export interface CompiledBuilding extends MapPoint {id:string;name:string;width:number;depth:number;height:number;roof:BuildingLot['roof'];style:BuildingLot['style'];assetId:string;cityModel?:string;modelFront:'front'|'east'|'west';floors:1|2|3;enter?:RoomId;yaw:number;area:string;doorSide:'front'|'east'|'west';door?:MapPoint;arrival?:MapPoint}
export interface RoadPoint extends MapPoint {height:number}
export interface CompiledRoad {id:string;from:string;to:string;width:number;surface:RoadSurface;kind:RouteEdge['kind'];main:boolean;points:RoadPoint[];length:number}
export interface CompiledResident extends MapPoint {id:string;name:string;phase:number;topic:Topic;route:MapPoint[];shelter:MapPoint;coat:ResidentDefinition['coat'];hair:ResidentDefinition['hair'];hairstyle:ResidentDefinition['hairstyle'];glasses:boolean;scale:number;goal:number}
