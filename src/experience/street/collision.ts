import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import type { Point2 } from '../explorer/types.ts'
import { groundY } from './level.ts'

/** One local BVH serves capsule contact and camera obstruction, without prototype patches. */
export function createStreetCollision(geometry:THREE.BufferGeometry){
    const tree=new MeshBVH(geometry,{targetLeafSize:8}),bounds=new THREE.Box3(),segment=new THREE.Line3(),trianglePoint=new THREE.Vector3(),capsulePoint=new THREE.Vector3(),direction=new THREE.Vector3(),ray=new THREE.Ray(),radius=.24
    function constrain(point:Point2,previous:Point2){
        for(let pass=0;pass<3;pass++){
            const y=groundY(point.z);segment.start.set(point.x,y+radius,point.z);segment.end.set(point.x,y+1.5,point.z);bounds.makeEmpty().expandByPoint(segment.start).expandByPoint(segment.end).expandByScalar(radius)
            tree.shapecast({intersectsBounds:box=>box.intersectsBox(bounds),intersectsTriangle:triangle=>{
                const distance=triangle.closestPointToSegment(segment,trianglePoint,capsulePoint)
                if(distance<radius){direction.copy(capsulePoint).sub(trianglePoint);direction.y=0;if(direction.x*(previous.x-trianglePoint.x)+direction.z*(previous.z-trianglePoint.z)<0)direction.negate();if(direction.lengthSq()<.000001)direction.set(point.x-previous.x,0,point.z-previous.z).negate();if(direction.lengthSq()<.000001)direction.set(1,0,0);direction.normalize().multiplyScalar(radius-distance+.002);point.x+=direction.x;point.z+=direction.z}
            }})
        }
    }
    function cameraDistance(from:THREE.Vector3,to:THREE.Vector3){direction.copy(to).sub(from);const length=direction.length();ray.set(from,direction.normalize());const hit=tree.raycastFirst(ray,THREE.DoubleSide,0,length);return hit?Math.max(.7,hit.distance-.25):length}
    return{constrain,cameraDistance,triangleCount:geometry.index?geometry.index.count/3:geometry.attributes.position!.count/3}
}
