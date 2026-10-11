import type { LemonadeField, LemonadeModel, LemonadeModelTemplate, PortfolioSource } from './types';

const field = (key: string, label: string, type: LemonadeField['type'] = 'text', required = true, options: Partial<LemonadeField> = {}): LemonadeField => ({ key, label, type, required, ...options });
const model = (key: string, name: string, fields: LemonadeField[], singleton = false): LemonadeModel => ({ key, name, fields, ...(singleton ? { singleton: true } : {}) });
const embedded = (key: string, label: string, definition: LemonadeModel, multiple = true, required = true) => field(key, label, multiple ? 'components' : 'component', required, { components: [definition] });
const identifier = () => field('content_id', 'Original content ID', 'text', true, { unique: true, help_text: 'Preserve this source identity. Lemonade assigns its own entry UUID separately.' });
const month = (key: string, label: string, required = true) => field(key, label, 'text', required, { help_text: 'Keep YYYY-MM precision. A current role has a null end date; do not invent a day.' });
const options = (values: string[]) => [...new Set(values)].sort();

export function createLemonadeModelTemplate(source: PortfolioSource): LemonadeModelTemplate {
    const link = model('portfolio_link', 'Portfolio link', [field('label', 'Label'), field('url', 'Destination'), field('icon', 'Icon name', 'text', false)]);
    const achievement = model('portfolio_achievement', 'Achievement', [field('content_id', 'Original achievement ID'), field('text', 'Achievement', 'long_text'), field('featured', 'Featured', 'boolean')]);
    const skills = model('portfolio_skill_group', 'Skill group', [field('content_id', 'Original group ID'), field('label', 'Group label'), field('items', 'Skills', 'choices', true, { options: options(source.resume.skillGroups.flatMap(group => group.items)) })]);
    const education = model('portfolio_education', 'Education', [field('content_id', 'Original education ID'), field('institution', 'Institution'), field('qualification', 'Qualification'), month('date', 'Month'), field('status', 'Status')]);
    const certification = model('portfolio_certification', 'Certification', [field('content_id', 'Original certification ID'), field('issuer', 'Issuer'), field('name', 'Certification'), month('date', 'Month')]);
    const language = model('portfolio_language', 'Language', [field('name', 'Language'), field('proficiency', 'Proficiency')]);
    const action = model('portfolio_action', 'Page action', [field('text', 'Action label'), field('href', 'Destination')]);
    const seo = model('portfolio_seo', 'Page metadata', [field('title', 'Page title'), field('description', 'Description', 'long_text'), field('keywords', 'Keywords', 'long_text')]);

    return {
        format: 'lemonade-model-template', version: 1, name: `${source.resume.profile.name} portfolio`,
        description: 'Source-backed portfolio content types with ordered resume sections, article HTML, existing paths and stable content identities.',
        models: [
            model('profile', 'Profile', [field('name', 'Name'), field('headline', 'Headline'), field('location', 'Location'), field('open_to_relocate', 'Open to relocate', 'boolean'), field('summary', 'Summary', 'long_text'), field('email', 'Email'), field('phone', 'Phone'), field('phone_href', 'Phone destination'), embedded('links', 'Profile links', link, true, false)], true),
            model('project', 'Project', [identifier(), field('name', 'Name'), field('description', 'Description', 'long_text'), field('image_path', 'Preview path', 'text', true, { help_text: 'Existing local/HTTPS path; this is not an uploaded Lemonade image UUID.' }), field('demo_path', 'Original demo path', 'text', false), field('url', 'Project URL'), field('tags', 'Technologies and topics', 'choices', true, { options: options(source.projects.flatMap(project => project.tags)) }), field('sort_order', 'Source order', 'number')]),
            model('article', 'Article', [identifier(), field('title', 'Title'), field('slug', 'Slug', 'text', true, { unique: true }), field('excerpt', 'Excerpt', 'long_text'), field('content_html', 'Article HTML', 'long_text', true, { help_text: 'Preserved authored HTML, not Lemonade rich-text JSON. Sanitize remotely editable HTML in the delivery adapter.' }), field('publication_date', 'Publication date', 'date'), field('tags', 'Topics', 'choices', true, { options: options(source.posts.flatMap(post => post.tags)) }), field('image_path', 'Image path', 'text', false), field('sort_order', 'Source order', 'number')]),
            model('experience', 'Experience', [identifier(), field('company', 'Company'), field('role', 'Role'), field('location', 'Location'), field('remote', 'Remote', 'boolean'), month('start_date', 'Start month'), month('end_date', 'End month', false), embedded('highlights', 'Achievements', achievement), field('technologies', 'Technologies', 'choices', true, { options: options(source.resume.experience.flatMap(role => role.technologies)) }), field('sort_order', 'Source order', 'number')]),
            model('page', 'Page', [field('page_key', 'Page key', 'text', true, { unique: true }), field('title', 'Title'), field('subtitle', 'Subtitle', 'text', false), field('description', 'Description', 'long_text'), embedded('action', 'Page action', action, false, false), embedded('meta', 'Page metadata', seo, false)]),
            model('resume', 'Resume', [field('schema_version', 'Source schema version', 'number'), field('source_document', 'Source document'), field('profile', 'Profile', 'reference', true, { target: 'profile' }), field('experience', 'Experience', 'references', true, { target: 'experience' }), embedded('skill_groups', 'Skill groups', skills), embedded('education', 'Education', education), embedded('certifications', 'Certifications', certification), embedded('languages', 'Languages', language), field('pdf_path', 'PDF download path'), field('text_path', 'Text download path')], true),
            model('site_settings', 'Site settings', [field('title', 'Site title'), field('description', 'Site description', 'long_text'), embedded('navigation', 'Navigation', link), embedded('socials', 'Social links', link), embedded('contact_links', 'Contact links', link), field('pages', 'Pages', 'references', true, { target: 'page' }), field('projects', 'Projects', 'references', true, { target: 'project' }), field('articles', 'Articles', 'references', true, { target: 'article' }), field('resume', 'Resume', 'reference', true, { target: 'resume' })], true),
        ],
    };
}
