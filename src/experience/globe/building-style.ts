import type {ArtColor} from '../explorer/art-kit.ts'

const styles:readonly {wall:number;trim:ArtColor;awning:ArtColor}[]=[
 {wall:0xf0dfc4,trim:'wood',awning:'coral'},
 {wall:0xd4e2d1,trim:'navy',awning:'blue'},
 {wall:0xe7d6c9,trim:'wood',awning:'green'},
 {wall:0xd7dfdf,trim:'navy',awning:'violet'},
]

/** Stable palette variation gives neighbouring shops distinct identities without changing their footprints. */
export function cityBuildingStyle(id:string){
 let hash=0;for(const letter of id)hash=(Math.imul(hash,31)+letter.charCodeAt(0))>>>0
 return styles[hash%styles.length]!
}
