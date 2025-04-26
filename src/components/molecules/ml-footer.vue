<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <footer
        class="py-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>© {{ year }} Ivan. Built with Nuxt</p>
    </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>