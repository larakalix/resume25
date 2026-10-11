<script setup lang="ts">
import { residentDialogue } from '~/experience/explorer/dialogue'
import type { WorldResident } from '~/experience/explorer/types'
import type { Profile, Resume } from '~/domain/content/models'
const { resident, profile, skillGroups } = defineProps<{ resident: WorldResident; profile: Profile; skillGroups: Resume['skillGroups'] }>()
const line = ref(0)
const dialogue = computed(() => residentDialogue(resident.id, profile, skillGroups))
watch(() => resident.id, () => { line.value = 0 })
function changeLine(delta: number) { line.value = Math.max(0, Math.min(dialogue.value.length - 1, line.value + delta)) }
</script>
<template>
    <div class="village-conversation">
        <h2>{{ resident.name }}</h2>
        <p class="village-person">{{ resident.occupation }} <span>Fictional villager</span></p>
        <p class="village-speech" aria-live="polite" aria-atomic="true">{{ dialogue[line] }}</p>
        <div class="village-dialogue-controls">
            <UButton color="neutral" variant="soft" :disabled="line === 0" @click="changeLine(-1)">Previous</UButton>
            <span>{{ line + 1 }} / {{ dialogue.length }}</span>
            <UButton :disabled="line === dialogue.length - 1" @click="changeLine(1)">Next <AtMotionArrow /></UButton>
        </div>
    </div>
</template>
<style scoped>
h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 2rem; font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
.village-person { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-top: .75rem; color: var(--world-muted); font-size: .875rem; }
.village-person span { padding: .25rem .6rem; background: var(--world-soft); color: var(--world-ink); border-radius: 999px; font-size: .75rem; }
.village-speech { font-size: 1.125rem; line-height: 1.7; margin-block: 1.5rem 2rem; color: var(--world-ink); min-height: 6rem; }
.village-dialogue-controls { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.village-dialogue-controls :deep(button) { min-height: 44px; border-radius: 999px; }
.village-dialogue-controls > span { font-size: .8125rem; color: var(--world-muted); font-variant-numeric: tabular-nums; }
</style>
