# VintraStudio - Live Chat Platform

## Overview
VintraStudio is a Next.js application for building and deploying intelligent chatbots. It includes an admin panel, chat widget system, authentication via Supabase, and payment processing via Stripe.

## Project Architecture
- **Framework**: Next.js 16 with App Router (Turbopack)
- **UI**: Tailwind CSS, Radix UI components, shadcn/ui
- **Auth**: Supabase authentication
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Language**: TypeScript

## Project Structure
- `app/` - Next.js App Router pages and API routes
  - `admin/` - Admin dashboard pages
  - `api/` - API routes (chat, admin, widget)
  - `auth/` - Authentication pages (login, sign-up)
  - `checkout/` - Stripe checkout pages
  - `pricing/` - Pricing page
  - `widget-preview/` - Chat widget preview
- `components/` - React components
  - `ui/` - shadcn/ui base components
  - `admin/` - Admin panel components
- `lib/` - Utility libraries
  - `supabase/` - Supabase client configurations (client, server, public)
  - `stripe.ts` - Stripe client
  - `products.ts` - Product definitions
  - `utils.ts` - General utilities

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key

## Development
- Dev server: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Start: `npm run start`

## Recent Changes
- Configured for Replit environment (port 5000, allowed all dev origins)
