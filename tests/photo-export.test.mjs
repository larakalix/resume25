import assert from 'node:assert/strict';
import {test} from 'node:test';
import {capturePostcard,defaultPhotoOptions} from '../src/experience/globe/photo.ts';

// These fakes check the synchronous capture boundary and browser API ownership.
// They do not render a world or prove exported PNG pixels/colour visually.
function harness(t,config={}){
 const original={document:Object.getOwnPropertyDescriptor(globalThis,'document'),createImageBitmap:Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap')};
 t.after(()=>{for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}});
 const events=[],outputs=[],sourceBlob=new Blob(['source-frame'],{type:'image/png'}),exportBlob=new Blob(['encoded-postcard'],{type:'image/png'}),sourceCallbacks=[],outputCallbacks=[];
 let closes=0,resolveImage;
 const image={width:config.width??3840,height:config.height??2160,close(){closes++;events.push({phase:'close-image'})}};
 const context={drawImage(...args){events.push({phase:'draw-image',args})},fillRect(...args){events.push({phase:'fill-rect',args,colour:this.fillStyle})},fillText(...args){events.push({phase:'fill-text',args,colour:this.fillStyle,font:this.font,align:this.textAlign})}};
 function encode(phase,mode,callback,type){
  events.push({phase,type});if(mode==='throw')throw new Error('Synthetic canvas encode failure');if(mode==='hold'){(phase==='source-encode'?sourceCallbacks:outputCallbacks).push(callback);return}callback(mode==='null'?null:phase==='source-encode'?sourceBlob:exportBlob);
 }
 const canvas={width:config.width??3840,height:config.height??2160,toBlob(callback,type){encode('source-encode',config.source??'success',callback,type)}};
 const document={createElement(tag){
  events.push({phase:'create-canvas',tag});if(config.allocationThrows)throw new Error('Synthetic canvas allocation failure');assert.equal(tag,'canvas');
  const output={width:300,height:150,getContext(kind){events.push({phase:'get-context',kind});assert.equal(kind,'2d');return config.contextMissing?null:context},toBlob(callback,type){encode('output-encode',config.output??'success',callback,type)}};outputs.push(output);return output;
 }};
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:document});
 Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,writable:true,value:blob=>{
  events.push({phase:'decode-image',blob});if(config.image==='hold')return new Promise(resolve=>{resolveImage=resolve});if(config.image==='reject')return Promise.reject(new Error('Synthetic decode failure'));return Promise.resolve(image);
 }});
 return{canvas,events,outputs,context,image,sourceBlob,exportBlob,sourceCallbacks,outputCallbacks,get closes(){return closes},resolveImage(){resolveImage(image)}};
}
const phase=(h,name)=>h.events.filter(event=>event.phase===name);

test('the original framebuffer is encoded synchronously before the first await and passed directly into decoding',async t=>{
 const h=harness(t,{source:'hold'}),controller=new AbortController(),pending=capturePostcard(h.canvas,{...defaultPhotoOptions(),branding:false},'Meadow',false,controller.signal);
 assert.deepEqual(h.events,[{phase:'source-encode',type:'image/png'}],'no async boundary, canvas allocation or bitmap decode may precede framebuffer encode');
 assert.equal(h.sourceCallbacks.length,1);h.sourceCallbacks[0](h.sourceBlob);const result=await pending;
 assert.equal(phase(h,'decode-image')[0].blob,h.sourceBlob);assert.equal(result.blob,h.exportBlob);assert.equal(result.blob.type,'image/png');assert.equal(phase(h,'source-encode').length,1);assert.equal(phase(h,'output-encode')[0].type,'image/png');
 assert.equal(phase(h,'draw-image')[0].args[0],h.image,'the decoded default framebuffer is drawn directly, without re-rendering into a linear render target');assert.equal(h.canvas.width,3840);assert.equal(h.canvas.height,2160);assert.equal(h.closes,1);assert.equal(h.outputs[0].width,0);assert.equal(h.outputs[0].height,0);
});

