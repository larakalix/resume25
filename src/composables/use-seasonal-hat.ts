import { hatChoice, hatNames, seasonalHat } from '~/experience/explorer/seasonal-hats'
import type { HatId, HatChoice } from '~/experience/explorer/seasonal-hats'

/** Client-owned calendar: generated pages never freeze a build-day holiday. */
export function useSeasonalHat() {
    const route = useRoute()
    const choice = ref<HatChoice>('auto'), automatic = ref<HatId>('everyday')
    const selected = computed(() => choice.value === 'auto' ? automatic.value : choice.value)
    const description = computed(() => choice.value === 'auto' ? `Seasonal hats are automatic. Today: ${hatNames[automatic.value]}.` : `Previewing ${hatNames[selected.value]}. Choose Automatic to follow the calendar.`)
    let timer: ReturnType<typeof setInterval> | undefined
    function refresh() { if (!document.hidden) automatic.value = seasonalHat(new Date()) }
    watch(() => route.query.hat, value => { choice.value = hatChoice(value) })
    onMounted(() => {
        choice.value = hatChoice(route.query.hat); refresh(); timer = setInterval(refresh, 60_000)
        window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    })
    onBeforeUnmount(() => {
        clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh)
    })
    return { choice, selected, description }
}
