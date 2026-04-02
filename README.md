# Express.js JWT Authentication Backend

A clean, production-ready backend built with **Express.js**, **MongoDB**, and **JWT Authentication** following a modular, scalable architecture suitable for real-world systems.

---

## Core Philosophy

> "Every file does one job. Every layer has one responsibility."

The entire request lifecycle follows a strict, predictable path:

```
Request → Route → Middleware (DTO Validation) → Controller → Service → Model → Database
```

No layer skips another. No layer does two jobs. This is what makes the codebase easy to debug, test, and scale.

---

## Tech Stack

| Tool | Role |
|---|---|
| Node.js + Express.js | HTTP server and routing |
| MongoDB + Mongoose | Database and schema modeling |
| bcryptjs | Secure password hashing |
| jsonwebtoken | Access and refresh token generation |
| Joi | Request body validation (DTOs) |
| Nodemailer | Sending emails (verification, password reset) |
| cookie-parser | Reading httpOnly refresh token cookies |
| dotenv | Loading environment variables |

---

## Project Structure

```
project/
├── .env                          # Secrets and config (never commit this)
├── .env.example                  # Template for new developers
├── server.js                     # Entry point — connects DB, starts server
└── src/
    ├── app.js                    # Express app, mounts routes, global error handler
    ├── common/                   # Shared utilities used across all modules
    │   ├── config/
    │   │   ├── db.js             # MongoDB connection logic
    │   │   └── email.js          # Nodemailer setup and email helpers
    │   ├── dto/
    │   │   └── base.dto.js       # Base class all DTOs extend
    │   ├── middleware/
    │   │   └── validate.middleware.js  # Runs DTO validation before controller
    │   └── utils/
    │       ├── api-response.js   # Standardized success response format
    │       ├── api-error.js      # Standardized error class
    │       └── jwt.utils.js      # Token generation, verification, hashing
    └── module/
        └── auth/
            ├── dto/              # One DTO file per operation
            ├── auth.model.js     # Mongoose User schema
            ├── auth.middleware.js # authenticate — guards protected routes
            ├── auth.service.js   # All business logic and DB calls
            ├── auth.controller.js # Thin handlers — receive req, call service, send res
            └── auth.routes.js    # Maps URLs to middleware + controller
```

---

## Why app.js and server.js Are Separate

Most beginners put everything in one file. Separating them gives two important benefits.

**`server.js`** is only responsible for starting the application — it loads environment variables, connects to the database, and then calls `app.listen`. The database is guaranteed to be connected before any request can reach a route.

**`app.js`** is only responsible for configuring Express — it registers middleware like `express.json()` and `cookieParser()`, mounts routers, and sets up the global error handler.

This separation means you can import `app.js` directly into a test file and run tests without spinning up a live server or touching the database.

---

## What is a DTO and Why Does It Exist?

**DTO stands for Data Transfer Object.** It defines the exact shape of data your endpoint is allowed to accept.

### The Problem Without DTOs

Imagine your register endpoint expects `{ name, email, password }`. Without validation, someone using Postman can send:

```
{ name, email, password, role: "admin", isVerified: true }
```

Those extra fields would reach your database unchecked. This is a serious security hole — an attacker could promote themselves to admin on registration.

They could also send incomplete data like `{ name, email }` with no password, which would crash your service with a confusing database error instead of a clean 400 response.

### What a DTO Does

A DTO is a class powered by **Joi** that declares exactly what fields are allowed, what type they must be, and what constraints they must meet. When a request comes in:

- Fields not in the schema are **silently stripped** (`stripUnknown: true`)
- Missing or invalid fields return a **clear 400 error** with all issues listed at once (`abortEarly: false`)
- The controller only ever receives clean, guaranteed-safe data

### The Flow

The `validate.middleware.js` sits between the route and the controller. It receives a DTO class, runs the validation, and either passes the cleaned data forward via `next()` or rejects the request immediately with a `400 Bad Request` before the controller is ever called.

```
POST /register
  → validate(RegisterDto)   ← strips unknown fields, checks all rules
    → controller.register   ← receives only { name, email, password, role }
      → authService.register
```

Every module has its own DTOs in a `dto/` folder: `register.dto.js`, `login.dto.js`, `forgot-password.dto.js`, `reset-password.dto.js`.

---

## How Each Route Works

### POST `/api/auth/register`

The user sends their name, email, and password. The `RegisterDto` validates the shape — name between 2–50 characters, a valid email, password at least 8 characters, role limited to "customer" or "seller".

If validation passes, the service checks whether the email is already registered. If not, it creates the user. The password is **never stored as plain text** — a Mongoose `pre("save")` hook automatically hashes it with bcrypt before it reaches the database.

After creation, a random verification token is generated. The raw token is emailed to the user as a clickable link. Only the **SHA-256 hash** of that token is saved in the database, so even if the database is exposed, the raw token cannot be extracted.

The response returns the new user object with sensitive fields removed.

---

### GET `/api/auth/verify-email/:token`

When the user clicks the link in their email, this route receives the raw token from the URL. The service hashes it again and looks for a matching record in the database. If found, the user's `isVerified` field is set to `true` and the verification token is deleted from their record.

