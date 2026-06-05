# Foundry-Hub · Client (Next.js)

The frontend for Foundry-Hub — a premium workspace for interior designers.
Fully standalone: it only needs the API URL (`NEXT_PUBLIC_API_URL`) and never
talks to the database directly.

## Stack

- **Next.js 14** (App Router) · TypeScript
- **Tailwind CSS** with a custom, shadcn-style design system (hand-built primitives)
- **TanStack Query** for data fetching & caching
- **@dnd-kit** for drag-and-drop schedule ordering
- **sonner** toasts · **lucide-react** icons

## Run

```bash
cp .env.example .env        # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:3000
```

Or with Docker (standalone):

```bash
cp .env.example .env
docker compose up -d --build   # http://localhost:3000
```

> Make sure the API (the `server/` app) is running and reachable at
> `NEXT_PUBLIC_API_URL`.

## Routes

| Route                      | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `/login` · `/register`     | Authentication                                     |
| `/forgot-password` · `/reset-password` | Password reset                         |
| `/dashboard`               | Stats + recent projects                            |
| `/projects`                | All projects                                       |
| `/projects/[id]`           | Project: rooms · schedules · details tabs          |
| `/rooms/[id]`              | Products grid · URL import · manual add            |
| `/schedules/[id]`          | Drag-and-drop schedule · PDF export                |
| `/client-view/[projectId]` | Client review portal (approve / reject selections) |

## Design system

The UI primitives live in `src/components/ui` (`button`, `input`, `card`,
`badge`, `dialog`, `misc`). Colors are CSS variables defined in
`src/app/globals.css` and exposed through `tailwind.config.ts`, so theming
(including dark mode) is a single source of truth.
