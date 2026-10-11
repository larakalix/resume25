/** Scoped panel shortcuts never claim input from editable or modified browser commands. */
export function panelShortcut(code: string, repeat: boolean, modified: boolean, editable: boolean, interactive: boolean): 'close' | 'walk' | 'read' | null {
    if (modified || editable) return null
    if (code === 'Escape' || code === 'KeyE') return repeat ? null : 'close'
    if (!interactive && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) return 'walk'
    if (!interactive && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(code)) return 'read'
    return null
}
