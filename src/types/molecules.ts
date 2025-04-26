export type MLPageHeader = {
    title: string;
    subtitle?: string;
    description: string[];
    action?:
        | {
              text: string;
              href: string;
          }
        | undefined;
};
