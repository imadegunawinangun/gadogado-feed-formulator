# Backend Structure Document

This document outlines the backend architecture, database design, APIs, hosting setup, infrastructure components, security practices, and maintenance strategies for the `gadogado-feed-formulator` project. It is written in clear, everyday language so that anyone—technical or not—can understand how the backend is built and maintained.

## 1. Backend Architecture

### Overview

The backend is built on **Next.js 15** using the App Router. Instead of a separate server, we use Next.js API routes and Server Actions to handle all server-side logic. The code follows a **Clean Architecture** approach, keeping presentation, business logic, and data access clearly separated:

- **Presentation Layer (`/app` and React components)** handles incoming HTTP requests and renders pages.
- **Business Logic Layer (`/lib`)** contains core services and the formulation engine.
- **Data Access Layer (`/db`)** manages database connections and queries via Drizzle ORM.

### Design Patterns and Frameworks

- **Clean Architecture** keeps concerns separated so changes in one area don’t break others.
- **Repository Pattern** in `/lib/repositories` abstracts data access, making it easy to swap databases or add caching.
- **TypeScript** ensures type safety across the entire codebase.
- **Turbopack** accelerates development with fast builds.

### Scalability, Maintainability, Performance

- **Scalability**: Deployed as serverless functions on Vercel. Each API route can scale independently under load.
- **Maintainability**: Strong typing, modular folders, and clear boundaries help developers find and update code quickly.
- **Performance**: Server-side rendering (SSR) and Incremental Static Regeneration (ISR) deliver fast page loads. Database queries are optimized through Drizzle ORM’s prepared statements.

## 2. Database Management

### Technology Stack

- **Database Type**: Relational SQL.
- **Database System**: PostgreSQL (hosted on Supabase).
- **ORM**: Drizzle ORM for type-safe queries in TypeScript.

### Data Structure and Practices

- **Relational Tables** with clear foreign keys to model users, ingredients, animals, and formulations.
- **Migrations** managed by Drizzle Kit, ensuring versioned schema updates.
- **Backups** and **Point-in-Time Recovery** provided by Supabase.
- **Connection Pooling** is handled by Supabase automatically, avoiding overload.

## 3. Database Schema

Below is a human-readable description of the main tables, followed by SQL statements to create them.

### Human-Readable Schema

• **users**: Stores authentication data.
  - id (UUID)
  - email (string)
  - password_hash (string)
  - created_at (timestamp)

• **user_profiles**: Extends users with roles and personal info.
  - id (UUID)
  - user_id (UUID) → users.id
  - role (enum: farmer, nutritionist, producer)
  - full_name (string)
  - created_at (timestamp)

• **ingredients**: List of feed ingredients.
  - id (UUID)
  - name (string)
  - cost_per_unit (decimal)
  - unit (string, e.g., kg)
  - created_by (UUID) → user_profiles.id
  - created_at (timestamp)

• **nutrients**: Nutrient types.
  - id (UUID)
  - name (string)
  - unit (string, e.g., grams)

• **ingredient_nutrients**: Many-to-many between ingredients and nutrients.
  - ingredient_id (UUID) → ingredients.id
  - nutrient_id (UUID) → nutrients.id
  - amount_per_unit (decimal)

• **animals**: Animal species.
  - id (UUID)
  - name (string)
  - description (text)

• **production_stages**: Stages of animal growth or production.
  - id (UUID)
  - animal_id (UUID) → animals.id
  - name (string)
  - description (text)

• **formulations**: Saved feed recipes.
  - id (UUID)
  - user_id (UUID) → user_profiles.id
  - animal_id (UUID) → animals.id
  - stage_id (UUID) → production_stages.id
  - name (string)
  - created_at (timestamp)

• **formulation_ingredients**: Ingredient mix for each formulation.
  - formulation_id (UUID) → formulations.id
  - ingredient_id (UUID) → ingredients.id
  - inclusion_rate (decimal)

### SQL Schema (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('farmer','nutritionist','producer')) NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2) NOT NULL,
  unit TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE nutrients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE ingredient_nutrients (
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  nutrient_id UUID REFERENCES nutrients(id) ON DELETE CASCADE,
  amount_per_unit NUMERIC(10,4) NOT NULL,
  PRIMARY KEY (ingredient_id, nutrient_id)
);

