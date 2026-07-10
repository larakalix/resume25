# PostHog post-wizard report

The wizard has completed a full PostHog analytics integration for Ivan Lara's Nuxt 4 portfolio site. The `@posthog/nuxt` module was installed and configured, environment variables were added for the PostHog project token and host, and eight meaningful client-side events were instrumented across key user interaction points — covering content engagement, outbound link clicks, contact intent, and UI interactions. Automatic exception tracking is enabled on both client (Vue) and server (Nitro) sides via `capture_exceptions: true` and `enableExceptionAutocapture: true`.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `project_link_clicked` | Visitor clicks a project card to visit the project's external URL | `src/components/molecules/ml-project-card.vue` |
| `blog_post_viewed` | Visitor opens and fully renders an individual blog post | `src/pages/post/[slug].vue` |
| `post_card_clicked` | Visitor clicks a post card on the blog listing page | `src/components/molecules/ml-post-card.vue` |
| `contact_link_clicked` | Visitor clicks a contact link (email, newsletter, GitHub, LinkedIn) on the contact page | `src/components/molecules/ml-contact-info.vue` |
| `social_link_clicked` | Visitor clicks a social link (GitHub, LinkedIn, Instagram) in the profile sidebar | `src/components/atoms/at-social-link.vue` |
| `view_all_projects_clicked` | Visitor clicks the "View all projects" link from the home page | `src/components/molecules/ml-projects.vue` |
| `contact_cta_clicked` | Visitor clicks the "Get in touch" CTA button in the page header | `src/components/molecules/ml-page-header.vue` |
| `theme_toggled` | Visitor toggles dark/light mode, capturing the new theme value | `src/components/atoms/at-theme-toggle.vue` |

## Next steps

A dashboard and five insights have been created in PostHog to track visitor behavior:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/505729/dashboard/1826498)
- **Portfolio engagement overview**: [All key events over time](https://us.posthog.com/project/505729/insights/DdWvxuBJ)
- **Blog reading funnel**: [post_card_clicked → blog_post_viewed conversion](https://us.posthog.com/project/505729/insights/uE9islv3)
- **Project clicks over time**: [project_link_clicked trend](https://us.posthog.com/project/505729/insights/gm7ERX9K)
- **Contact link clicks by type**: [contact_link_clicked breakdown by link_name](https://us.posthog.com/project/505729/insights/9jlvS2Ca)
- **Social link clicks by platform**: [social_link_clicked breakdown by social_name](https://us.posthog.com/project/505729/insights/HKTX237H)

## Verify before merging

- [ ] Run a full production build (`pnpm build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NUXT_PUBLIC_POSTHOG_HOST` to `.env.example` so collaborators know what to set.
- [ ] Wire source-map upload into CI so production stack traces de-minify (`posthog-cli sourcemap` or the `@posthog/nuxt` sourcemaps config with `PROJECT_ID` and `PERSONAL_API_KEY`).

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nuxt-4/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
