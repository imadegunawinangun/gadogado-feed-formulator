# Tech Stack Document for gadogado-feed-formulator

This document explains, in clear everyday language, the technology choices behind the `gadogado-feed-formulator` project. It shows how each piece fits together to create a modern, reliable, and user-friendly application for animal feed formulation.

## 1. Frontend Technologies

Our frontend is what users see and interact with in their browsers. Here’s what we use and why:

- **Next.js 15 (App Router)**
  - A framework built on React that handles page routing, server-side rendering (SSR), and static generation. This makes pages load fast and stay up-to-date.
  - **Turbopack**: Speeds up how quickly code changes appear during development, so our team can iterate rapidly.

- **TypeScript**
  - Adds simple checks to our JavaScript code, catching mistakes early and making the UI more reliable.

- **Styling Tools**:
  - **Tailwind CSS v4**: A utility-first styling framework that lets us build consistent, responsive designs quickly without writing long CSS files.
  - **next-themes**: Enables light and dark mode out of the box, giving users control over their viewing preference.

- **UI Component Libraries**:
  - **Shadcn UI** (New York style): Provides a set of ready-made, polished components (buttons, tables, forms) that look great together.
  - **Radix UI primitives**: The underlying building blocks for Shadcn components, ensuring accessibility and flexibility.
  - **Lucide React**: A library of simple, crisp icons that match our design language.

These choices give us a modern, responsive, and consistent interface that works smoothly on desktops, tablets, and phones.

## 2. Backend Technologies

The backend powers the core features—user accounts, data storage, and the feed formulation engine.

- **Next.js API Routes and Server Components**
  - Let us run code on the server for tasks like fetching data, running calculations, and protecting private pages behind authentication.

- **Authentication & User Management**:
  - **Better Auth**: A simple, secure way to handle sign-up, sign-in, password resets, and session management.
  - **Supabase** (optional integration): A hosted service that can store user accounts and sessions, making it easy to scale and manage authentication without building it all from scratch.

- **Database**:
  - **PostgreSQL**: A reliable, open-source database for storing user profiles, ingredients, nutrients, formulations, and more.
  - **Drizzle ORM**: A type-safe layer on top of PostgreSQL that makes database queries easier to write and reduces errors.
  - **Drizzle Kit**: Manages database schema changes over time (migrations), so our data structure stays organized and versioned.

- **Feed Formulation Logic**:
  - **Custom Optimization Engine** (e.g., `glpk.js` or similar): Runs the mathematical calculations needed to balance ingredients and nutrients based on user inputs.
  - Located in a dedicated `lib/` folder, following the **Repository Pattern** to separate business logic from data access.

These backend tools work together to handle data securely, perform complex calculations, and serve the right information to users when they need it.

## 3. Infrastructure and Deployment

How we host, build, and update the application:

- **Hosting Platform**:
  - **Vercel**: Optimized for Next.js apps, offering automatic deployments, global content delivery (CDN), and serverless functions for our API routes.

- **Containerization**:
  - **Docker**: Ensures that everyone on the development team uses the same environment, reducing “it works on my machine” problems.

- **Version Control & Collaboration**:
  - **GitHub**: Hosts the code repository, tracks changes, and enables collaboration through pull requests.

- **CI/CD Pipelines**:
  - **GitHub Actions** or **Vercel’s built-in workflows**:
    - Automatically run tests and deploy the app when code is merged into the main branch.
    - Helps catch errors early and keeps production up to date.

These choices make deployments predictable, fast, and easy to roll back if necessary, while keeping the development experience smooth.

## 4. Third-Party Integrations

We rely on a few external services to extend functionality without reinventing the wheel:

- **Supabase**:
  - Optional database and authentication service fully compatible with PostgreSQL and Drizzle ORM.
  - Offers Row-Level Security (RLS) to ensure users only see their own data.

- **Linear Programming Library** (e.g., `glpk.js`):
  - Handles the specialized math behind the feed formulation engine.

- **Analytics & Monitoring** (optional):
  - Services like **Google Analytics** or **Vercel Analytics** can be plugged in to track usage patterns and performance.

- **Email/Notifications** (future):
  - Tools like **SendGrid** or **Twilio** can be added to send password reset emails or notifications about formulation results.

These integrations speed up development and bring battle-tested functionality into the project.

## 5. Security and Performance Considerations

We’ve built the app with safety and speed in mind:

Security Measures:
- **Better Auth & Supabase RLS**: Protect user data with secure sessions and database policies that limit data access to the correct user.
- **HTTPS Everywhere**: All traffic is encrypted in transit via modern TLS protocols.
- **Environment Variables**: Secrets (API keys, database credentials) are kept out of the code and loaded securely on the server.

Performance Optimizations:
- **Server-Side Rendering (SSR) & Incremental Static Regeneration (ISR)** via Next.js:
  - Critical pages load fast and stay up-to-date without full rebuilds.
- **Turbopack** during development:
  - Speeds up code refreshes so developers can see changes almost instantly.
- **Caching Strategies**:
  - Next.js built-in caching for API calls and static assets reduces load times.
- **TypeScript & Drizzle**:
  - Catch potential errors early, leading to fewer runtime issues that slow down the app.

These measures ensure data stays safe and that users enjoy a snappy, reliable experience.

## 6. Conclusion and Overall Tech Stack Summary

In summary, `gadogado-feed-formulator` combines a modern, user-friendly frontend with a robust, secure backend and a streamlined infrastructure:

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Shadcn UI, Radix UI, Lucide React, next-themes, and Turbopack.
- **Backend**: Next.js API Routes, Better Auth, Supabase (optional), PostgreSQL, Drizzle ORM, Drizzle Kit, and a custom optimization engine.
- **Infrastructure**: Docker, Vercel, GitHub, and CI/CD pipelines (GitHub Actions or Vercel workflows).
- **Integrations**: Supabase services, a linear programming library (`glpk.js`), and optional analytics or notification services.
- **Security & Performance**: Secure authentication, database policies, SSL/TLS, SSR/ISR, caching, and type-safe code.

Together, these technologies align with the goals of building a scalable, maintainable, and elegant application for farmers, nutritionists, and feed producers. The stack is both approachable for new developers and flexible enough to grow with future features and user needs.