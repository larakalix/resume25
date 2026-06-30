<script setup lang="ts">
import type { Page } from '~/types/page'

const { page } = defineProps<Page>()
const { config } = useContent()
const { posts } = usePosts()

const { description, ...rest } = page
</script>

<template>
    <MlPageContainer :page="{ ...rest, description: '' }" compact-sidebar>
        <template #sidebar>
            <MlSidebar :items="config.navItems" compact />
        </template>

        <template #default>
            <MlPosts :posts="posts ?? []" />
        </template>
    </MlPageContainer>
</template>
