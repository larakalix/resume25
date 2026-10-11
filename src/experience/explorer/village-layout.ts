import type { WorldObstacle } from './types.ts'
import { destinations, worldObjects, worldTargets, SPAWN, villageBenches } from './world-data.ts'
import { isWater, nearPath } from './terrain.ts'
import { surfaceDistance } from './planet.ts'

const frontHouses = [{ x: -6, z: -2, radius: 1.65 }, { x: -3.8, z: -10, radius: 1.65 }, { x: -10, z: 2, radius: 1.65 }, { x: -9, z: 8, radius: 1.65 }, { x: 2, z: 16, radius: 1.65 }]
export const streetPoles = [{ x: -8, z: -1.8, radius: .12 }, { x: 1, z: -1.8, radius: .12 }]
export const treePositions: WorldObstacle[] = Array.from({ length: 80 }, (_, i) => ({ x: (i * 25.73 % 158) - 79, z: Math.sin(i * 2.39) * 35, radius: .45 })).filter(tree => !isWater(tree, 1.8) && !nearPath(tree, 1.9) && !worldTargets.some(place => surfaceDistance(tree, place) < place.radius + 1.6) && surfaceDistance(tree, SPAWN) > 5 && !frontHouses.some(house => surfaceDistance(tree, house) < 3))
export const housePositions = [...frontHouses, ...Array.from({ length: 58 }, (_, i) => ({ x: (i * 23.9 % 156) - 78, z: Math.sin(i * 3.73) * 34, radius: 1.65 })).filter(house => !isWater(house, 2.6) && !nearPath(house, 2.6) && !worldTargets.some(place => surfaceDistance(house, place) < place.radius + 2.5) && surfaceDistance(house, SPAWN) > 6 && !treePositions.some(tree => surfaceDistance(tree, house) < 2.7) && !frontHouses.some(front => surfaceDistance(front, house) < 3.6))]
export const obstacles: WorldObstacle[] = [...treePositions, ...housePositions, ...streetPoles, ...villageBenches, ...destinations.map(place => ({ x: place.x, z: place.z, radius: 2 })), ...worldObjects.filter(item => item.id !== 'bridge-lights').map(item => ({ x: item.x, z: item.z, radius: item.id === 'fountain' ? 1.25 : item.id === 'windmill' ? 1.6 : .65 }))]
