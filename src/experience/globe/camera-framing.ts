const wide={height:8.5,back:12.5,side:1.2,lookAhead:2.4,fov:50}
const portrait={height:10.6,back:15.8,side:.6,lookAhead:2.4,fov:56}
const cityPortrait={height:11.5,back:16.5,side:8,lookAhead:2.4,fov:56}
/** Preserve the follow angle while giving the surroundings more room on narrow screens. */
export function followFraming(small:boolean,city=false){return small?(city?cityPortrait:portrait):wide}
