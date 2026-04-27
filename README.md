# AstroVision

**AI-Powered Multi-Modal Astrophysics Research Platform**

A research platform for galaxy classification, temporal analysis, and astronomical discovery — combining visual language models (Kimi K2), domain-specific LLMs (AstroSage), blind plate-solving (Astrometry.net), archival image comparison (SkyView), and catalog cross-referencing (SIMBAD/NED) into a single interactive pipeline.

## Architecture

```
astrovision/
├── packages/
│   ├── client/      → React 19 + Vite + TypeScript + Tailwind
│   ├── server/      → Express + TypeScript API
│   └── pipeline/    → Shared scientific analysis logic
├── turbo.json       → Turborepo task runner
└── supabase-schema.sql → Database schema
```

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS      |
| Backend    | Express, TypeScript, SSE streaming             |
| Database   | Supabase (Postgres + Auth + Storage)          |
| AI Models  | Kimi K2.5 (VLM), AstroSage (LLM), Zoobot     |
| Astronomy  | Astrometry.net, SkyView, SIMBAD TAP, NED API |
| Monorepo   | pnpm workspaces + Turborepo                   |

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 9

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment file and fill in your keys
cp .env.example .env

# Run the Supabase schema (paste into Supabase SQL editor)
# See: supabase-schema.sql

# Start development servers
pnpm dev
```

### Individual packages

```bash
pnpm dev:client    # Vite dev server on :5173
pnpm dev:server    # Express API on :3001
```

## Environment Variables

| Variable              | Required | Description                          |
|-----------------------|----------|--------------------------------------|
| HF_API_KEY            | Yes      | HuggingFace API key                  |
| ASTROMETRY_API_KEY    | Yes      | Astrometry.net API key               |
| SUPABASE_URL          | Yes      | Supabase project URL                 |
| SUPABASE_SERVICE_KEY  | Yes      | Supabase service role key            |
| SUPABASE_ANON_KEY     | Yes      | Supabase anonymous key (client)      |
| VITE_API_URL          | No       | API URL for client (default: proxy)  |

## Pipeline Overview

```
Image Upload
    │
    ├──→ Kimi K2 (VLM)           → Triage + Morphology + Annotations
    │                                     │
    ├──→ Astrometry.net          → RA/Dec coordinates
    │         │                           │
    │         ├──→ SkyView       → Historical archival images
    │         ├──→ SIMBAD/NED    → Catalog cross-reference
    │         └──→ Kimi K2       → Visual comparison (new vs archive)
    │                                     │
    └──→ AstroSage (LLM)        → Synthesis + Hypotheses + Score
                                          │
                                   Discovery Report
```

## Build Sessions

- **Session 0** ✅ Foundation — monorepo, routing, design system, DB schema
- **Session 1** — Core AI chat (AstroSage conversational interface)
- **Session 2** — Image upload + Kimi K2 multimodal analysis
- **Session 3** — Astrometry + SkyView + historical comparison
- **Session 4** — Visual comparison + AstroSage synthesis
- **Session 5** — Catalog cross-referencing + discovery scoring
- **Session 6** — Observation ledger + user workspace
- **Session 7** — Explorable galaxy feed
- **Session 8** — Community + peer verification
- **Session 9** — Interactive follow-up chat
- **Session 10** — Annotation + overlay system
- **Session 11** — Authentication + profiles
- **Session 12** — Polish, benchmarking, paper-ready features

## License

MIT
