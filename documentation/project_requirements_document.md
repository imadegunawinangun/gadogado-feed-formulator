# Project Requirements Document (PRD) for gadogado-feed-formulator

---

## 1. Project Overview

**Paragraph 1:**
`gadogado-feed-formulator` is a full-stack starter template built with Next.js 15 and TypeScript. It provides a pre-wired foundation for “Bangun Gadogado,” a modern, data-driven animal feed formulation platform aimed at farmers, nutritionists, and feed producers. By combining user authentication, a protected dashboard, a responsive UI/UX, and a type-safe PostgreSQL integration, this codebase jump-starts the creation of an efficient, elegant, and secure solution for complex feed formulation tasks.

**Paragraph 2:**
This project exists to eliminate the boilerplate effort of setting up authentication, database connections, UI theming, and deployment pipelines. The key objectives are: 1) Secure and scalable user management, 2) A modular dashboard ready for feed-formulation features, 3) Consistent, modern styling with light/dark modes, and 4) A developer-friendly environment using Docker and Vercel. Success is measured by how quickly a development team can extend this template into a working feed formulation engine with real data, meeting performance and security standards.

---
## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0)**
- User sign-up, sign-in, and session management via Better Auth (configurable to Supabase).
- Protected `/dashboard` route accessible only to authenticated users.
- Base UI using Tailwind CSS, Shadcn UI components, Lucide React icons, and dark mode support via `next-themes`.
- PostgreSQL setup with Drizzle ORM for type-safe queries, ready to connect to Supabase.
- Docker configuration for local development consistency.
- Vercel–compatible deployment configuration (serverless functions, caching).
- Folder structure enforcing separation of concerns: `app/`, `components/`, `lib/`, `db/`.

**Out-of-Scope (Planned for Later Phases)**
- Detailed Drizzle schemas for `ingredients`, `nutrients`, `animals`, `formulations`, and `user_profiles` beyond placeholders.
- The actual linear programming optimization engine (e.g., `glpk.js` integration).
- Role-based access controls beyond basic authenticated vs. unauthenticated.
- Automated testing suite (unit, integration, end-to-end).
- Export features (PDF/CSV) for formulation results.
- Continuous integration pipelines (GitHub Actions) beyond Docker/Vercel defaults.
- Interactive documentation and user onboarding guides.

---
## 3. User Flow

**Paragraph 1:**
A new user arrives at the landing page and clicks “Sign Up.” They provide an email and password (or use a third-party provider if configured), then confirm their account via email. Once authenticated, the user is redirected to `/dashboard`. A left-hand navigation bar appears listing “Ingredients,” “Animal Profiles,” “Formulations,” and “Settings.” The main panel welcomes them with a quick overview and prompts to add their first ingredient or create an animal profile.

**Paragraph 2:**
From the dashboard, the user clicks “Ingredients” to view a table of existing items (initially empty) and an “Add Ingredient” button. They fill out a form (name, cost, nutrient values) and save. Next, they go to “Formulations,” select an animal profile, pick ingredients, and click “Generate.” The optimization logic (in a later phase) runs behind the scenes and returns a cost- and nutrient-balanced feed mix. Results appear as a chart and table. The user can then save, export, or adjust inputs and re-run the calculation.

---
## 4. Core Features

- **Authentication & Profile Management**: Sign-up/sign-in flows, password reset, session storage (Better Auth + Supabase).  
- **Protected Dashboard**: Gatekeeper route for all core modules; redirect unauthenticated users to sign-in.  
- **Ingredient Management**: CRUD UI for feed ingredients with fields for cost and nutrient composition.  
- **Animal Profile Setup**: CRUD UI for defining animal types, production stages, and dietary requirements.  
- **Formulation Engine Stub**: UI for selecting ingredients and animal profiles; placeholder for optimization results.  
- **Real-Time Analysis (UI)**: Charts and tables to display cost breakdowns and nutrient profiles (data stubs initially).  
- **Theming & Styles**: Light/dark mode toggle, global CSS variables, Tailwind CSS + Shadcn UI components.  
- **Database Layer**: Drizzle ORM setup with initial auth schema; ready for extension.  
- **Development Environment**: Dockerfile, `docker-compose.yml`, and environment variable template.  
- **Deployment Configuration**: Vercel settings for serverless functions, environment variables, and caching.

---
## 5. Tech Stack & Tools

- **Frontend Framework**: Next.js 15 (App Router) with React Server & Client Components.  
- **Language**: TypeScript (end-to-end type safety).  
- **Authentication**: Better Auth library, pluggable to Supabase Auth.  
- **Database**: PostgreSQL (hosted on Supabase) with Drizzle ORM for type-safe queries.  
- **Styling & UI**: Tailwind CSS v4, Shadcn UI components (New York style), Lucide React icons, `next-themes` for theming.  
- **Containerization**: Docker & Docker Compose for local environment parity.  
- **Deployment**: Vercel (serverless functions + automatic caching).  
- **ORM Migrations**: Drizzle Kit (future use for versioned migrations).  
- **Optimization Engine (Planned)**: `glpk.js` or similar linear programming library in `/lib/optimizers`.  
- **IDE/Plugins**: VS Code with ESLint, Prettier, TypeScript support. Cursor/Windsurf optional for AI-assisted coding.

---
## 6. Non-Functional Requirements

- **Performance**:  
  • Page load time < 3 seconds on 3G network.  
  • API responses for dashboard data < 200 ms.  
- **Security**:  
  • All traffic over HTTPS.  
  • Passwords hashed securely (via Better Auth).  
  • Prepare for Supabase Row-Level Security (RLS) policies.  
- **Usability**:  
  • Responsive design (mobile, tablet, desktop).  
  • WCAG 2.1 AA compliance for core flows.  
  • Intuitive light/dark mode toggle.  
- **Scalability**:  
  • Serverless architecture on Vercel.  
  • Connection pooling for PostgreSQL.  
- **Maintainability**:  
  • Clean architecture with clear folder boundaries.  
  • Consistent coding standards (ESLint, Prettier).

---
## 7. Constraints & Assumptions

- **Next.js 15** is available and stable.  
- **Supabase** account is provisioned for auth and database hosting.  
- **Better Auth** library supports session storage in Supabase.  
- **Docker** installed on developer machines.  
- Users have reliable internet connectivity.  
- Future phases will introduce the optimization engine and detailed schemas.

---
## 8. Known Issues & Potential Pitfalls

1. **API Rate Limits**: Supabase free tier limits could throttle early testing.  
   _Mitigation_: Use local Postgres for heavy dev, monitor usage, upgrade tier if needed.  
2. **Database Migrations**: Schema changes without migration tooling can cause drift.  
   _Mitigation_: Integrate Drizzle Kit early and define versioned migrations.  
3. **Optimization Engine Complexity**: Linear programming libraries in JS may not scale.  
   _Mitigation_: Prototype with small data sets, isolate in `/lib/optimizers`, consider external service if needed.  
4. **Dark Mode Flash**: FOUC (flash of unstyled content) when toggling themes.  
   _Mitigation_: Use `next-themes` SSR configs or inline theme script.  
5. **Env Variable Leaks**: Misconfigured Vercel envs can expose secrets.  
   _Mitigation_: Use `.env.local` for dev, Vercel’s secure environment settings for production.


---

This PRD provides a clear, unambiguous blueprint for the AI model to generate subsequent technical documents (Tech Stack, Frontend Guidelines, Backend Structure, App Flow, File Structure, IDE Rules, etc.) without missing details or assumptions. All major modules, flows, and decisions are explicitly defined to ensure smooth progression into development and deployment phases.