CREATE TABLE animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE production_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE formulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id),
  stage_id UUID REFERENCES production_stages(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE formulation_ingredients (
  formulation_id UUID REFERENCES formulations(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  inclusion_rate NUMERIC(10,4) NOT NULL,
  PRIMARY KEY (formulation_id, ingredient_id)
);
``` 

## 4. API Design and Endpoints

The backend exposes RESTful endpoints under `/api`. Each endpoint uses JSON and standard HTTP status codes.

### Authentication Endpoints

- **POST /api/auth/sign-up**: Create a new user account.
- **POST /api/auth/sign-in**: Log in and receive a session token.
- **GET  /api/auth/session**: Retrieve current user session.
- **POST /api/auth/sign-out**: Invalidate the current session.

### Ingredient Management

- **GET    /api/ingredients**: List all ingredients for the logged-in user.
- **POST   /api/ingredients**: Create a new ingredient.
- **PUT    /api/ingredients/:id**: Update an existing ingredient.
- **DELETE /api/ingredients/:id**: Remove an ingredient.

### Animal and Production Stage

- **GET /api/animals**: List all animal types.
- **GET /api/animals/:id/stages**: List production stages for one animal.

### Formulation Engine

- **POST /api/formulations**: Run the formulation calculation and save the result.
- **GET  /api/formulations**: List saved formulations.
- **GET  /api/formulations/:id**: Get one formulation’s details.
- **DELETE /api/formulations/:id**: Delete a formulation.

Each endpoint checks the user’s session token, retrieves data via Drizzle ORM, and returns JSON responses.

## 5. Hosting Solutions

### Backend Hosting

- **Vercel**: The Next.js app (including API routes) is deployed to Vercel as serverless functions. Benefits:
  - Automatic scaling under load
  - Global CDN for static assets
  - Built-in HTTPS support
  - Zero-configuration deployments

- **Docker**: Provided for local development and CI pipelines to ensure consistency across environments.

### Database and Auth

- **Supabase** hosts the PostgreSQL database and handles authentication. Benefits:
  - Managed backups and replication
  - Built-in authentication with email/password and OAuth
  - Row-Level Security (RLS) policies

## 6. Infrastructure Components

- **Load Balancing**: Vercel automatically routes traffic to the nearest edge location.
- **CDN**: Static assets and serverless function responses are cached on Vercel’s CDN.
- **Caching**:
  - Next.js ISR for static pages
  - HTTP cache headers for API responses
- **Connection Pooling**: Supabase manages database connections behind the scenes.
- **Logging**: Vercel logs for function invocations; additional logs can be sent to services like Sentry.

## 7. Security Measures

- **Transport Encryption (TLS)**: HTTPS enforced by Vercel and Supabase.
- **Authentication**: Better Auth library with Supabase JWTs.
- **Authorization**:
  - Role-based access with user_profiles.role
  - Supabase Row-Level Security (RLS) to limit data access.
- **Secrets Management**: Environment variables (e.g., `SUPABASE_URL`, `SUPABASE_KEY`) stored securely in Vercel’s dashboard.
- **Data Encryption at Rest**: Handled by Supabase for the PostgreSQL database.

## 8. Monitoring and Maintenance

- **Performance Monitoring**:
  - Vercel Analytics for real-time traffic and latency insights.
  - Supabase dashboard for database performance metrics.
- **Error Tracking**: Integrate Sentry (or similar) with Next.js to capture exceptions.
- **Backups and Recovery**: Supabase automated backups with point-in-time recovery.
- **Schema Migrations**: Drizzle Kit for versioned migrations.
- **CI/CD Pipeline**:
  - GitHub Actions (or Vercel’s built-in) runs tests, builds Docker images, and deploys on each merge to `main`.
- **Regular Maintenance**: Quarterly dependency updates, security audits, and performance reviews.

## 9. Conclusion and Overall Backend Summary

This backend structure delivers a solid, scalable, and maintainable foundation for the **"Bangun Gadogado"** application. By leveraging Next.js serverless functions, Supabase’s managed database and auth, and a Clean Architecture with Drizzle ORM and TypeScript, we ensure:

- **Scalability**: Automatic scaling and global edge CDN.
- **Maintainability**: Modular code, strong typing, and clear separation of concerns.
- **Performance**: Fast page loads (SSR/ISR), optimized database queries, and caching.
- **Security**: HTTPS, JWT-based auth, RLS, and encrypted storage.

Unique aspects include the ready-to-go formulation engine pattern in `/lib`, the repository abstraction for easy data layer swaps, and a complete CI/CD and monitoring setup. This backend meets the project’s goals and provides a user-friendly, reliable platform for farmers, nutritionists, and feed producers to formulate optimal animal feed recipes.