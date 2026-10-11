<script setup lang="ts">
import { computed } from 'vue'
import { getCollectionState } from '~/utils/collection-state'

const { isLoading = false, isError = false, error = null, count, label } = defineProps<{
    isLoading?: boolean
    isError?: boolean
    error?: Error | null
    count: number
    label: string
}>()
const state = computed(() => getCollectionState(isLoading, isError, count))
</script>

<template>
    <div v-if="state === 'loading'" role="status" class="collection-message col-span-full">Loading {{ label }}…</div>
    <div v-else-if="state === 'error'" role="alert" class="collection-message col-span-full">Failed to load {{ label }}. {{ error?.message }}</div>
    <div v-else-if="state === 'empty'" role="status" class="collection-message col-span-full">No {{ label }} found.</div>
    <slot v-else />
</template>
