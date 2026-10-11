<script setup lang="ts">
defineProps<{ label?: string }>()
</script>
<template><span class="technology-pill"><slot>{{ label }}</slot></span></template>
