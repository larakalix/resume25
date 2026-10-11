/** Viewport percentages, kept separate from the scene's Three.js objects. */
export interface TalkAnchor {x:number;y:number;visible:boolean}
export interface TalkView {speaker:TalkAnchor;player:TalkAnchor}
