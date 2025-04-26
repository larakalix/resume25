<script setup lang="ts">
import type { Page } from '~/types/page'

const { page } = defineProps<Page>()
const { config } = useContentStore()

const { description, ...rest } = page
</script>

<template>
    <MlPageContainer :page="{ ...rest, description: '' }">
        <template #sidebar>
            <MlSidebar :items="config.navItems" />
        </template>
    </MlPageContainer>
</template>