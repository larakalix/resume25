import { parse } from 'valibot';
import document from '../content/resume.json' with { type: 'json' };
import { resumeSchema } from '../schemas/resume-schema';

// A future CMS response must pass this same content boundary.
export const resume = parse(resumeSchema, document);
