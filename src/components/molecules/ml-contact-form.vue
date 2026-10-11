<script setup lang="ts">
import profile from '~/data/generated/profile.json'
import type { FormSubmitEvent } from '@nuxt/ui'
import { contactSchema, type ContactForm } from '~/schemas/contact-schema';

const toast = useToast()

const state = reactive<ContactForm>({
    name: '',
    email: '',
    message: '',
    subject: '',
});

function onSubmit(event: FormSubmitEvent<ContactForm>) {
    const { name, email, subject, message } = event.data
    const body = `${message}\n\nFrom: ${name} <${email}>`
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    toast.add({ title: 'Email draft opened', description: 'Send the message from your email app.', color: 'info' })
}

</script>

<template>
    <UCard>
        <UForm :schema="contactSchema" :state="state" class="space-y-4" @submit="onSubmit">
            <UFormField label="Name" name="name">
                <UInput v-model="state.name" />
            </UFormField>

            <UFormField label="Email" name="email">
                <UInput v-model="state.email" type="email" />
            </UFormField>

            <UFormField label="Subject" name="subject">
                <UInput v-model="state.subject" />
            </UFormField>

            <UFormField label="Message" name="message">
                <UTextarea v-model="state.message" />
            </UFormField>

            <div class="pt-2">
                <UButton type="submit" class="w-full sm:w-auto">
                    Open email draft
                </UButton>
            </div>
        </UForm>
    </UCard>
</template>