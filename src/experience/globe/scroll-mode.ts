/** An explicit exit must survive the zero-scroll frame before native anchor navigation starts. */
export function createWorldScrollMode(initialY=0,contentHash=false){
 let mode:'world'|'leaving'|'content'=initialY>2?'content':contentHash?'leaving':'world'
 return{
  release(){mode='leaving'},
  scroll(y:number,protectedWorld=false){if(mode==='world'&&protectedWorld)return true;if(y>2)mode='content';else if(mode==='content')mode='world';return mode==='world'},
 }
}
