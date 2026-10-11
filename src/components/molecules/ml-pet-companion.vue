<script setup lang="ts">
import type { WorldPet, PetState, PetAction } from '~/experience/explorer/types'
const { pet, state, disabled } = defineProps<{ pet: WorldPet; state?: PetState; disabled: boolean }>()
const emit=defineEmits<{ action:[value:PetAction] }>()
</script>
<template>
    <div class="pet-companion">
        <h2>{{ pet.name }}</h2><p>{{ pet.description }}</p>
        <div class="pet-actions"><UButton :disabled @click="emit('action','pet')">Pet {{ pet.name }}</UButton><UButton :disabled variant="outline" @click="emit('action','play')">Play</UButton><UButton :disabled variant="outline" :aria-pressed="state?.following ?? false" @click="emit('action','follow')">{{ state?.following ? 'Stop following' : 'Walk with me' }}</UButton></div>
        <p role="status" aria-live="polite">{{ state?.following ? `${pet.name} will follow when you return to the world.` : state?.playing ? `${pet.name} is feeling playful!` : state?.affection ? `${pet.name} has enjoyed ${state.affection} ${state.affection === 1 ? 'pat' : 'pats'}.` : 'Say hello, or bring a friend along for the walk.' }}</p>
    </div>
</template>
<style scoped>
.pet-companion h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.75rem; line-height: 1.1; font-weight: 600; }
.pet-companion p { font-size: .9375rem; line-height: 1.65; color: var(--world-muted); margin-block: 1rem; }
.pet-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.pet-actions :deep(button) { min-height: 44px; border-radius: 999px; }
</style>
