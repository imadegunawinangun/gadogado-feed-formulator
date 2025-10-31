# Frontend Guideline Document for gadogado-feed-formulator

This document outlines the frontend setup, design principles, and technologies used in the `gadogado-feed-formulator` project. It’s written in everyday language so that anyone—technical or not—can understand how the frontend is built and maintained.

---

## 1. Frontend Architecture

### 1.1 Overview

- **Framework:** Next.js 15 (App Router) with React and TypeScript. This gives us built-in server-side rendering (SSR), static generation (SSG), and an organized file-based routing system.
- **Build Tool:** Turbopack for fast rebuilds during development.
- **Styling:** Tailwind CSS v4 in utility-first mode, combined with CSS variables for theming.
- **UI Components:** Shadcn UI (New York style) built on Radix UI primitives, plus Lucide React icons.
- **Theming:** `next-themes` for light/dark mode toggling.

### 1.2 Scalability, Maintainability & Performance

- **Scalability:** File-based routing and a clear folder structure (`app/`, `components/`, `lib/`, `db/`, `styles/`) make it easy to add new pages, components, or services.
- **Maintainability:** Clean separation of concerns:
  - `app/` for pages and layouts
  - `components/` for reusable UI pieces
  - `lib/` for business logic and utilities
  - `db/` for database schema and connections
- **Performance:** 
  - Server Components minimize client bundle size.
  - SSR/ISR ensures fast initial load.
  - Turbopack and Tailwind’s JIT keep rebuild times and CSS output lean.
  - Code splitting and dynamic imports for heavy components.

---

## 2. Design Principles

1. **Usability:** Clean, straightforward interfaces guide users through sign-in, dashboard tasks, and formulation workflows without clutter.
2. **Accessibility:** Use semantic HTML, ARIA attributes, focus states, and sufficient color contrast to support all users.
3. **Responsiveness:** Mobile-first layouts that adapt smoothly from phones to desktops using Tailwind’s responsive utilities.
4. **Consistency:** A unified look and feel based on Shadcn UI’s design tokens, ensuring buttons, forms, and tables behave and appear predictably.
5. **Clarity:** Avoid unnecessary animations or graphics. Every element serves a purpose—whether it’s an input field, table row, or chart.

*Application in UI:* Forms use clear labels and inline error messages; navigation uses sticky headers and breadcrumb trails; color and typography guide focus to important actions.

---

## 3. Styling and Theming

### 3.1 Styling Approach

- **Tailwind CSS v4:** Utility-first classes for rapid, consistent styling.
- **CSS Variables:** Defined in `:root` for theme colors, spacing, and font sizes.
- **BEM-like Naming in Custom CSS:** When writing custom styles, use a simple BEM pattern (`.card__header`, `.modal__backdrop`).

### 3.2 Theming

- **Light & Dark Modes:** Managed by `next-themes`. Theme choice is stored in `localStorage`.
- **CSS Variables Example:**
  ```css
  :root {
    --color-primary: #1D4ED8;
    --color-accent: #10B981;
    --color-secondary: #6B7280;
    --color-bg-light: #F9FAFB;
    --color-bg-dark: #111827;
    --color-text-light: #1F2937;
    --color-text-dark: #F3F4F6;
  }
  [data-theme='dark'] {
    --color-bg: var(--color-bg-dark);
    --color-text: var(--color-text-dark);
  }
  [data-theme='light'] {
    --color-bg: var(--color-bg-light);
    --color-text: var(--color-text-light);
  }
  ```

### 3.3 Visual Style & Typography

- **Design Style:** Modern, flat design with subtle glassmorphism touches on cards and modals (slight backdrop blur).
- **Color Palette:** 
  • Primary Blue: #1D4ED8
  • Accent Green: #10B981  
  • Neutral Gray: #6B7280  
  • Light Background: #F9FAFB  
  • Dark Background: #111827
