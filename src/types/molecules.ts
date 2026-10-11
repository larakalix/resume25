import type { PageConfig } from './page';
export type MLPageHeader = Omit<PageConfig, 'description' | 'meta'> & { description: string[] };
