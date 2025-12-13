---
trigger: always_on
---

markdown 
# Project Rules 
## Tech Stack - Next.js 15 (App Router) - TypeScript (strict mode) - Supabase (PostgreSQL + Auth) - Tailwind CSS - Shadcn/UI components - Render (deployment) 
## Code Standards - Never use `any` type - use proper TypeScript types from types/database.ts - All database queries use Supabase client from lib/supabase/ - Use Shadcn components for all UI elements - Follow the File-System Routing convention: app/[route]/page.tsx - All forms use Zod validation - Always handle loading and error states - Use the API helpers from lib/api/ for data fetching - Follow the color scheme: dark theme with blue accents 
## Database Rules - Never modify the auth.users table directly - All manufacturing order changes must update stock ledger - RLS policies must be respected - Use transactions for multi-table operations 
.agent/workflows/deploy.md 
