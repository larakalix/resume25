<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
useSeoMeta({ title: 'Page unavailable - Ivan Lara', robots: 'noindex, nofollow' })
function goHome() {
    clearError({ redirect: '/' })
}
</script>

<template>
    <UApp>
        <main class="mx-auto max-w-xl px-6 py-24 text-center">
            <h1 class="text-3xl font-medium text-title">{{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}</h1>
            <p class="mt-4 text-title/80">{{ error.statusCode === 404 ? 'The page you’re looking for doesn’t exist.' : 'Please try again in a moment.' }}</p>
            <UButton class="mt-8" color="neutral" @click="goHome">Back to home</UButton>
        </main>
    </UApp>
</template>
