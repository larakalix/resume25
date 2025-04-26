<script setup lang="ts">
import type { PageConfig } from '~/types/page';

const page = usePage('blog') as PageConfig;
</script>

<template>
    <OrPosts :page="page" />
</template>