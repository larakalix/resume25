/** One slow, low-amplitude breeze for all foliage; Calm returns it to its resting pose. */
export function createBreeze(){
 const time={value:0},strength={value:1};let weatherStrength=1
 return{time,strength,setStrength(value:number){if(Number.isFinite(value))weatherStrength=Math.max(0,Math.min(2,value))},update(seconds:number,reduced:boolean){time.value=reduced?0:seconds;strength.value=reduced?0:weatherStrength}}
}

/** World-space phases make nearby plants lean together, regardless of their instance yaw. */
export const breezeShader=`
uniform float windTime;
uniform float windStrength;
vec3 foliageWind(mat4 frame){
 vec3 origin=frame[3].xyz,up=normalize(frame[1].xyz);
 vec3 direction=normalize(vec3(.82,.12,.54));
 direction-=up*dot(direction,up);
 float gust=.56+.28*sin(dot(origin,vec3(.105,.025,.069))-windTime*.72)
                 +.16*sin(dot(origin,vec3(.21,.035,-.12))-windTime*1.13);
 vec3 offset=direction*(.035+.075*gust)*windStrength;
 // Inverse of each orthogonal instance axis keeps the bend tangent and measured in world units.
 return vec3(dot(offset,frame[0].xyz)/max(dot(frame[0].xyz,frame[0].xyz),.000001),
             dot(offset,frame[1].xyz)/max(dot(frame[1].xyz,frame[1].xyz),.000001),
             dot(offset,frame[2].xyz)/max(dot(frame[2].xyz,frame[2].xyz),.000001));
}
`

// Keep this exact displacement in both the visible crown and its shadow depth pass.
export const canopyBendShader=`
vec3 canopyBreeze=foliageWind(instanceMatrix);
float canopyHeight=clamp((position.y+.55)/1.55,0.0,1.0);
transformed+=canopyBreeze*(.65*canopyHeight*canopyHeight*(3.0-2.0*canopyHeight));
`

/** Analytic inverse-transpose of the height-weighted bend, before Three transforms normals. */
export const canopyNormalShader=`
vec3 canopyNormalBreeze=foliageWind(instanceMatrix);
float canopyNormalHeight=clamp((position.y+.55)/1.55,0.0,1.0);
float canopySlope=3.9*canopyNormalHeight*(1.0-canopyNormalHeight)/1.55;
objectNormal.y-=dot(canopyNormalBreeze,objectNormal)*canopySlope/(1.0+canopyNormalBreeze.y*canopySlope);
`
