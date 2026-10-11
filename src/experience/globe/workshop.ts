export type WorkshopStage = 0 | 1 | 2 | 3
export interface WorkshopState { stage: WorkshopStage; checked: boolean[] }
export const workshopTasks = ['Find the essentials', 'Make a little progress', 'Leave room for a good idea'] as const
export const freshWorkshop = (): WorkshopState => ({ stage: 0, checked: [false, false, false] })
/** An optional local toy, independent of published portfolio content and elapsed animation time. */
export function advanceWorkshop(state: WorkshopState, action: string): string {
    if (action === 'replay') { Object.assign(state, freshWorkshop()); return 'A fresh page. Every useful thing starts somewhere.' }
    if (action === 'shape' && state.stage === 0) { state.stage = 1; return 'A clear flow: an idea, a small step, a useful result.' }
    if (action === 'connect' && state.stage === 1) { state.stage = 2; return 'Interface, logic and data. The pieces work together.' }
    if (action === 'preview' && state.stage === 2) { state.stage = 3; return 'Your little planner is ready. Give it a try.' }
    const match = /^task-([0-2])$/.exec(action)
    if (match && state.stage === 3) {
        const index = Number(match[1]); state.checked[index] = !state.checked[index]
        return state.checked.every(Boolean) ? 'From a messy idea to something useful. Nicely done.' : state.checked[index] ? 'One small step, done.' : 'There’s room to try that again.'
    }
    return 'Take the next step whenever you’re ready.'
}
