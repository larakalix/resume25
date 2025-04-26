<script setup lang="ts">
import type { PageConfig } from '~/types/page';

const page = usePage('contact') as PageConfig;
</script>

<template>
    <OrContact :page="page" />
</template>