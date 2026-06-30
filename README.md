# AstroVision

**An Integrated Multimodal AI Framework for Galaxy Observation and Discovery**

AstroVision is a web-based research platform that lets a user upload an astronomical image and receive a complete, explained investigation: what the object is, where it is in the sky, how it compares to a historical image of the same region, and whether the comparison suggests something worth further investigation.

---

## What It Does

```
Upload an image
      │
      ▼
1. Identification & Classification — a vision-language model looks at the
   image and describes what it is (e.g. "Spiral Galaxy") in plain language
      │
      ▼
2. Astrometry — Astrometry.net resolves the image's sky coordinates
   (Right Ascension / Declination) by matching star patterns, with no
   metadata required from the user
      │
      ▼
3. Historical Retrieval — SkyView fetches an archival image of the exact
   same coordinates, taken at an earlier point in time
      │
      ▼
4. Comparison — the two images are compared two ways:
     • pixel-level difference scoring
     • the vision-language model directly comparing the two images and
       describing what changed, and whether it looks like a real change
       or just an imaging artifact
      │
      ▼
5. AstroSage Synthesis — a domain-specialized astrophysics language model
   takes everything gathered above and writes a proper explanatory
   analysis: what the object is, what its features mean, what the
   comparison shows scientifically, and whether it could be a discovery
      │
      ▼
6. Result — saved to the user's personal observation ledger
```

Beyond the core pipeline, the platform includes:

- **AstroSage Chat** — a general astrophysics Q&A interface, independent of image analysis
- **Explore** — a browsable gallery of galaxies from public survey data; clicking one runs it straight through the pipeline
- **Observatory** — a personal, permanent record of every image a user has analyzed
- **Community** — posts, comments, and peer confidence-rating on flagged observations
- **Authentication** — sign-up/sign-in so usage can be tracked per user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Server-Sent Events |
| Database / Auth / Storage | Supabase (PostgreSQL) |
| Vision-language model | Accessed via HuggingFace Inference Providers |
| Domain language model | AstroSage (AstroMLab) |
| Astrometric resolution | Astrometry.net API |
| Archival imagery | SkyView (NASA Goddard) |
| Deployment | Vercel (frontend) + Render (backend) |

> **Note on the VLM provider:** the pipeline calls a vision-language model through HuggingFace's Inference Providers service. The specific model/provider pairing is configured in `packages/server/src/config/index.ts` and may need to be updated if a provider stops serving a given model — see Troubleshooting below.

---

## Project Structure

```
astrovision/
├── packages/
│   ├── client/      → React frontend
│   ├── server/      → Express API + pipeline orchestration
│   └── pipeline/    → Shared types and astronomical service clients
├── supabase-schema.sql
├── render.yaml
└── .env.example
```

---

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 9
- A HuggingFace API key
- An Astrometry.net API key
- A Supabase project

### Setup

```bash
pnpm install
cp .env.example .env
# fill in HF_API_KEY, ASTROMETRY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, etc.

# Run the schema in your Supabase project's SQL editor:
# supabase-schema.sql

pnpm dev
```

This starts both the client (`http://localhost:5173`) and the server (`http://localhost:3001`).

### Individually

```bash
pnpm dev:client
pnpm dev:server
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HF_API_KEY` | Yes | HuggingFace API key |
| `ASTROMETRY_API_KEY` | Yes | Astrometry.net API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (server only) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key (server) |
| `CORS_ORIGINS` | No | Comma-separated list of allowed frontend origins |
| `VITE_API_URL` | No | Backend URL for the client (defaults to local proxy) |
| `VITE_SUPABASE_URL` | Yes (client) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (client) | Supabase anon key (client-side auth) |

---

## Deployment

See `DEPLOYMENT-GUIDE.md` for the full Vercel + Render + Supabase walkthrough, including CORS configuration and troubleshooting.

Quick version:
- **Backend → Render**, using `render.yaml`
- **Frontend → Vercel**, root directory set to `packages/client`, using `packages/client/vercel.json` for SPA routing

---

## Known Limitations

This is documented honestly because it matters for how results should be interpreted:

- **No formal image registration.** The pixel-level comparison resizes and normalizes both images but does not perform star-pattern alignment before differencing. This means scale, rotation, or framing differences between the uploaded image and the archival image can produce an elevated difference score that is not a real astronomical change. The vision-language model's qualitative comparison is used as a partial check against this, but it is not a substitute for proper image registration.
- **No PSF matching.** Professional difference imaging additionally matches the point-spread function of the two images before subtraction; this platform does not implement that step.
- **No formal accuracy benchmark.** Classification and comparison behavior has been checked informally against a small number of known objects, not validated against a labeled ground-truth dataset such as Galaxy Zoo's consensus classifications.
- **Single VLM provider.** The pipeline depends on one model being available through one provider at a time. If that provider stops serving the configured model, the pipeline will fail until the configuration is updated (see Troubleshooting).
- **Single historical epoch.** The platform compares against one archival image, not a multi-epoch timeline.

These limitations, and recommended next steps for each, are discussed in the accompanying dissertation, Chapter Five.

---

## Troubleshooting

**"Model not supported by provider [x]"**
The VLM model ID or provider configured in `packages/server/src/config/index.ts` is no longer being served by that provider on HuggingFace. Check HuggingFace's Inference Providers documentation for a currently supported VLM and update the `vlm` field in the config, along with the request URL in `packages/server/src/services/vlm.ts` if the endpoint path has also changed.

**Pipeline hangs after upload**
If the image was sent via URL (e.g. from the Explore tab) and the request hangs, confirm the server is fetching the image itself rather than the browser — browsers cannot fetch images cross-origin from sources like SkyView/SDSS without CORS headers, which those services do not provide.

**Astrometry never resolves**
The uploaded image likely does not contain enough visible stars for blind plate-solving. This is expected for close-up images of a single galaxy. The platform will still return the identification result and inform the user that coordinate-dependent comparison was skipped.

**CORS errors in the browser console**
Set `CORS_ORIGINS` on the backend to include your frontend's deployed URL, comma-separated if there are multiple.

---

## License

MIT