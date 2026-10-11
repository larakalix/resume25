<script setup lang="ts">
const { targetId } = defineProps<{ targetId: string }>()
const progress = ref(0)
const visible = ref(false)
let frame = 0
let observer: ResizeObserver | undefined
function update() {
    frame = 0
    const article = document.getElementById(targetId)
    if (!article) return
    const rect = article.getBoundingClientRect()
    const distance = rect.height - window.innerHeight
    visible.value = distance > 0
    progress.value = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 0
}
function schedule() {
    if (!frame) frame = requestAnimationFrame(update)
}
onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    const article = document.getElementById(targetId)
    if (article && 'ResizeObserver' in window) {
        observer = new ResizeObserver(schedule)
        observer.observe(article)
    }
    update()
})
onUnmounted(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    observer?.disconnect()
    cancelAnimationFrame(frame)
})
</script>
<template><div v-if="visible" class="reading-progress" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" /></template>
