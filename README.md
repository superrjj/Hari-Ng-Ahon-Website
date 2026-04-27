# Hari ng Ahon - Cycling Race Management

Modern full-stack cycling race management platform for Hari ng Ahon (Baguio City), built with React + TypeScript + Vite, Tailwind CSS, and Supabase.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS (dark sporty theme)
- Supabase (PostgreSQL, Auth, Storage)
- JWT-based session handling with role-protected routes
- Cloudflare Pages-ready build

## Features

- Public cyclist pages: home, events, event details, announcements, results, gallery
- Cyclist auth: register/login/logout with form validation
- Cyclist dashboard and race registration flow with payment proof upload
- Admin pages: dashboard, manage events, registrations, results, users
- Type-safe services and reusable shell layout

## Folder Structure

```text
src/
  components/
  pages/
  layouts/
  routes/
  hooks/
  services/
  lib/
  types/
  utils/
```

## Environment Variables

Set these in `.env`:

```bash
VITE_DATABASE_URL=your_supabase_project_url
VITE_DATABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

Run `supabase/schema.sql` in your Supabase SQL editor, then create a storage bucket named `payment-proofs`.

## Run

```bash
npm install
npm run dev
```
