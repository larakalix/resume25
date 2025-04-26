export type MLPageHeaderProps = {
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
