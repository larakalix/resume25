<script setup lang="ts">
import type { Page } from '~/types/page'
import { filterProjects, projectFilters, resolveProjectFilter } from '~/utils/project-filters'
const { page } = defineProps<Page>()
const { data: projects, status, error, refresh } = await useProjects()
const route = useRoute()
const router = useRouter()
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })
const selected = computed(() => hydrated.value ? resolveProjectFilter(route.query.tech) : 'all')
const filtered = computed(() => filterProjects(projects.value ?? [], selected.value))
function selectTechnology(value: string) { const query = { ...route.query }; if (value === 'all') delete query.tech; else query.tech = value; void router.push({ path: route.path, query }) }
</script>
<template>
    <MlPageContainer :page="{ ...page, subtitle: undefined, description: 'Products, reusable interfaces, and tools built to make complex workflows feel simple.' }">
        <template #overview><div class="collection-toolbar"><div class="filter-bar" role="group" aria-label="Filter projects by technology"><UButton v-for="filter in projectFilters" :key="filter.value" :variant="selected === filter.value ? 'solid' : 'ghost'" color="primary" class="filter-button" :aria-pressed="selected === filter.value" @click="selectTechnology(filter.value)">{{ filter.label }}</UButton></div><p role="status" aria-live="polite" aria-atomic="true">{{ filtered.length }} {{ filtered.length === 1 ? 'project' : 'projects' }}</p></div></template>
        <MlProjects :projects="filtered" :is-loading="status === 'pending'" :is-error="!!error" :error="error" title="All projects" :show-view-all="false" variant="large" /><UButton v-if="error" variant="outline" @click="refresh()">Try again</UButton>
    </MlPageContainer>
</template>
