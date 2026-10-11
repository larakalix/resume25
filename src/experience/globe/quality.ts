export type QualityLevel = 'low' | 'balanced' | 'detailed'
export type QualityChoice = 'auto' | QualityLevel
export interface FrameMetrics { renderMs: number; drawCalls: number; triangles: number; grass: number; dpr: number; width: number; height: number; zone: string }
export interface PerformanceReport extends FrameMetrics { version: 1; level: QualityLevel; frames: number; seconds: number; fps: number; p95FrameMs: number; meanRenderCpuMs: number }
export interface QualitySnapshot { choice: QualityChoice; level: QualityLevel; measurement: 'idle' | 'running' | 'ready' | 'interrupted'; report: PerformanceReport | null }
export const qualityChoices = [{ label: 'Automatic', value: 'auto' }, { label: 'Battery saver', value: 'low' }, { label: 'Balanced', value: 'balanced' }, { label: 'Detailed', value: 'detailed' }]
export function qualityProfile(level: QualityLevel, small: boolean) {
    return level === 'low' ? { dpr: .85, grass: small ? 9000 : 12000, shadow: 768, butterflies: 4, grassFar: 38 }
        : level === 'balanced' ? { dpr: small ? 1 : 1.1, grass: small ? 18000 : 26000, shadow: 1024, butterflies: 8, grassFar: 50 }
            : { dpr: small ? 1.25 : 1.5, grass: small ? 28000 : 42000, shadow: 1536, butterflies: 12, grassFar: 64 }
}
export function createQualityController() {
    let choice: QualityChoice = 'auto', level: QualityLevel = 'balanced', slow = 0, fast = 0, cooldown = 1500
    let measurement: QualitySnapshot['measurement'] = 'idle', report: PerformanceReport | null = null, started = 0, measuredLevel: QualityLevel = level
    let intervals: number[] = [], cpu: number[] = []
    const levels: QualityLevel[] = ['low', 'balanced', 'detailed']
    return {
        snapshot: (): QualitySnapshot => ({ choice, level, measurement, report }),
        choose(value: QualityChoice) { if(measurement==='running'){measurement='interrupted';intervals=[];cpu=[]} choice = value; if (value !== 'auto') level = value; slow = fast = 0; cooldown = 1500 },
        observe(ms: number, eligible: boolean) {
            if (!eligible || choice !== 'auto' || measurement === 'running' || !Number.isFinite(ms) || ms <= 0 || ms > 250) return
            cooldown = Math.max(0, cooldown - ms); if (cooldown) return
            slow = ms > 25 ? slow + ms : Math.max(0, slow - ms * 2)
            fast = ms < 18.5 ? fast + ms : 0
            const index = levels.indexOf(level), next = slow > 2200 ? Math.max(0, index - 1) : fast > 12000 ? Math.min(2, index + 1) : index
            if (next !== index) { level = levels[next]!; cooldown = 8000; slow = fast = 0 }
        },
        start(now: number) { started = now; intervals = []; cpu = []; report = null; measuredLevel = level; measurement = 'running' },
        interrupt() { if (measurement === 'running') { measurement = 'interrupted'; intervals = []; cpu = [] } cooldown = 1500; slow = fast = 0 },
        record(now: number, frameMs: number, metrics: FrameMetrics) {
            if (measurement !== 'running') return
            if (frameMs > 0 && Number.isFinite(frameMs)) { intervals.push(frameMs); cpu.push(metrics.renderMs) }
            if (now - started < 10000) return
            const sorted = [...intervals].sort((a, b) => a - b), total = intervals.reduce((a, b) => a + b, 0), frames = intervals.length
            report = { ...metrics, version: 1, level: measuredLevel, frames, seconds: Math.round((now - started) / 100) / 10, fps: total ? Math.round(frames * 10000 / total) / 10 : 0, p95FrameMs: Math.round((sorted[Math.max(0, Math.ceil(frames * .95) - 1)] ?? 0) * 10) / 10, meanRenderCpuMs: Math.round(cpu.reduce((a, b) => a + b, 0) / Math.max(1, frames) * 100) / 100 }
            measurement = 'ready'
        },
    }
}