This is a one-time-use token — once used, it is gone.

---

### POST `/api/auth/login`

The user sends their email and password. The `LoginDto` validates the input. The service fetches the user from the database — note that `password` has `select: false` on the schema, so it must be explicitly requested.

The submitted password is compared against the stored bcrypt hash. If it matches, the service checks whether the email has been verified. Unverified users cannot log in.

On success, two tokens are generated:

- **Access token** — short-lived (15 minutes), returned in the JSON response body. The frontend stores this and attaches it as `Authorization: Bearer <token>` on every protected request.
- **Refresh token** — long-lived (7 days), stored in an `httpOnly` cookie. JavaScript on the browser cannot read this cookie, which protects it from XSS attacks. The SHA-256 hash of the refresh token is also saved to the database so it can be invalidated on logout.

---

### GET `/api/auth/me`

A protected route. Before the controller runs, the `authenticate` middleware reads the `Authorization: Bearer <token>` header, verifies the access token's signature and expiry, and confirms the user still exists in the database. If valid, it attaches `{ id, name, email }` to `req.user`.

The controller calls the service with `req.user.id`, and the service returns the full user profile.

> **Common mistake:** Using the refresh token in the Authorization header gives an "invalid signature" error because the two tokens are signed with different secrets.

---

### POST `/api/auth/refresh`

Access tokens expire every 15 minutes. Rather than forcing the user to log in again, the frontend calls this route. The refresh token is automatically sent via the `httpOnly` cookie.

The service verifies the refresh token's signature, fetches the user, and compares the hash of the incoming token against the stored hash in the database. If they match, a new access token is issued and returned.

This hash comparison step means that if a refresh token is stolen and the real user logs out (which deletes the hash from the database), the stolen token becomes useless.

---

### POST `/api/auth/logout`

A protected route — the access token must be present in the header. The service sets the user's `refreshToken` field in the database to `null`, invalidating it permanently. The `httpOnly` cookie is then cleared from the browser.

> **Important caveat:** The access token remains technically valid until it expires (up to 15 minutes) because JWT tokens are stateless — the server holds no record of issued access tokens. This is why a short expiry time matters. The logout flow fully neutralizes the refresh token, which is the long-lived risk.

---

### POST `/api/auth/forgot-password`

The user submits their email. The `ForgotPasswordDto` validates it. The service looks up the email in the database.

**If the email is not found, the response is still `200 OK`.** This is intentional — returning a "no account found" error would let an attacker discover which emails are registered in the system (called user enumeration). The response is always the same regardless.

If the user exists, a reset token is generated. The raw token is emailed as a link. The hash is saved to the database along with an expiry timestamp set to 15 minutes from now.

---

### PUT `/api/auth/reset-password/:token`

The user lands on the reset page, enters a new password, and submits. The `ResetPasswordDto` enforces password strength — minimum 8 characters, at least one uppercase letter, at least one digit.

The service hashes the incoming raw token and queries the database for a user where the token matches AND the expiry is still in the future. This single query handles both the token match and the expiry check atomically.

If found, the password is updated (the `pre("save")` hook re-hashes it automatically), and the token fields are wiped from the database. The token is one-time use — it cannot be replayed.

---

## All Endpoints at a Glance

| Method | Route | Auth | Body / Params |
|---|---|---|---|
| POST | `/api/auth/register` | No | `{ name, email, password }` |
| GET | `/api/auth/verify-email/:token` | No | Token from email link |
| POST | `/api/auth/login` | No | `{ email, password }` |
| GET | `/api/auth/me` | Bearer token | — |
| POST | `/api/auth/refresh` | Cookie | — |
| POST | `/api/auth/logout` | Bearer token | — |
| POST | `/api/auth/forgot-password` | No | `{ email }` |
| PUT | `/api/auth/reset-password/:token` | No | Token in URL, `{ password }` in body |

---

## Security Decisions Explained

**Passwords are hashed, not encrypted.** bcrypt with 12 salt rounds is one-way — even the application cannot recover the original password. This is intentional.

**Tokens are hashed before storage.** Verification and reset tokens stored in the database are always SHA-256 hashes of the real token. The real token only ever exists in the email link. A database leak exposes nothing usable.

**Refresh tokens live in httpOnly cookies.** Unlike localStorage, an httpOnly cookie cannot be read by JavaScript. This is the standard defense against XSS token theft.

**Two different JWT secrets.** The access token and refresh token are signed with completely separate secrets. Compromising one does not compromise the other.

**`select: false` on sensitive fields.** Password, refresh token, and reset token fields are excluded from all queries by default. They must be explicitly opted into. Forgetting to exclude them is not possible by accident.

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `SMTP_HOST` | Email provider host |
| `SMTP_PORT` | Email provider port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM_NAME` | Sender display name |
| `SMTP_FROM_EMAIL` | Sender email address |
| `CLIENT_URL` | Frontend URL (used in email links) |

---

## Quick Start

```bash
npm install
cp .env.example .env    # fill in your values
npm run dev
```