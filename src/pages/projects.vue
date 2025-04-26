<script setup lang="ts">
import type { PageConfig } from '~/types/page';

const page = usePage('projects') as PageConfig;
</script>

<template>
    <OrProjects :page="page" />
</template>