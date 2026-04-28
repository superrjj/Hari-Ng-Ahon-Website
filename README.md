# 🚴 Hari ng Ahon — Cycling Race Management System

A modern full-stack cycling race management platform designed for Hari ng Ahon cycling events in Baguio City, Philippines.  
Built with scalability, performance, and user experience in mind using React, TypeScript, Vite, and Supabase.

---

# 📌 Overview

Hari ng Ahon is a web-based platform that streamlines cycling race operations including:

- Rider registration
- Event management
- Online payments
- Race bib generation
- Results publication
- Administrative analytics

The system supports both public cyclists and administrators through secure role-based access.

---

# ✨ Key Features

## 👥 Public & Cyclist Features

- Browse upcoming cycling events
- View event details, race categories, announcements, and results
- Secure cyclist registration and authentication
- Online race registration workflow
- Payment submission integration
- Personalized cyclist dashboard
- Event participation tracking
- Gallery and media viewing

---

## 🛠️ Admin Features

- Admin dashboard with analytics
- Event creation and management
- Rider registration approval
- Participant management
- Payment verification
- Race result management
- User management system
- Revenue and registration monitoring

---

# 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| React + TypeScript | Frontend Framework |
| Vite | Fast Development & Build Tool |
| Tailwind CSS | Modern UI Styling |
| Supabase | Backend-as-a-Service |
| PostgreSQL | Relational Database |
| Supabase Auth | Authentication System |
| Supabase Storage | File Uploads & Media Storage |
| JWT Authentication | Secure Session Handling |
| Cloudflare Pages | Deployment & Hosting |

---

# 📁 Project Structure

```text
src/
│
├── components/     # Reusable UI components
├── pages/          # Application pages
├── layouts/        # Shared layouts
├── routes/         # Route configuration
├── hooks/          # Custom React hooks
├── services/       # API and business logic
├── lib/            # Utility libraries/configs
├── types/          # TypeScript types/interfaces
└── utils/          # Helper functions
```

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
VITE_DATABASE_URL=your_supabase_project_url
VITE_DATABASE_ANON_KEY=your_supabase_anon_key
```

---

# 🗄️ Database Setup

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the provided schema file:

```text
supabase/schema.sql
```

4. Create the following storage bucket:

```text
payment-proofs
```

---

# 🚀 Getting Started

## Install Dependencies

```bash
npm install
```

## Start Development Server

```bash
npm run dev
```

---

# 🔐 Authentication & Security

- JWT-based authentication
- Protected admin and cyclist routes
- Role-based access control
- Secure session handling
- Supabase-powered authentication flow

---

# 📊 System Modules

- Dashboard Management
- Event Management
- Registration Management
- Payment Handling
- Results Management
- User Management
- Announcements
- Gallery Module

---

# 🌐 Deployment

This project is optimized for deployment on:

- Cloudflare Pages
- Vercel
- Netlify

---

# 📄 License

This project is developed for the Hari ng Ahon Cycling Race Management System.

---

# 👨‍💻 Developers

Developed using modern web technologies with a focus on:

- Scalability
- Maintainability
- Performance
- Responsive UI/UX
- Type-safe architecture
