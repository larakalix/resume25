import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'

const atlasSize=1024,cellWidth=256,cellHeight=96,columns=4,rows=10,textWidth=228
export interface BuildingSignOptions {position:[number,number,number];width:number;theme?:'cream'|'navy'}
export interface SignTextLayout {lines:string[];fontSize:number;pixelWidth:number;pixelHeight:number}
type Measure=(text:string,fontSize:number)=>number
const estimate:Measure=(text,size)=>[...text].reduce((width,char)=>width+(/[MW@]/u.test(char)?.82:/[ilI.,'’ ]/u.test(char)?.29:/[A-Z]/u.test(char)?.62:.53)*size,0)

/** Fit words by wrapping and font size; never stretch the letterforms to fit a board. */
export function layoutBuildingSign(text:string,measure:Measure=estimate):SignTextLayout{
 const words=text.trim().replace(/\s+/gu,' ').split(' '),wrap=(fontSize:number)=>{
  const lines:string[]=[];let line=''
  for(const word of words){const next=line?`${line} ${word}`:word;if(line&&measure(next,fontSize)>textWidth){lines.push(line);line=word}else line=next}
  if(line)lines.push(line);return lines
 }
 let fontSize=25,lines=wrap(fontSize)
 while(fontSize>9&&(lines.length>2||lines.some(line=>measure(line,fontSize)>textWidth))){fontSize--;lines=wrap(fontSize)}
 return{lines,fontSize,pixelWidth:cellWidth,pixelHeight:lines.length>1?80:64}
}

interface SignPage {canvas:HTMLCanvasElement;context:CanvasRenderingContext2D;texture:THREE.CanvasTexture;material:THREE.MeshStandardMaterial;used:number}
const atlases=new WeakMap<GlobeArtist,SignPage[]>()
function newPage(a:GlobeArtist):SignPage{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=atlasSize
 const context=canvas.getContext('2d')!,texture=new THREE.CanvasTexture(canvas)
 texture.name='building-sign-atlas';texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4
 const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.12,roughness:.92})
 material.name='building-sign-lettering';material.addEventListener('dispose',()=>texture.dispose());a.kit.extras.push(material)
 return{canvas,context,texture,material,used:0}
}

/** A framed plaque and a shared text atlas: one texture page for up to forty signs. */
export function buildBuildingSign(a:GlobeArtist,text:string,{position,width,theme='cream'}:BuildingSignOptions,parent:THREE.Object3D){
 let pages=atlases.get(a);if(!pages){pages=[];atlases.set(a,pages)}
 let page=pages.at(-1);if(!page||page.used===columns*rows){page=newPage(a);pages.push(page)}
 const context=page.context,measure:Measure=(value,fontSize)=>{context.font=`600 ${fontSize}px Inter, system-ui, sans-serif`;return typeof context.measureText==='function'?context.measureText(value).width:estimate(value,fontSize)}
 const layout=layoutBuildingSign(text,measure),slot=page.used++,x=slot%columns*cellWidth,y=Math.floor(slot/columns)*cellHeight,paper=theme==='navy'?'#263b4e':'#fff5dd',ink=theme==='navy'?'#fff5dd':'#263b4e'
 context.fillStyle=paper;context.fillRect(x,y,cellWidth,cellHeight);context.fillStyle=ink;context.textAlign='center';context.textBaseline='middle';context.font=`600 ${layout.fontSize}px Inter, system-ui, sans-serif`
 const lineHeight=layout.fontSize*1.12,first=y+layout.pixelHeight/2-(layout.lines.length-1)*lineHeight/2
 layout.lines.forEach((line,index)=>context.fillText(line,x+cellWidth/2,first+index*lineHeight));page.texture.needsUpdate=true
 const group=new THREE.Group(),height=width*layout.pixelHeight/layout.pixelWidth;group.name='building-sign';group.position.set(...position);group.userData.signText=text;group.userData.signLayout=layout;parent.add(group)
 a.block(theme==='navy'?'gold':'wood',[0,0,-.055],[width+.14,height+.14,.14],group)
 const geometry=new THREE.PlaneGeometry(width,height),uv=geometry.attributes.uv!,u0=(x+1)/atlasSize,u1=(x+cellWidth-1)/atlasSize,v0=1-(y+layout.pixelHeight-1)/atlasSize,v1=1-(y+1)/atlasSize
 for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0))
 geometry.name='building-sign-face';a.kit.geometries.push(geometry)
 const face=new THREE.Mesh(geometry,page.material);face.name='building-sign-lettering';face.position.z=.021;group.add(face)
 for(const side of [-1,1])a.mesh(a.kit.leaf,'gold',[side*(width/2+.035),0,.026],[.024,.024,.014],group)
 return group
}