- **Font:** Inter (system-safe fallback: `-apple-system, BlinkMacSystemFont, sans-serif`).

---

## 4. Component Structure

- **Atomic to Composite:** Small building blocks (Button, Input, Card) in `components/ui/`, composed into larger features (DataTable, FormulatorPanel).
- **Folder Layout:**
  ```
  components/
    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      ChartWrapper.tsx
    auth/
      SignInForm.tsx
      SignUpForm.tsx
    dashboard/
      IngredientTable.tsx
      FormulationControls.tsx
  ```
- **Reusability:** Every component:
  - Accepts well-defined props
  - Has minimal external dependencies
  - Is documented with JSDoc or a README snippet

*Why it matters:* Isolated components are easy to test, style, and swap out as requirements evolve.

---

## 5. State Management

- **Server Components & Server Actions:** Data fetching and mutations happen on the server side by default, reducing client bundle size.
- **Client State:** 
  - **React `useState`** for local UI state (e.g., form inputs, modal open/close).
  - **React Context** for globally shared state such as the authenticated user or theme (via `next-themes`).
  - **Optional Data Caching:** If needed later, integrate React Query or SWR for sophisticated client caching.

*Goal:* Keep most data logic on the server; use client state sparingly to keep the UI snappy and predictable.

---

## 6. Routing and Navigation

- **File-based Routing:** Folders and files under `app/` map directly to URLs:
  - `/sign-in` ➔ `app/sign-in/page.tsx`
  - `/sign-up` ➔ `app/sign-up/page.tsx`
  - `/dashboard` ➔ `app/dashboard/page.tsx`
  - API routes under `app/api/`
- **Layouts:** `app/layout.tsx` wraps all pages (global navigation, footer, theme provider).
- **Protected Routes:** Next.js Middleware checks for authentication cookies or session before granting access to `/dashboard`.
- **Client Navigation:** Use `next/link` and the `useRouter` hook for fast client transitions.

---

## 7. Performance Optimization

1. **Code Splitting & Lazy Loading:** Dynamic imports for heavy components (e.g., charts) using `next/dynamic`.
2. **Image Optimization:** `next/image` for responsive, lazy-loaded images.
3. **Caching Strategies:** 
   - ISR for semi-dynamic pages.
   - HTTP caching headers via Vercel.
4. **Minimized Bundles:** 
   - Tree-shaking with ES modules.
   - Tailwind JIT to only generate used CSS.
5. **Edge Network:** Deployed on Vercel’s edge network for global low-latency delivery.

Result: Faster load times (<3s), snappy interactions (<200ms API responses), and smooth UI updates.

---

## 8. Testing and Quality Assurance

- **Unit Tests:** Jest + React Testing Library for components and utility functions.
- **Integration Tests:** Test database queries and API routes (mock Supabase + Drizzle) with Jest or Vitest.
- **End-to-End Tests:** Playwright or Cypress to simulate user flows: sign-in, dashboard use, formulation run.
- **Linting & Formatting:** ESLint (with a shared config) and Prettier to enforce code style.
- **Type Checking:** Strict TypeScript settings (`tsconfig.json`) ensure early error catching.
- **CI/CD Integration:** GitHub Actions or Vercel pipelines run tests and lint on every pull request.

---

## 9. Conclusion and Overall Frontend Summary

This guideline captures how the `gadogado-feed-formulator` frontend is structured and why it works:

- **Modern Stack:** Next.js 15, TypeScript, Tailwind CSS, Shadcn UI.
- **Clear Organization:** Modular folders, atomic components, server-driven data.
- **Design Focus:** Usable, accessible, responsive, and consistent interfaces with light/dark themes.
- **Performance & Quality:** Optimized builds, code splitting, comprehensive testing.

By following these guidelines, developers can extend the template confidently to build out the full “Bangun Gadogado” application—delivering a scalable, maintainable, and high-quality user experience for farmers, nutritionists, and feed producers alike.