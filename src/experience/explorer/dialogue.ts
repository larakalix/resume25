import type { Profile, Resume } from '../../domain/content/models'
import type { ResidentId, WorldObjectId, WorldObjectState } from './types.ts'

/** Authored game dialogue, never a real endorsement or a CMS testimonial. */
export function residentDialogue(id: ResidentId, profile: Profile, skills: Resume['skillGroups']) {
    const alias = `${profile.name.split(' ')[0]} the dev`
    const frontend = skills.find(group => group.id === 'frontend')?.items.slice(0, 4).join(', ') || profile.headline
    const architecture = skills.find(group => group.id === 'architecture')?.items.slice(0, 3).join(', ') || 'maintainable architecture'
    const lines = {
        mira: [`${alias} turns complex ideas into usable products. That's the spirit of this whole village.`, `His profile says “${profile.headline}.” You can meet the person behind the work at the house across the square.`, `Take your time here. Cross the river, try the fountain, and come back when the lanterns are glowing.`],
        theo: [`${alias} has a lovely habit: making complicated things feel usable. A good interface should make life easier.`, `His frontend toolkit includes ${frontend}. The workshop has the full list.`, `${architecture}: those are in his architecture toolkit. Good foundations make room for good ideas.`],
        sol: [`${alias} cares about user experience, performance, and maintainable architecture. Those are good things to build around.`, `Want the real details? His projects and resume are just a short visit away. I only tell village stories.`, `Try the harbor bell. And if you stay after sunset, light the bridge lanterns on your way back.`],
    }
    return lines[id]
}
export function activateObject(state: WorldObjectState, id: WorldObjectId): WorldObjectState {
    return id === 'bell' ? { ...state, bell: state.bell + 1 } : { ...state, [id]: !state[id] }
}
