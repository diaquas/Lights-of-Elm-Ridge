# Lights of Elm Ridge

Christmas and Halloween synchronized light display — sequence catalog, mapping tools, and community platform.

## Repository Structure

This is an npm workspaces monorepo:

```
├── src/                          Next.js web app (storefront + tools)
├── packages/
│   ├── xlights-file-gen/         Shared xLights file I/O library
│   └── xwire/                    Wiring diagram generator (scaffold)
├── docs/                         Specs, tickets, strategy, algorithm data
└── data/                         Operational data (show planning, song lists)
```

## Tech Stack

- **Framework:** Next.js 16 with App Router (static export)
- **Language:** TypeScript 5.9 (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (auth, sessions)
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint 9 + Prettier

## Development Workflow

- **`main`** — Production. Always deployable. Deploy target.
- **`dev`** — Integration branch. All feature work merges here first.
- When starting work, branch from or work directly on `dev`.
- PRs target `dev`, not `main`. Merge `dev` → `main` for releases.

## Key Conventions

- All Mod:IQ engine code lives in `src/lib/modiq/`
- All Mod:IQ UI components live in `src/components/modiq/`
- Workspace packages use `@lightsofelmridge/` scope
- Import alias: `@/` resolves to `src/`
- No `console.log` in committed code — use proper error handling
- Components use `"use client"` directive when they need browser APIs

## Troubleshooting Principles

- **Always validate raw vs. final output.** When the user provides raw or intermediate data (e.g., timestamps from an internal pipeline stage), do NOT assume it matches the final processed export. Compare it against the actual final output before drawing conclusions. Flag discrepancies immediately — "wait, let me compare this to the final export" is the right instinct. This applies broadly: any time data passes through processing stages, verify what you're looking at before building on it.
