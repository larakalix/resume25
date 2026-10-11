<script setup lang="ts">
const root = useTemplateRef<HTMLElement>('root')
const pending = ref(false)
let observer: IntersectionObserver | undefined
let preference: MediaQueryList | undefined
function show() {
    pending.value = false
    observer?.disconnect()
}
onMounted(() => {
    preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    preference.addEventListener('change', show)
    if (preference.matches || !('IntersectionObserver' in window) || !root.value || root.value.getBoundingClientRect().top < window.innerHeight) return
    pending.value = true
    observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) show()
    }, { rootMargin: '0px 0px 40px 0px', threshold: 0.05 })
    observer.observe(root.value)
})
onUnmounted(() => {
    observer?.disconnect()
    preference?.removeEventListener('change', show)
})
</script>
<template><div ref="root" class="reveal-section" :class="{ 'reveal-pending': pending }"><slot /></div></template>
