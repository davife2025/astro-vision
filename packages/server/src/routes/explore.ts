import { Router, Request, Response } from "express";
import axios from "axios";
import { getSupabase } from "../config/supabase";

const router = Router();

// SDSS Image Cutout Service
const SDSS_CUTOUT_BASE = "https://skyserver.sdss.org/dr18/SkyServerWS/ImgCutout/getjpeg";
const SDSS_SQL_BASE = "https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch";

interface GalaxyFeedItem {
  id: string;
  ra: number;
  dec: number;
  imageUrl: string;
  classification: string | null;
  petrosianRadius: number | null;
  redshift: number | null;
  magnitude: number | null;
  source: string;
}

/**
 * GET /api/explore/feed
 * Return a gallery of galaxies from SDSS or the observation ledger
 */
router.get("/feed", async (req: Request, res: Response) => {
  try {
    const { source = "mixed", limit = "24", offset = "0", type } = req.query;
    const items: GalaxyFeedItem[] = [];

    // Pull from observation ledger (high-score observations)
    if (source === "mixed" || source === "ledger") {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("observations")
          .select("id, ra, dec_coord, morphology, discovery_score, image_url")
          .not("image_url", "is", null)
          .order("discovery_score", { ascending: false })
          .limit(Math.min(parseInt(limit as string), 12));

        (data || []).forEach((obs: any) => {
          items.push({
            id: `obs_${obs.id}`,
            ra: obs.ra || 0,
            dec: obs.dec_coord || 0,
            imageUrl: obs.image_url,
            classification: obs.morphology?.classification || null,
            petrosianRadius: null,
            redshift: null,
            magnitude: null,
            source: "ledger",
          });
        });
      } catch {
        // Supabase may not be configured — continue with SDSS
      }
    }

    // Pull from SDSS catalog
    if (source === "mixed" || source === "sdss") {
      const remaining = parseInt(limit as string) - items.length;
      if (remaining > 0) {
        try {
          const sdssItems = await fetchSDSSGalaxies(
            remaining,
            parseInt(offset as string),
            type as string | undefined
          );
          items.push(...sdssItems);
        } catch (err) {
          console.error("SDSS feed error:", err);
        }
      }
    }

    res.json({ success: true, items, total: items.length });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * GET /api/explore/random
 * Return a random set of galaxies for the "discover" experience
 */
router.get("/random", async (_req: Request, res: Response) => {
  try {
    // Random sky positions with known galaxy clusters
    const regions = [
      { ra: 185.0, dec: 12.7, name: "Virgo Cluster" },
      { ra: 194.9, dec: 27.9, name: "Coma Cluster" },
      { ra: 150.1, dec: 2.2, name: "COSMOS Field" },
      { ra: 53.1, dec: -27.8, name: "Fornax Cluster" },
      { ra: 201.3, dec: -43.0, name: "Centaurus Cluster" },
      { ra: 258.1, dec: 64.0, name: "Hercules Cluster" },
    ];

    const region = regions[Math.floor(Math.random() * regions.length)];
    const items = await fetchSDSSGalaxiesNear(region.ra, region.dec, 12);

    res.json({
      success: true,
      region: region.name,
      items,
      total: items.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * GET /api/explore/search
 * Search by coordinates or object name
 */
router.get("/search", async (req: Request, res: Response) => {
  const { q, ra, dec, radius = "0.1" } = req.query;

  try {
    // If coordinates provided directly
    if (ra && dec) {
      const items = await fetchSDSSGalaxiesNear(
        parseFloat(ra as string),
        parseFloat(dec as string),
        12,
        parseFloat(radius as string)
      );
      return res.json({ success: true, items, total: items.length });
    }

    // If text query — try resolving via SIMBAD name resolver
    if (q) {
      const resolved = await resolveObjectName(q as string);
      if (resolved) {
        const items = await fetchSDSSGalaxiesNear(resolved.ra, resolved.dec, 12, 0.15);
        return res.json({
          success: true,
          resolved: { name: q, ra: resolved.ra, dec: resolved.dec },
          items,
          total: items.length,
        });
      }
      return res.json({ success: true, items: [], total: 0, message: "Object not found" });
    }

    res.status(400).json({ error: "Provide q (name) or ra+dec (coordinates)" });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSDSSImageUrl(ra: number, dec: number, scale = 0.3, width = 256, height = 256): string {
  return `${SDSS_CUTOUT_BASE}?ra=${ra}&dec=${dec}&scale=${scale}&width=${width}&height=${height}`;
}

async function fetchSDSSGalaxies(
  limit: number,
  offset: number,
  type?: string
): Promise<GalaxyFeedItem[]> {
  // Use a pre-defined set of interesting galaxies from known catalogs
  // These are well-studied galaxies visible in SDSS with diverse morphologies
  const CURATED_GALAXIES = [
    { ra: 148.888, dec: 69.065, name: "M81", type: "Spiral" },
    { ra: 210.802, dec: 54.349, name: "M101", type: "Spiral" },
    { ra: 13.158, dec: 15.077, name: "M74", type: "Spiral" },
    { ra: 10.685, dec: 41.269, name: "M31", type: "Spiral" },
    { ra: 23.462, dec: 30.660, name: "M33", type: "Spiral" },
    { ra: 186.265, dec: 18.191, name: "M87", type: "Elliptical" },
    { ra: 187.706, dec: 12.391, name: "M49", type: "Elliptical" },
    { ra: 190.510, dec: 11.553, name: "M59", type: "Elliptical" },
    { ra: 185.029, dec: 29.281, name: "NGC 4321", type: "Spiral" },
    { ra: 186.506, dec: 12.887, name: "NGC 4486A", type: "Elliptical" },
    { ra: 184.740, dec: 47.304, name: "M106", type: "Spiral" },
    { ra: 202.469, dec: 47.195, name: "M51", type: "Spiral" },
    { ra: 174.513, dec: 21.009, name: "NGC 3623", type: "Spiral" },
    { ra: 189.431, dec: 11.646, name: "M60", type: "Elliptical" },
    { ra: 178.632, dec: 6.720, name: "NGC 3992", type: "Spiral" },
    { ra: 192.720, dec: 21.683, name: "NGC 4725", type: "Spiral" },
    { ra: 191.133, dec: 14.420, name: "NGC 4689", type: "Spiral" },
    { ra: 185.729, dec: 15.823, name: "NGC 4459", type: "Lenticular" },
    { ra: 170.063, dec: 13.064, name: "NGC 3521", type: "Spiral" },
    { ra: 204.254, dec: -29.865, name: "NGC 5128", type: "Peculiar" },
    { ra: 201.365, dec: -43.019, name: "NGC 4945", type: "Spiral" },
    { ra: 187.446, dec: 8.000, name: "NGC 4535", type: "Spiral" },
    { ra: 185.445, dec: 4.474, name: "NGC 4430", type: "Spiral" },
    { ra: 186.350, dec: 13.053, name: "NGC 4478", type: "Elliptical" },
  ];

  let filtered = CURATED_GALAXIES;
  if (type) {
    filtered = filtered.filter(g => g.type.toLowerCase() === type.toLowerCase());
  }

  return filtered.slice(offset, offset + limit).map((g, i) => ({
    id: `sdss_${g.name.replace(/\s/g, "_")}_${i}`,
    ra: g.ra,
    dec: g.dec,
    imageUrl: buildSDSSImageUrl(g.ra, g.dec, 0.2, 300, 300),
    classification: g.type,
    petrosianRadius: null,
    redshift: null,
    magnitude: null,
    source: "sdss",
  }));
}

async function fetchSDSSGalaxiesNear(
  ra: number,
  dec: number,
  limit: number,
  radiusDeg = 0.1
): Promise<GalaxyFeedItem[]> {
  // Use SkyView for any coordinate — works across the entire sky
  const items: GalaxyFeedItem[] = [];

  // Generate a grid of positions around the center
  const steps = Math.ceil(Math.sqrt(limit));
  const step = (radiusDeg * 2) / steps;

  for (let i = 0; i < steps && items.length < limit; i++) {
    for (let j = 0; j < steps && items.length < limit; j++) {
      const r = ra - radiusDeg + i * step + step / 2;
      const d = dec - radiusDeg + j * step + step / 2;
      items.push({
        id: `sky_${r.toFixed(4)}_${d.toFixed(4)}`,
        ra: r,
        dec: d,
        imageUrl: buildSDSSImageUrl(r, d, 0.3, 256, 256),
        classification: null,
        petrosianRadius: null,
        redshift: null,
        magnitude: null,
        source: "sdss",
      });
    }
  }

  return items.slice(0, limit);
}

async function resolveObjectName(name: string): Promise<{ ra: number; dec: number } | null> {
  try {
    const res = await axios.get(
      `https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-ox/S?${encodeURIComponent(name)}`,
      { timeout: 8000, responseType: "text" }
    );

    const text = res.data as string;
    const raMatch = text.match(/<jradeg>([\d.]+)<\/jradeg>/);
    const decMatch = text.match(/<jdedeg>([-\d.]+)<\/jdedeg>/);

    if (raMatch && decMatch) {
      return {
        ra: parseFloat(raMatch[1]),
        dec: parseFloat(decMatch[1]),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default router;
