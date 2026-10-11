import type { InferOutput } from 'valibot';
import type { resumeSchema } from '../schemas/resume-schema';

export type Resume = InferOutput<typeof resumeSchema>;
export type ResumeExperience = Resume['experience'][number];
