# Arlanda Taxi · Dispatch Dashboard

Operations dashboard for the Book Arlanda Taxi fleet — bookings, driver operations,
revenue analytics and customer insights. Built on Next.js 16 (App Router) with React 19,
TypeScript, Tailwind CSS v4 and ApexCharts. Booking data is read directly from the
shared Supabase project that backs the customer-facing site (one source of truth).

## Architecture

```
src/
  app/(admin)/          — sidebar-flanked dashboard routes
    page.tsx            — Overview (KPIs, revenue chart, upcoming trips, recent bookings)
    bookings/           — Bookings table + detail pages
    analytics/          — Revenue, peak hours, distance, route analytics
    customers/          — Top customers, repeat customers, frequent destinations
    drivers/            — Live driver status, schedule, daily targets
    calendar/           — Bookings rendered on a FullCalendar grid
    notifications/      — Activity feed derived from booking events
    account/            — Operator + integrations
  components/
    dashboard/          — Reusable: KpiCard, SectionCard, BookingsTable, charts/*, Skeleton
    calendar/           — FullCalendar wrapper that maps Bookings → events
    ui/                 — Inherited TailAdmin atoms (Badge, Modal, Dropdown, Table)
  context/              — Sidebar + Theme providers (client)
  layout/               — AppSidebar, AppHeader, Backdrop, SidebarWidget
  lib/                  — Server-only Supabase client (service role)
  services/             — Booking + analytics + driver + notification queries (server-only)
  types/                — Domain types (Booking, Driver, Notification)
  utils/                — Formatters + CSV exporter (browser-safe)
```

### Data flow

```
form_submissions (jsonb)  ──┐
                            ├──▶ booking_form_snapshots (view)  ──▶  services/bookings.ts (normalize) ──▶ pages
                            │
Stripe / quote / manual ────┘
```

The customer-facing app at `taxi/` writes booking rows into Supabase. This dashboard reads
the `booking_form_snapshots` view (server-only), normalizes the JSONB payload into typed
`Booking` objects in `services/bookings.ts`, then derives every chart, KPI and table from
that one in-memory pass via `services/analytics.ts`.

Drivers and notifications are sourced from `services/drivers.ts` (deterministic mock) and
`services/notifications.ts` (synthesized from booking activity) until dedicated tables
exist — both have stable interfaces that can be swapped to Supabase queries without
touching pages.

## Getting started

```bash
cp .env.local.example .env.local           # then fill in Supabase credentials
npm install
npm run dev
```

The dashboard runs on `http://localhost:3000` by default. Without Supabase credentials
the pages render with empty states (no errors thrown).

## Status workflow

`pending → confirmed → driver_assigned → on_the_way → picked_up → completed`
(plus `cancelled`). Initial status is derived from the customer app's `completion_kind`:

| `completion_kind` | Booking status | Payment status |
| ----------------- | -------------- | -------------- |
| `stripe_paid`     | `confirmed`    | `paid`         |
| `manual_confirm`  | `pending`      | `unpaid`       |
| `quote_request`   | `pending`      | `quote`        |

To wire dispatch transitions into the workflow, add a `status` column to `form_submissions`
(or a side table keyed by `booking_id`) and update `services/bookings.ts` to read it.

## Performance notes

- All heavy data fetching happens in **Server Components**; the booking list is fetched
  once per request and reused across charts/tables (see `getBookings()` cached for 60s).
- Charts (`ApexCharts`) are dynamically imported with `ssr: false` so they never block
  the initial paint and aren't bundled for routes that don't render them.
- `BookingsTable` filters/sorts in-memory using `useDeferredValue` to keep typing snappy
  even at 1k rows; pagination caps DOM size for low-end devices.
- The Supabase client is server-only (`import "server-only"`) — credentials never reach
  the browser bundle.

## Production checklist

Before going live with real customers visiting:

1. Add an authentication layer in front of `/(admin)` — Supabase Auth or Clerk both
   integrate cleanly. Wrap the `(admin)/layout.tsx` to gate access.
2. Replace the mock driver provider with a real Supabase query.
3. Promote the dispatch transitions (`driver_assigned`, `on_the_way`, `picked_up`,
   `completed`, `cancelled`) into the database so the workflow becomes authoritative.
4. Tighten the `unstable_cache` revalidation window or move to tag-based invalidation
   (`revalidateTag('bookings')` on insert/update from the customer app).
