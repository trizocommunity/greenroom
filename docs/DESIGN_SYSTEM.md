## Design system: shadcn/ui

This project uses **shadcn/ui** as the single source of truth for all UI primitives.

### Where to import components from

- **UI primitives** (buttons, inputs, dialogs, sheets, etc.) must come from:
  - `@/components/ui`
- **Feature components** (forms, dashboards, flows) live in:
  - `@/components/...` and should only depend on primitives from `@/components/ui`.

### Adding or updating shadcn/ui components

- Use the shadcn CLI with the existing config:
  - `components.json` is already configured with:
    - `tailwind.config.ts`
    - `src/app/globals.css`
    - aliases for `@/components`, `@/components/ui`, and `@/lib/utils`.
- Generate new components into `src/components/ui` and then consume them from there.

### Styling and tokens

- Global design tokens (colors, radii, typography) are defined in:
  - `src/app/globals.css`
  - `tailwind.config.ts`
- Do **not** hard‑code colors or radii in components; rely on existing CSS variables and Tailwind utilities wired to those tokens.

### Usage guidelines

- Prefer shadcn primitives over raw HTML:
  - Use `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `AlertDialog`, `Sheet`, `Tabs`, `Accordion`, `Tooltip`, etc.
  - Avoid custom `<button>`, `<input>`, `<textarea>`, or direct `@radix-ui/react-*` usage in feature components.
- Compose variants using the built‑in `class-variance-authority` setups in the `ui` components.

### Exceptions

- `src/components/editor/**` is exempted from some Biome rules (see `biome.json` overrides). Editor internals may use raw HTML elements where Radix/shadcn primitives do not fit the canvas-based editing surface; keep new feature components outside the editor on the standard primitives.

