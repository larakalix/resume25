<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { contactSchema, type ContactForm } from '~/schemas/contact-schema';

const toast = useToast()

const state = reactive<ContactForm>({
    name: '',
    email: '',
    message: '',
    subject: '',
});

async function onSubmit(event: FormSubmitEvent<ContactForm>) {
    toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
    console.log(event.data)
}

</script>

<template>
    <UCard>
        <UForm :schema="contactSchema" :state="state" class="space-y-4" @submit="onSubmit">
            <UFormGroup label="Name" name="name">
                <UInput v-model="state.name" />
            </UFormGroup>

            <UFormGroup label="Email" name="email">
                <UInput v-model="state.email" type="email" />
            </UFormGroup>

            <UFormGroup label="Subject" name="subject">
                <UInput v-model="state.subject" />
            </UFormGroup>

            <UFormGroup label="Message" name="message">
                <UTextarea v-model="state.message" />
            </UFormGroup>

            <div class="pt-2">
                <UButton type="submit" class="w-full sm:w-auto">
                    Send Message
                </UButton>
            </div>
        </UForm>
    </UCard>
</template>