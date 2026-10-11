<script setup lang="ts">
const year = new Date().getFullYear()
const { config } = useContent()
</script>
<template>
    <footer class="site-footer">
        <MlSocials :socials="config.socials" />
        <p class="text-sm text-paragraph">© {{ year }} Ivan Lara · Built with Nuxt</p>
    </footer>
</template>
