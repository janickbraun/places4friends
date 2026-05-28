# places4friends - Agent Guidelines

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## App Concept
**places4friends** is a social, high-end recommendation application. Instead of anonymous ratings, users share direct personal reviews and key Highlights ("Must See" tags) of local spots with their friends, displayed on an interactive shared Mapbox map.

---

## Development Rules

### Emojis and Icons
- Do NOT use emojis in the codebase, the user interface, or any documentation (including README.md and AGENTS.md).
- Use high-quality vector icons (e.g., Lucide React / SVG icons) instead of emojis in the application.

### Modular & Reusable Code
- Write small, self-contained components in `src/components/`.
- Keep business logic separated from visual/layout components where possible.
- Avoid duplicate code and inline style blocks that bypass Tailwind utility classes.

### Design & Aesthetic Excellence
- Ensure the UI looks premium, using consistent colors (harmonious palettes: slate/slate-950, brand-green, and warm amber for Highlights).
- Always use smooth transitions and responsive design.

### Code Quality
- Write clean TypeScript with strict typing (avoid `any` where possible).

### Browser Usage
- Do NOT open the browser unless explicitly requested in the user prompt or for testing very complex tasks.