test('postcards downscale the decoded frame, add the bounded local branding band and release output resources',async t=>{
 const h=harness(t),caption='Komorebi Quarter — '.repeat(8),result=await capturePostcard(h.canvas,defaultPhotoOptions(),caption,false,new AbortController().signal);
 assert.deepEqual({width:result.width,height:result.height},{width:1920,height:1080});assert.deepEqual(phase(h,'draw-image')[0].args,[h.image,0,0,1920,1080]);
 const band=phase(h,'fill-rect');assert.equal(band.length,1);assert.deepEqual(band[0].args,[0,994,1920,86]);assert.equal(band[0].colour,'#fffdf3');
 const labels=phase(h,'fill-text');assert.equal(labels.length,2);assert.equal(labels[0].args[0],'Ivan Lara · Small world. Big ideas.');assert.equal(labels[1].args[0],caption.slice(0,60));assert.equal(labels[1].align,'right');assert.ok(labels.every(label=>label.colour==='#263f38'));assert.equal(h.closes,1);assert.equal(h.outputs[0].width*h.outputs[0].height,0);
});

test('unbranded small captures never upscale and omit all text and band drawing',async t=>{
 const h=harness(t,{width:375,height:812}),result=await capturePostcard(h.canvas,{...defaultPhotoOptions(),branding:false},'Not drawn',true,new AbortController().signal);
 assert.deepEqual({width:result.width,height:result.height},{width:375,height:812});assert.deepEqual(phase(h,'draw-image')[0].args,[h.image,0,0,375,812]);assert.equal(phase(h,'fill-text').length,0);assert.equal(phase(h,'fill-rect').length,0);assert.equal(h.closes,1);
});

for(const source of ['null','throw'])test(`a ${source} source encode rejects before allocating a bitmap or output canvas`,async t=>{
 const h=harness(t,{source});await assert.rejects(capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,new AbortController().signal),/could not be captured/);
 assert.equal(phase(h,'decode-image').length,0);assert.equal(h.outputs.length,0);assert.equal(h.closes,0);assert.equal(h.canvas.width,3840);assert.equal(h.canvas.height,2160);
});

test('aborting while bitmap decode is pending closes the eventual image and yields no postcard',async t=>{
 const h=harness(t,{image:'hold'}),controller=new AbortController(),pending=capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,controller.signal);
 await Promise.resolve();assert.equal(phase(h,'decode-image').length,1);assert.equal(h.outputs.length,0);controller.abort();h.resolveImage();await assert.rejects(pending,{name:'AbortError'});
 assert.equal(h.closes,1);assert.equal(phase(h,'draw-image').length,0);assert.equal(phase(h,'output-encode').length,0);assert.ok(h.outputs.every(output=>output.width===0&&output.height===0));
});

for(const output of ['null','throw'])test(`a ${output} output encode releases the decoded bitmap and output allocation`,async t=>{
 const h=harness(t,{output});await assert.rejects(capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,new AbortController().signal),/could not be captured/);
 assert.equal(phase(h,'draw-image').length,1);assert.equal(h.closes,1);assert.equal(h.outputs[0].width,0);assert.equal(h.outputs[0].height,0);
});

test('aborting during output encoding rejects its late callback and still disposes once',async t=>{
 const h=harness(t,{output:'hold'}),controller=new AbortController(),pending=capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,controller.signal);
 await Promise.resolve();await Promise.resolve();assert.equal(h.outputCallbacks.length,1);controller.abort();h.outputCallbacks[0](h.exportBlob);await assert.rejects(pending,{name:'AbortError'});assert.equal(h.closes,1);assert.equal(h.outputs[0].width,0);assert.equal(h.outputs[0].height,0);
});

test('a missing 2D output context reports failure and disposes the decoded image',async t=>{
 const h=harness(t,{contextMissing:true});await assert.rejects(capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,new AbortController().signal),/unavailable/);assert.equal(h.closes,1);assert.equal(phase(h,'output-encode').length,0);assert.equal(h.outputs[0].width,0);assert.equal(h.outputs[0].height,0);
});

test('an already aborted request never touches the source framebuffer or browser image APIs',async t=>{
 const h=harness(t),controller=new AbortController();controller.abort();await assert.rejects(capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,controller.signal),{name:'AbortError'});assert.equal(h.events.length,0);assert.equal(h.closes,0);
});

test('a failed image decode does not allocate an output canvas or pretend to close an absent bitmap',async t=>{
 const h=harness(t,{image:'reject'});await assert.rejects(capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,new AbortController().signal),/decode failure/);assert.equal(phase(h,'source-encode').length,1);assert.equal(h.outputs.length,0);assert.equal(h.closes,0);
});

test('a failed output canvas allocation still closes the already decoded bitmap',async t=>{
 const h=harness(t,{allocationThrows:true});await assert.rejects(capturePostcard(h.canvas,defaultPhotoOptions(),'Meadow',false,new AbortController().signal),/allocation failure/);assert.equal(h.closes,1);assert.equal(phase(h,'draw-image').length,0);
});
