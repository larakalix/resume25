<script setup lang="ts">
const { config } = useContentStore()
</script>

<template>
  <header class="w-full mb-0 lg:mb-8">
    <nav class="container mx-auto flex justify-between items-center px-2 py-2 lg:px-4 lg:py-8">
      <div class="flex items-center gap-x-2">
        <div class="flex items-center gap-4 text-xl">
          <!-- <a v-for="{ name, href, icon } in config?.socials" :key="name" :href="href" target="_blank" :aria-label="name">
            <Icon :name="icon" />
          </a> -->
          <MlSocials v-if="config?.socials" :socials="config?.socials" />
        </div>
      </div>

      <div class="flex gap-x-2 items-center">
        <div class="hidden md:flex">
          <AtNavLink v-for="{ name, path } in config?.navItems" :key="name" :to="path">{{ name }}</AtNavLink>
        </div>

        <AtThemeToggle />
      </div>
    </nav>
  </header>
</template>