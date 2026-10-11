import type {CharacterMotionInput} from '../explorer/character-motion.ts'
import type {PhotoPose} from './photo.ts'

interface PresentedPlayer {speed:number;y:number;vy:number;crouched:boolean}
export interface PhotoPresentationOptions {active:boolean;pose:PhotoPose;reduced:boolean;restore:boolean;waving:boolean;delta:number;crouchBlend:number}

/** View-only posing never changes player physics or the user's motion preference. */
export function photoCharacterPresentation(player:PresentedPlayer,options:PhotoPresentationOptions){
 const instant=options.active||options.reduced||options.restore,dt=Number.isFinite(options.delta)?Math.max(0,Math.min(.05,options.delta)):0
 const motion:CharacterMotionInput={speed:options.active?0:player.speed,y:options.active?0:player.y,vy:options.active?0:player.vy,waving:options.active?options.pose==='wave':options.waving,reduced:instant}
 // Restore must snap even at delta zero: a paused world's next frame may be its
 // only frame until the visitor chooses to resume the simulation.
 const crouchBlend=options.active?Number(options.pose==='crouch'):instant?Number(player.crouched):options.crouchBlend+(Number(player.crouched)-options.crouchBlend)*(1-Math.exp(-dt*14))
 return{motion,crouchBlend}
}
