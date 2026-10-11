import profile from "~/data/generated/profile.json";
import { createContentConfig } from "./create-content-config";

export const contentConfig = createContentConfig({ profile });
export type ContentConfig = typeof contentConfig;
export type NavItem = ContentConfig["navItems"][number];
