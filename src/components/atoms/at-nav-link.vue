<script setup lang="ts">
const { to, class: className } = defineProps<{ to: string; class?: string }>()
</script>
<template>
    <ULink :to="to" :class="className" class="nav-link" exact><slot /></ULink>
</template>
