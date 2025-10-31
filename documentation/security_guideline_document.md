# Security Guidelines for `gadogado-feed-formulator`

This document defines security best practices tailored to the `gadogado-feed-formulator` starter template, ensuring a robust foundation for the “Bangun Gadogado” application. It aligns with industry-standard security principles and the project’s specific technologies (Next.js 15, Better Auth, Supabase, Drizzle ORM, Tailwind CSS, Docker, Vercel).

---
## 1. Authentication & Access Control

### 1.1. Strong Authentication
- Leverage **Better Auth** with a secure hashing algorithm (e.g., Argon2 or bcrypt) and unique per-user salts.
- Enforce a password policy: minimum 12 characters, mixed case, numbers, symbols, and reject common/compromised passwords.
- Implement optional **Multi-Factor Authentication (MFA)** (e.g., TOTP, SMS, or WebAuthn) for sensitive roles (nutritionists, administrators).

### 1.2. Session Management
- Generate unpredictable session identifiers and store them in **HttpOnly**, **Secure** cookies with `SameSite=Strict`.
- Enforce both **idle** (e.g., 15 min) and **absolute** (e.g., 8 h) timeouts.
- Provide a server-side logout endpoint that invalidates the session store (e.g., Supabase session) immediately.
- Protect against session fixation by rotating session IDs on privilege level changes.

### 1.3. Role-Based Access Control (RBAC)
- Define roles (e.g., `farmer`, `nutritionist`, `producer`, `admin`) and map them to permission sets.
- Enforce authorization checks on every server-side action and API route.
- Integrate **Supabase Row-Level Security (RLS)** policies to restrict each user to their own records (ingredients, formulations, profiles).

---
## 2. Input Validation & Output Encoding

### 2.1. Prevent Injection Attacks
- Use **Drizzle ORM** parameterized queries for all database interactions; never interpolate user input into raw SQL.
- Sanitize inputs on the server using a schema validation library (e.g., Zod or Joi) for all JSON payloads, form data, and URL parameters.

### 2.2. Mitigate XSS & Template Injection
- Implement context-aware encoding/escaping for any user-supplied text rendered in React components.
- Avoid `dangerouslySetInnerHTML`; if necessary, sanitize HTML via a library like DOMPurify.
- Enforce a strict **Content Security Policy (CSP)** via Next.js headers to restrict script sources.

### 2.3. Secure File Uploads (Future Scope)
- Validate file type, extension, and size on the server.
- Store uploads outside the public webroot or in a dedicated, permission-restricted bucket.
- Scan uploads for malware before processing.
- Use randomized file names and block path traversal.

---
## 3. Data Protection & Privacy

### 3.1. Encryption
- Enforce **HTTPS/TLS 1.2+** for all web and API traffic. Do not allow HTTP.
- Enable **encryption at rest** in your PostgreSQL database (managed by Supabase).
- Encrypt sensitive fields (e.g., PII) in the database where required.

### 3.2. Secrets Management
- Store API keys, database credentials, and private keys in a dedicated secrets store (e.g., Vercel Environment Variables, HashiCorp Vault).
- Avoid hard-coding secrets in source code or plain-text `.env` files.

### 3.3. Data Minimization & Privacy
- Return only the necessary fields in API responses (avoid over-exposing user or ingredient data).
- Mask or redact PII (e.g., email addresses) in logs and error messages.
- Implement user consent and data deletion flows in compliance with GDPR/CCPA if storing personal data.

---
## 4. API & Service Security

### 4.1. Secure Endpoints
- Enforce **JWT** or **session cookie** validation on every API route under `/api` and Server Actions.
- Validate the JWT algorithm and signature, check expiration (`exp`), and reject tokens signed with `none`.

### 4.2. Rate Limiting & Throttling
- Implement request rate limits (e.g., 100 requests per IP per minute) using a middleware (e.g., Upstash Redis + Next.js middleware) to mitigate brute-force and DoS attacks.

### 4.3. CORS Configuration
- Restrict CORS to trusted origins (e.g., `https://your-vercel-domain.com`).
- Preflight responses must include only necessary headers and methods.

### 4.4. API Versioning & HTTP Methods
- Version your API (e.g., `/api/v1/...`) to manage breaking changes.
- Use appropriate HTTP verbs: GET (read), POST (create), PUT/PATCH (update), DELETE (remove).

---
## 5. Web Application Security Hygiene

### 5.1. Security Headers
- Configure in `next.config.js` or middleware:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer-when-downgrade`
  - `Content-Security-Policy` restricting scripts, styles, and frames to trusted sources.

### 5.2. CSRF Protection
- For any state-changing form or API route, implement anti-CSRF tokens (e.g., custom synchronizer token pattern or NextAuth’s built-in CSRF protection).

### 5.3. Secure Cookies
- All cookies must be set with `HttpOnly`, `Secure`, and `SameSite=Strict` or `Lax` where appropriate.

---
## 6. Infrastructure & Configuration

### 6.1. Docker & Deployment
- Use a minimal base image (e.g., `node:18-alpine`) and run the container as a non-root user.
- Copy only necessary files into the image; do not include dev dependencies in production builds.
- Disable debug/log-verbose modes in production.
- In Vercel, avoid exposing environment variables publicly; use Vercel’s encrypted Environment Variables.

### 6.2. Server Hardening
- Ensure the database user has least privileges (e.g., separate read/write users if needed).
- Disable default or unused services.
- Keep the Docker host and your local development environment patched and updated.

---
## 7. Dependency Management

- Maintain lockfiles (`package-lock.json`) and pin direct dependencies to specific, vetted versions.
- Perform regular vulnerability scans using a Software Composition Analysis (SCA) tool (e.g., `npm audit`, Snyk, Dependabot).
- Remove unused or outdated packages to reduce attack surface.

---
## 8. Monitoring, Logging & Incident Response

- Send security-relevant logs (authentication failures, permission denials, rate-limit hits) to a centralized log store (e.g., Datadog, Logflare).
- Mask sensitive data in logs; do not log full JWTs or PII.
- Establish an incident response plan: triage, alerting, mitigation steps, and post-mortem.

---
## 9. Additional Recommendations

- **Testing:** Implement unit tests for authentication flows, integration tests for API/RLS rules, and end-to-end tests (e.g., Playwright).
- **Performance & Security Trade-off:** Leverage Next.js caching (ISR, SWR) while ensuring that you never cache sensitive data publicly.
- **Review & Audits:** Schedule regular security reviews and third-party penetration tests as the application evolves.

---
**By adhering to these guidelines, `gadogado-feed-formulator` will maintain a strong security posture, protecting both the platform and its users throughout development, deployment, and production operations.**