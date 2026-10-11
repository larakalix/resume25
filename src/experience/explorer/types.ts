export type WorldPlace = 'about' | 'toolkit' | 'approach' | 'contact'
export type ResidentId = 'mira' | 'theo' | 'sol'
export type PetId = 'patch' | 'miso'
export type PetAction = 'pet' | 'play' | 'follow'
export type WorldObjectId = 'fountain' | 'windmill' | 'bell' | 'campfire' | 'bridge-lights'
export type WorldTargetId = WorldPlace | ResidentId | WorldObjectId | PetId
export type TimeMode = 'cycle' | 'day' | 'night'
export interface Point2 { x: number; z: number }
interface TargetBase extends Point2 { label: string; radius: number; arrival: Point2 }
export interface WorldDestination extends TargetBase { id: WorldPlace; kind: 'place' }
export interface WorldResident extends TargetBase { id: ResidentId; kind: 'resident'; name: string; occupation: string }
export interface WorldPet extends TargetBase { id: PetId; kind: 'pet'; name: string; species: 'dog' | 'cat'; description: string }
export interface WorldObject extends TargetBase { id: WorldObjectId; kind: 'object'; description: string }
export type WorldTarget = WorldDestination | WorldResident | WorldObject | WorldPet
export interface PetState { affection: number; following: boolean; playing: boolean }
export interface WorldObjectState { fountain: boolean; windmill: boolean; bell: number; campfire: boolean; 'bridge-lights': boolean }
export interface WorldObstacle extends Point2 { radius: number }
export interface MoveInput { x: number; forward: number; run: boolean }
export interface ExplorerBody extends Point2 { y: number; vy: number; yaw: number; speed: number }
export interface PlayObject extends Point2 { vx: number; vz: number; radius: number }
export interface WorldSimulation {
    population: import('./population').Population
    target: (id: WorldTargetId) => WorldTarget | undefined
    setConversation: (id: WorldTargetId | null) => void
    setReduced: (value: boolean) => void
    interactPet: (id: PetId, action: PetAction) => PetState
    frame: import('./planet').SurfaceFrame
    body: ExplorerBody
    objects: PlayObject[]
    step: (delta: number, input: MoveInput) => void
    jump: () => void
    reset: () => void
    visit: (id: WorldTargetId) => void
    nearest: () => WorldTargetId | null
}
export interface WorldOptions {
    overviewInsets?: () => { top: number; bottom: number }
    labels: Partial<Record<WorldTargetId, HTMLElement>>
    reduced: boolean
    onNear: (place: WorldTargetId | null) => void
    onMove: () => void
    onFailure: () => void
}
export interface ExplorerController {
    setConversation: (id: WorldTargetId | null) => void
    interactPet: (id: PetId, action: PetAction) => PetState
    setHat: (hat: import('./seasonal-hats').HatId) => void
    setTimeMode: (mode: TimeMode) => void
    interactObject: (id: WorldObjectId) => WorldObjectState
    explore: () => void
    setInput: (input: MoveInput) => void
    setActive: (value: boolean) => void
    setReduced: (value: boolean) => void
    visit: (id: WorldTargetId) => void
    jump: () => void
    wave: () => void
    reset: () => void
    dispose: () => void
}
export interface ExplorerHandle {
    interactPet: (id: PetId, action: PetAction) => PetState | undefined
    setHat: (hat: import('./seasonal-hats').HatId) => void
    setTimeMode: (mode: TimeMode) => void
    interactObject: (id: WorldObjectId) => WorldObjectState | undefined
    explore: () => void
    move: (input: MoveInput) => void
    resumeKey: (code: string) => void
    visit: (id: WorldTargetId) => void
    jump: () => void
    wave: () => void
    reset: () => void
    focus: () => void
}
