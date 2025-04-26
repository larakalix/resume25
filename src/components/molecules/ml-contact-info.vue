<script setup lang="ts">
const { config } = useContentStore()
</script>

<template>
    <section class="space-y-4">
        <AtTitle size="medium">Contact</AtTitle>
        <AtParagraph text="Send me an email to say hi, or connect via the socials." />

        <ul class="list-disc pl-4 space-y-2 marker:text-black/50 dark:marker:text-white/50">
            <li v-for="{ href, name } in config.contactLinks" :key="name">
                <a :href="href" target="_blank" rel="noopener noreferrer" class="text-sm md:text-base font-medium text-black dark:text-white">
                    <template v-if="name === 'Email'">
                        <span class="font-medium text-black dark:text-white">Email:</span>
                        <span class="ml-1">{{ href.replace('mailto:', '') }}</span>
                    </template>
                    <template v-else>
                        {{ name }}
                    </template>
                </a>
            </li>
        </ul>
    </section>
</template>