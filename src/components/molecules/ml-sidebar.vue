<script setup lang="ts">
import type { NavItem } from '~/config/content-config';

const { items } = defineProps<{
    items: NavItem[];
}>()
</script>

<template>
    <aside class="w-full mt-0 lg:mt-8">
        <nav>
            <ul>
                <li v-for="{ name, path } in items" :key="name">
                    <AtLinkButton :label="name" :to="path" />
                </li>
            </ul>
        </nav>
    </aside>
</template>