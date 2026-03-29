# Skillio CRM Frontend

![Angular](https://img.shields.io/badge/ANGULAR-20-red?style=for-the-badge&logo=angular)
![TypeScript](https://img.shields.io/badge/TYPESCRIPT-5.9-blue?style=for-the-badge&logo=typescript)
![RxJS](https://img.shields.io/badge/RXJS-7.8-pink?style=for-the-badge&logo=reactivex)
![Routing](https://img.shields.io/badge/ROUTING-purple?style=for-the-badge)
![Standalone](https://img.shields.io/badge/STANDALONE-green?style=for-the-badge)
![Forms](https://img.shields.io/badge/FORMS-orange?style=for-the-badge)
![Reactive + Template](https://img.shields.io/badge/REACTIVE+TEMPLATE-orange?style=for-the-badge)
![SSR](https://img.shields.io/badge/SSR-teal?style=for-the-badge)
![Angular SSR](https://img.shields.io/badge/ANGULAR_SSR-teal?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/TAILWINDCSS-4.X-cyan?style=for-the-badge&logo=tailwindcss)

> A modern Angular frontend for Skillio CRM with JWT authentication, permission-based RBAC, admin and sales dashboards, CRM workflows, student lifecycle management, payments, invoices, commissions, targets, notifications, and audit logs.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Core Modules](#core-modules)
- [Tech Stack](#tech-stack)
- [Frontend Architecture](#frontend-architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Authentication & Authorization](#authentication--authorization)
- [Screenshots](#screenshots)

---

## Overview

Skillio CRM Frontend is a full-featured Angular 20 application designed for managing student lifecycles, sales pipelines, commissions, invoices, and team targets. It features a robust role-based access control system and a clean, responsive UI built with TailwindCSS.

---

## Features

- 🔐 **JWT Authentication** — Secure login with token-based session management
- 🛡️ **RBAC (Role-Based Access Control)** — Permission-based UI rendering for Admin and Sales roles
- 📊 **Admin Dashboard** — Overview of students, payments, targets, and team performance
- 💼 **Sales Dashboard** — Personal pipeline, commission tracking, and target progress
- 👩‍🎓 **Student Lifecycle Management** — Enrollment, follow-ups, status tracking
- 💰 **Payments & Invoices** — Payment recording, invoice generation and download
- 🏆 **Commission System** — Commission requests, approval workflow, history
- 🎯 **Targets Module** — Monthly/quarterly target setting and tracking
- 🔔 **Notifications** — Real-time commission request notifications
- 📋 **Audit Logs** — Activity tracking for all critical actions

---

## Core Modules

| Module | Description |
|---|---|
| `AuthModule` | Login, JWT handling, route guards |
| `DashboardModule` | Admin & Sales dashboards |
| `StudentsModule` | Student management & lifecycle |
| `PaymentsModule` | Payment recording & tracking |
| `InvoicesModule` | Invoice generation & PDF download |
| `CommissionsModule` | Commission requests & approvals |
| `TargetsModule` | Target setting & progress |
| `NotificationsModule` | Real-time notification system |
| `AuditLogsModule` | System-wide activity logs |
| `UsersModule` | User & role management (Admin only) |

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 20 | Core framework |
| TypeScript | 5.9 | Language |
| RxJS | 7.8 | Reactive programming |
| TailwindCSS | 4.x | Styling |
| Angular Router | — | Navigation & lazy loading |
| Angular Forms | — | Reactive & Template forms |
| Angular SSR | — | Server-side rendering |
| HttpClient | — | REST API integration |
| JWT | — | Authentication |

---

## Frontend Architecture

```
Standalone Components (no NgModules)
         │
         ▼
  Angular Router (Lazy Loading)
         │
         ▼
  Auth Guard (JWT + Role check)
         │
    ┌────┴────┐
    ▼         ▼
 Admin      Sales
Dashboard  Dashboard
    │         │
    └────┬────┘
         ▼
  Shared Services (HTTP, Auth, Notification)
         │
         ▼
  Spring Boot REST API (Backend)
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- Angular CLI >= 17.x
- npm >= 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/JayeshPingale/Skillio-Frontend.git

# Navigate to project
cd Skillio-Frontend/Skillio_Frontend

# Install dependencies
npm install

# Run development server
ng serve
```

App will be available at `http://localhost:4200`

### Build

```bash
# Production build
ng build --configuration production

# SSR build
ng build && ng run Skillio_Frontend:server
```

---

## Project Structure

```
Skillio_Frontend/
├── src/
│   ├── app/
│   │   ├── core/               # Guards, interceptors, services
│   │   ├── shared/             # Shared components, pipes, directives
│   │   ├── features/
│   │   │   ├── auth/           # Login, token management
│   │   │   ├── dashboard/      # Admin & Sales dashboards
│   │   │   ├── students/       # Student lifecycle
│   │   │   ├── payments/       # Payment management
│   │   │   ├── invoices/       # Invoice generation
│   │   │   ├── commissions/    # Commission workflows
│   │   │   ├── targets/        # Target tracking
│   │   │   ├── notifications/  # Notification system
│   │   │   └── audit-logs/     # Audit trail
│   │   ├── app.routes.ts       # App routing
│   │   └── app.config.ts       # App configuration
│   ├── assets/
│   └── environments/
├── angular.json
├── tailwind.config.js
└── package.json
```

---

## API Integration

All API calls go through Angular's `HttpClient` with a base URL configured via environment files.

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

A JWT interceptor automatically attaches the Bearer token to all outgoing requests.

---

## Authentication & Authorization

- On login, JWT token is stored in `localStorage`
- `AuthGuard` protects all routes — redirects to login if token is missing/expired
- `RoleGuard` restricts module access based on user role (`ADMIN` / `SALES`)
- Token refresh is handled automatically via HTTP interceptor

---

## Backend Repository

👉 [Skillio CRM Backend](https://github.com/JayeshPingale/Skillio-Backend)

Built with Spring Boot, Spring Security, JWT + RBAC, and MySQL.

---

## Author

**Jayesh Pingale**  
[GitHub](https://github.com/JayeshPingale)
