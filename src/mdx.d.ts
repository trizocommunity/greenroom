declare module "*.mdx" {
  import type { ComponentType } from "react";

  export const docMeta:
    | {
        title?: string;
        description?: string;
        section?: string;
      }
    | undefined;

  const MDXComponent: ComponentType;
  export default MDXComponent;
}
