<script setup lang="ts">
import type { Page } from '~/types/page'
import { filterProjects, projectFilters, resolveProjectFilter } from '~/utils/project-filters'
const { page } = defineProps<Page>()
const { projects } = useProjects()
const route = useRoute()
const router = useRouter()
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })
// Static HTML starts with all projects; apply query filters after hydration.
const selected = computed(() => hydrated.value ? resolveProjectFilter(route.query.tech) : 'all')
const filtered = computed(() => filterProjects(projects.value, selected.value))
function selectTechnology(value: string) {
    const query = { ...route.query }
    if (value === 'all') delete query.tech
    else query.tech = value
    void router.push({ path: route.path, query })
}
</script>
<template>
    <MlPageContainer :page="{ ...page, subtitle: 'Selected work & experiments', description: 'Products, reusable interfaces, and tools built to make complex workflows feel simple.' }" full-width>
        <template #overview>
        <div class="space-y-4">
            <p class="eyebrow">Explore the collection</p>
            <h2 class="section-title">Find your next idea.</h2>
            <div class="filter-bar" role="group" aria-label="Filter projects by technology">
                <UButton v-for="filter in projectFilters" :key="filter.value" color="neutral" variant="outline" class="filter-button" :aria-pressed="selected === filter.value" @click="selectTechnology(filter.value)">{{ filter.label }}</UButton>
            </div>
            <p role="status" aria-live="polite" aria-atomic="true" class="text-sm text-paragraph">{{ filtered.length }} {{ filtered.length === 1 ? 'project' : 'projects' }}{{ selected !== 'all' ? ` · ${projectFilters.find(filter => filter.value === selected)?.label}` : '' }}</p>
        </div>
        </template>
        <MlProjects :projects="filtered" title="All projects" :show-view-all="false" variant="large" />
    </MlPageContainer>
</template>
