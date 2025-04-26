<script setup lang="ts">
import type { PageConfig } from '~/types/page';

const page = usePage('home') as PageConfig;
</script>

<template>
    <OrHome :page="page" />
</template>