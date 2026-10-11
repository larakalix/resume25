export type PhotoPose='idle'|'wave'|'crouch'
export type PhotoLight='current'|'day'|'night'
export interface PhotoOptions {pose:PhotoPose;light:PhotoLight;branding:boolean}
export interface PhotoExport {blob:Blob;width:number;height:number}
export const defaultPhotoOptions=():PhotoOptions=>({pose:'idle',light:'current',branding:true})

/** Downscale only. The original framebuffer's aspect and colours are retained. */
export function photoSize(width:number,height:number,small:boolean){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('The photo surface is not ready.')
 const edge=small?1280:1920,pixels=small?921600:2073600,scale=Math.min(1,edge/Math.max(width,height),Math.sqrt(pixels/(width*height)))
 return{width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))}
}

/** Invoke synchronously just after renderer.render(), while the default framebuffer is intact. */
function frameBlob(canvas:HTMLCanvasElement):Promise<Blob>{
 return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The photo could not be captured.')),'image/png')}catch{reject(new Error('The photo could not be captured.'))}})
}

export async function capturePostcard(canvas:HTMLCanvasElement,options:PhotoOptions,caption:string,small:boolean,signal:AbortSignal):Promise<PhotoExport>{
 signal.throwIfAborted()
 const size=photoSize(canvas.width,canvas.height,small),source=frameBlob(canvas)
 const blob=await source;signal.throwIfAborted()
 const image=await createImageBitmap(blob);let output:HTMLCanvasElement|undefined
 try{
  signal.throwIfAborted();output=document.createElement('canvas');output.width=size.width;output.height=size.height
  const context=output.getContext('2d');if(!context)throw new Error('Image export is unavailable in this browser.')
  context.drawImage(image,0,0,size.width,size.height)
  if(options.branding){
   const band=Math.min(size.height,Math.max(40,Math.round(size.width*.045))),padding=Math.max(12,Math.round(size.width*.018)),font=Math.max(11,Math.round(band*.29))
   context.fillStyle='#fffdf3';context.fillRect(0,size.height-band,size.width,band);context.fillStyle='#263f38';context.textBaseline='middle';context.font=`600 ${font}px system-ui, sans-serif`
   context.fillText('Ivan Lara · Small world. Big ideas.',padding,size.height-band/2,size.width-padding*2)
   if(size.width>680){context.textAlign='right';context.font=`${font}px system-ui, sans-serif`;context.fillText(caption.slice(0,60),size.width-padding,size.height-band/2,size.width*.37)}
  }
  const result=await frameBlob(output);signal.throwIfAborted();return{blob:result,...size}
 }finally{image.close();if(output)output.width=output.height=0}
}
