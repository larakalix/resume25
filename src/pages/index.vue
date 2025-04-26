<script setup lang="ts">
import type { PageConfig } from '~/types/page';

const page = usePage('home') as PageConfig;
const { refreshProjects } = useProjectStore()
await refreshProjects()
</script>

<template>
    <OrHome :page="page" />
</template>