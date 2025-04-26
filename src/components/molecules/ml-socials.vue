<script setup lang="ts">
import type { Social } from '~/types/page';

const { socials } = defineProps<{ socials: Social[] }>()
</script>

<template>
    <div class="flex flex-wrap gap-0 md:gap-2">
        <AtSocialLink v-for="{ name, icon, href } in socials" :key="name" :href="href">
            <span class="hidden md:flex">{{ name }}</span>
            <span class="flex size-8 justify-center items-center md:hidden">
                <Icon :name="icon" class="text-2xl" />
            </span>
        </AtSocialLink>
    </div>
</template>