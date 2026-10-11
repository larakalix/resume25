import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {archipelagoWorld as world} from '../src/experience/archipelago/compile.ts';

// Pure local data export. The compiled terrain and navigation geometry are the authority.
const output=resolve(process.argv[2]??'.impeccable/review/archipelago'),width=1700,height=1080;
const map={x:58,y:185,width:1584,height:568,minX:-Math.PI*world.RADIUS,maxX:Math.PI*world.RADIUS,minZ:-45,maxZ:45};
const px=p=>[map.x+(p.x-map.minX)/(map.maxX-map.minX)*map.width,map.y+(p.z-map.minZ)/(map.maxZ-map.minZ)*map.height];
const f=value=>Number(value.toFixed(2)),escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const path=points=>points.map((point,index)=>`${index?'L':'M'}${px(point).map(f).join(',')}`).join('');
const fingerprint=createHash('sha256').update(JSON.stringify(world.definition)).digest('hex');
const grid={nx:720,nz:260},heights=new Float64Array((grid.nx+1)*(grid.nz+1));
const sample=(x,z)=>({x:map.minX+(map.maxX-map.minX)*x/grid.nx,z:map.minZ+(map.maxZ-map.minZ)*z/grid.nz});
for(let z=0;z<=grid.nz;z++)for(let x=0;x<=grid.nx;x++){const point=sample(x,z);heights[z*(grid.nx+1)+x]=world.terrainHeight(world.normalAt(point.x,point.z));}
const at=(x,z)=>heights[z*(grid.nx+1)+x];
function contours(level){
 const segments=[],adjacency=new Map(),key=p=>`${Math.round(p.x*100000)},${Math.round(p.z*100000)}`;
 function add(a,b){const index=segments.length,ka=key(a),kb=key(b);segments.push({a,b,ka,kb,used:false});for(const k of [ka,kb]){const list=adjacency.get(k)??[];list.push(index);adjacency.set(k,list);}}
 for(let z=0;z<grid.nz;z++)for(let x=0;x<grid.nx;x++){
  const values=[at(x,z),at(x+1,z),at(x+1,z+1),at(x,z+1)],corners=[sample(x,z),sample(x+1,z),sample(x+1,z+1),sample(x,z+1)],mask=values.reduce((sum,value,index)=>sum+(value>=level?1<<index:0),0);
  if(mask===0||mask===15)continue;
  const crossings=[];
  for(let edge=0;edge<4;edge++){const next=(edge+1)%4;if((values[edge]>=level)===(values[next]>=level))continue;const t=(level-values[edge])/(values[next]-values[edge]),a=corners[edge],b=corners[next];crossings.push({edge,point:{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}});}
  if(crossings.length===2)add(crossings[0].point,crossings[1].point);
  else if(crossings.length===4){const connected=(mask===5)===(values.reduce((sum,value)=>sum+value,0)/4>=level),pairs=connected?[[0,1],[2,3]]:[[0,3],[1,2]];for(const[a,b]of pairs)add(crossings[a].point,crossings[b].point);}
 }
 const lines=[];
 function walk(index,startKey){const line=[];let current=index,k=startKey;while(current!==undefined){const segment=segments[current];if(segment.used)break;segment.used=true;const reverse=segment.kb===k;line.push(reverse?segment.b:segment.a);k=reverse?segment.ka:segment.kb;const next=adjacency.get(k)?.find(candidate=>!segments[candidate].used);if(next===undefined){line.push(reverse?segment.a:segment.b);break;}current=next;}if(line.length>2)lines.push(line);}
 for(const[k,links]of adjacency)if(links.length===1&&!segments[links[0]].used)walk(links[0],k);
 for(let i=0;i<segments.length;i++)if(!segments[i].used)walk(i,segments[i].ka);
 return lines;
}
function splitSeam(points){
 const lines=[];let line=[];
 for(const point of points){const prior=line.at(-1);if(prior&&Math.abs(point.x-prior.x)>Math.PI*world.RADIUS){const sign=prior.x>0?1:-1,edge=sign*Math.PI*world.RADIUS,other=point.x+sign*Math.PI*world.RADIUS*2,t=(edge-prior.x)/(other-prior.x),z=prior.z+(point.z-prior.z)*t;line.push({x:edge,z});lines.push(line);line=[{x:-edge,z}];}line.push(point);}
 if(line.length>1)lines.push(line);return lines;
}
const terrainLevels=[[-1.45,'#bfdcd6'],[-.68,'#afd4c7'],[world.WATER,'#e6d6ac'],[.16,'#b8d09d'],[.65,'#98bc91'],[1.4,'#7ba581'],[2.8,'#5e8a70']];
const shapes=terrainLevels.map(([level,fill])=>({level,fill,lines:contours(level)}));
const svg=[];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;height:auto;display:block" role="img" aria-labelledby="title description">`);
svg.push(`<title id="title">Small world — the coastal archipelago master map</title><desc id="description">North-up projection of the actual compiled terrain, building footprints, roads, first bridge, Ivan's house and ferry route. The walking circuit continues across both longitude edges. This is a local design and navigation review artifact.</desc>`);
svg.push(`<defs><clipPath id="map-clip"><rect x="${map.x}" y="${map.y}" width="${map.width}" height="${map.height}" rx="20"/></clipPath><pattern id="sea-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".7" fill="#517f80" opacity=".16"/></pattern><marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0L7,3.5L0,7" fill="none" stroke="#214e4a" stroke-width="1.2"/></marker></defs>`);
svg.push(`<style>text{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;fill:#24483f}.eyebrow{font-size:12px;font-weight:700;letter-spacing:2px}.label{font-size:17px;font-weight:650;paint-order:stroke;stroke:#f6f5eb;stroke-width:5px;stroke-linejoin:round}.small{font-size:12px}.muted{fill:#627970}.rule{stroke:#d7dfd0;stroke-width:1}.metric{font-size:24px;font-weight:650}.caption{font-size:14px;fill:#59746a}</style>`);
svg.push(`<rect width="${width}" height="${height}" fill="#f5f5ec"/><text class="eyebrow" x="58" y="48">IVAN LARA · WORLD ATLAS / 01</text><text x="56" y="103" font-size="48" font-weight="650" letter-spacing="-2">Small world. Five places to get lost.</text><text class="caption" x="59" y="139">A continuous coastal loop, drawn from the same terrain and routes that the character walks.</text><text class="small muted" x="1642" y="49" text-anchor="end">MASTER MAP · LOCAL REVIEW</text><text class="small muted" x="1642" y="71" text-anchor="end">Definition ${escape(world.version)} · ${fingerprint.slice(0,12)}</text>`);
svg.push(`<g clip-path="url(#map-clip)"><rect x="${map.x}" y="${map.y}" width="${map.width}" height="${map.height}" fill="#d0e8e4"/><rect x="${map.x}" y="${map.y}" width="${map.width}" height="${map.height}" fill="url(#sea-dots)"/>`);
for(const degree of [-180,-135,-90,-45,0,45,90,135,180]){const[x]=px({x:degree*Math.PI/180*world.RADIUS,z:0});svg.push(`<path d="M${f(x)},${map.y}V${map.y+map.height}" stroke="#9dbfba" stroke-width=".8" opacity=".5"/>`);}
for(const degree of [-45,0,45]){const[,y]=px({x:0,z:degree*Math.PI/180*world.RADIUS});svg.push(`<path d="M${map.x},${f(y)}H${map.x+map.width}" stroke="#9dbfba" stroke-width=".8" opacity=".5"/>`);}
for(const shape of shapes)svg.push(`<path d="${shape.lines.map(line=>path(line)+'Z').join('')}" fill="${shape.fill}" fill-rule="evenodd"/>`);
const shore=shapes.find(shape=>shape.level===world.WATER);svg.push(`<path d="${shore.lines.map(path).join('')}" fill="none" stroke="#c1ad83" stroke-width="1.2" opacity=".75"/>`);
// Roads use real widths at the projection's equatorial metre scale.
const scale=map.width/(map.maxX-map.minX);
for(const road of world.roads){const color=road.surface==='wood'?'#b38c5e':road.surface==='sand'?'#ddc597':'#efeedc';for(const line of splitSeam(road.points)){svg.push(`<path d="${path(line)}" fill="none" stroke="#556f5e" stroke-opacity=".22" stroke-width="${f(road.width*scale+2)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path(line)}" fill="none" stroke="${color}" stroke-width="${f(road.width*scale)}" stroke-linecap="round" stroke-linejoin="round"/>`);}}
for(const road of world.roads.filter(road=>road.main))for(const line of splitSeam(road.points))svg.push(`<path d="${path(line)}" fill="none" stroke="#2c6653" stroke-width="2" stroke-dasharray="3 8" stroke-linecap="round" opacity=".72"/>`);
const ferry=world.ferryRoute??[];for(const line of splitSeam(ferry))svg.push(`<path d="${path(line)}" fill="none" stroke="#357f98" stroke-width="2.7" stroke-dasharray="9 7" stroke-linecap="round"/>`);
for(const tree of world.treeSites){const[x,y]=px(tree);svg.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.5+tree.size*1.7)}" fill="#608f70" opacity=".65"/>`);}
for(const building of world.buildings){const outline=world.buildingOutline(building),color=building.style==='japanese'?'#a87568':building.area==='harbor'?'#ce9874':'#e6c38c';svg.push(`<path d="${path(outline)}Z" fill="${color}" stroke="#6a7260" stroke-width=".8"/>`);if(building.door){const[x,y]=px(building.door);svg.push(`<circle cx="${f(x)}" cy="${f(y)}" r="2.4" fill="#327890" stroke="#f6f3df" stroke-width="1"/>`);}}
for(const bridge of world.bridges){const middle=bridge.points[Math.floor(bridge.points.length/2)],lines=splitSeam(bridge.points);for(const line of lines)svg.push(`<path d="${path(line)}" fill="none" stroke="${bridge.surface==='wood'?'#826442':'#8b947c'}" stroke-width="1.5" stroke-dasharray="1 4"/>`);if(bridge.id==='meadow-bridge'){const[x,y]=px(middle);svg.push(`<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="#204f45" stroke="#fff9de" stroke-width="3"/>`);}}
const seams=[];for(const road of world.roads)for(let i=1;i<road.points.length;i++)if(Math.abs(road.points[i].x-road.points[i-1].x)>Math.PI*world.RADIUS){const lines=splitSeam([road.points[i-1],road.points[i]]),z=lines[0].at(-1).z;seams.push({road:road.id,z});const[,y]=px({x:0,z});for(const side of [-1,1]){const x=side<0?map.x+7:map.x+map.width-7;svg.push(`<path d="M${x-side*7},${f(y-7)}L${x+side*2},${f(y)}L${x-side*7},${f(y+7)}" fill="none" stroke="#235447" stroke-width="3"/>`);}}
svg.push('</g>');
// District names are annotation, their centres and building footprints remain geographically exact.
const circuit=['harbor','komorebi-market','maker-heights','tideglass-coast','orchard-village'];
for(const[idIndex,id]of circuit.entries()){
 const district=world.districts.find(item=>item.id===id),center=district.arrival??district.anchor,[x,y]=px(center),north=id==='komorebi-market'||id==='tideglass-coast',labelPoint={x:center.x,z:district.anchor.z+(north?-1:1)*(district.radiusZ+7)},[rawX,ly]=px(labelPoint),lx=Math.max(map.x+100,Math.min(map.x+map.width-110,rawX));
 svg.push(`<path d="M${f(x)},${f(y+(north?-14:14))}L${f(lx)},${f(ly+(north?9:-16))}" fill="none" stroke="#567865" stroke-width="1" stroke-dasharray="2 4"/><circle cx="${f(x)}" cy="${f(y)}" r="12" fill="#2e6051" stroke="#fff9e4" stroke-width="3"/><text x="${f(x)}" y="${f(y+4)}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff9e4" style="fill:#fff9e4">${idIndex+1}</text><text class="label" x="${f(lx)}" y="${f(ly)}" text-anchor="middle">${escape(district.name)}</text>`);
}
function pin(point,title,detail,dx,dy,color='#244e45'){
 const[x,y]=px(point),tx=x+dx,ty=y+dy,anchor=dx<0?'end':'start';svg.push(`<path d="M${f(x)},${f(y)}L${f(tx)},${f(ty+6)}" fill="none" stroke="${color}" stroke-width="1.3"/><circle cx="${f(x)}" cy="${f(y)}" r="4.5" fill="${color}" stroke="#fff9e5" stroke-width="2"/><text class="label" x="${f(tx)}" y="${f(ty)}" text-anchor="${anchor}" style="font-size:14px">${escape(title)}</text><text class="small" x="${f(tx)}" y="${f(ty+18)}" text-anchor="${anchor}" style="paint-order:stroke;stroke:#f5f5ec;stroke-width:4px">${escape(detail)}</text>`);
}
pin(world.spawn,'Start on Meadow Bridge','The first view into the islands',-40,-83);
const home=world.buildings.find(building=>building.id==='ivan-home');pin(home,'Ivan’s house','A real door into his story',-6,-83);
const ferryMid=ferry[Math.floor(ferry.length*.55)];if(ferryMid)pin(ferryMid,'The orchard ferry','Harbor ↔ Orchard · optional sea crossing',0,22,'#2c7087');
svg.push(`<g transform="translate(110 240)"><path d="M0,37V0M-7,11L0,0L7,11" fill="none" stroke="#244e45" stroke-width="2"/><text x="0" y="-10" text-anchor="middle" font-size="12" font-weight="700">N</text></g>`);
svg.push(`<text class="small muted" x="58" y="779">180° W · map continues at the opposite edge</text><text class="small muted" x="1642" y="779" text-anchor="end">180° E · the same continuous world</text>`);
svg.push(`<path class="rule" d="M58,811H1642"/><text class="eyebrow" x="58" y="846">HOW TO READ THE WORLD</text>`);
const legend=[['#b8d09d','Island terrain'],['#e6d6ac','Shore / sand'],['#efeedc','Stone streets & bridges'],['#b38c5e','Wood bridges & docks'],['#ce9874','Actual building footprints']];
legend.forEach(([color,label],i)=>{const x=58+(i%3)*286,y=881+Math.floor(i/3)*32;svg.push(`<rect x="${x}" y="${y-12}" width="18" height="13" rx="3" fill="${color}" stroke="#a8b6a1" stroke-width=".6"/><text class="small" x="${x+29}" y="${y}">${escape(label)}</text>`);});
svg.push(`<path d="M630,900H661" stroke="#357f98" stroke-width="2.7" stroke-dasharray="8 5"/><text class="small" x="672" y="904">Optional ferry route</text><path d="M920,875H951" stroke="#2c6653" stroke-width="2" stroke-dasharray="3 7"/><text class="small" x="963" y="879">Continuous walking circuit</text><circle cx="929" cy="906" r="4" fill="#327890"/><text class="small" x="963" y="910">Accessible building entrance</text>`);
const metrics=[['05','distinct districts'],[String(world.bridges.length).padStart(2,'0'),'connecting bridges'],[String(world.buildings.filter(building=>building.enter).length).padStart(2,'0'),'accessible buildings']];metrics.forEach(([value,label],i)=>{const x=1220+i*144;svg.push(`<text class="metric" x="${x}" y="879">${value}</text><text class="small muted" x="${x}" y="904">${escape(label)}</text>`);});
svg.push(`<path class="rule" d="M58,947H1642"/><text class="caption" x="58" y="980">Source: archipelagoWorld · deterministic coastline contours at the real water level · north is −Z</text><text class="small muted" x="58" y="1004">Equirectangular longitude projection; all authored coasts are included within the inhabited latitude band. Paths and footprints are data, not decorative approximations.</text><text class="small muted" x="58" y="1044">REGENERATE  node scripts/export-archipelago-map.mjs</text><text class="small muted" x="1642" y="1044" text-anchor="end">${escape(world.id)}</text></svg>`);
const metadata={worldId:world.id,version:world.version,definitionSha256:fingerprint,projection:{type:'north-up equirectangular',north:'-Z',longitude:'full ±180 degrees',extent:{minX:map.minX,maxX:map.maxX,minZ:map.minZ,maxZ:map.maxZ},grid,waterLevel:world.WATER},districts:world.districts.map(district=>({id:district.id,name:district.name,anchor:district.anchor})),stats:{islands:world.islands.length,districts:world.districts.length,buildings:world.buildings.length,accessibleBuildings:world.buildings.filter(building=>building.enter).length,roads:world.roads.length,bridges:world.bridges.length,docks:world.docks.length,residents:world.residents.length,treeSites:world.treeSites.length,ferryLength:world.ferryLength},spawn:world.spawn,firstBridge:world.roads.find(road=>road.id==='meadow-bridge'),ivanHome:home,ferryRoute:ferry,seamCrossings:seams,contourLoops:shapes.map(shape=>({level:shape.level,count:shape.lines.length})),description:'Reproducible local review map generated from compiled geometry and terrain. Not evidence of browser or real-device validation.'};
await mkdir(output,{recursive:true});await writeFile(resolve(output,'master-map.svg'),svg.join('\n')+'\n');await writeFile(resolve(output,'master-map.json'),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({svg:resolve(output,'master-map.svg'),metadata:resolve(output,'master-map.json'),bytes:Buffer.byteLength(svg.join('\n')),definitionSha256:fingerprint,stats:metadata.stats,seamCrossings:seams}));
