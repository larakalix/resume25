<script setup lang="ts">
const { config } = useContent()
const year = new Date().getFullYear()
</script>
<template>
    <footer class="site-footer">
        <div><NuxtLink to="/" class="wordmark">Ivan Lara<span aria-hidden="true">.</span></NuxtLink><p>UI &amp; Full-Stack Developer</p></div>
        <div class="footer-meta"><div class="footer-socials"><a v-for="social in config.socials" :key="social.name" :href="social.href" target="_blank" rel="noopener noreferrer">{{ social.name }}<AtMotionArrow /></a></div><p>© {{ year }} Ivan Lara · Built with Nuxt</p></div>
    </footer>
</template>
