import axios from "axios";
import type { CatalogMatch, Coordinates } from "../types";

const SIMBAD_TAP = "https://simbad.u-strasbg.fr/simbad/sim-tap/sync";
const NED_API = "https://ned.ipac.caltech.edu/srs/ObjectLookup";

export class CatalogService {
  /**
   * Query SIMBAD for objects within a cone search radius
   */
  async querySIMBAD(
    coords: Coordinates,
    radiusArcmin = 1.0
  ): Promise<CatalogMatch[]> {
    try {
      const query = `
        SELECT TOP 10 
          main_id, otype_longname, ra, dec, rvz_redshift
        FROM basic
        WHERE CONTAINS(
          POINT('ICRS', ra, dec),
          CIRCLE('ICRS', ${coords.ra}, ${coords.dec}, ${radiusArcmin / 60})
        ) = 1
        ORDER BY DISTANCE(
          POINT('ICRS', ra, dec),
          POINT('ICRS', ${coords.ra}, ${coords.dec})
        )
      `.trim();

      const res = await axios.get(SIMBAD_TAP, {
        params: {
          request: "doQuery",
          lang: "adql",
          format: "json",
          query,
        },
        timeout: 15000,
      });

      const rows = res.data?.data || [];
      return rows.map((row: any[]) => ({
        source: "SIMBAD" as const,
        objectName: row[0] || null,
        objectType: row[1] || null,
        distance: null, // could compute from ra/dec diff
        redshift: row[4] || null,
        knownProperties: {
          ra: String(row[2]),
          dec: String(row[3]),
        },
      }));
    } catch (err) {
      console.error("SIMBAD query failed:", (err as Error).message);
      return [];
    }
  }

  /**
   * Query NED for objects near the given coordinates
   */
  async queryNED(
    coords: Coordinates,
    radiusArcmin = 1.0
  ): Promise<CatalogMatch[]> {
    try {
      const res = await axios.get(
        `https://ned.ipac.caltech.edu/cgi-bin/objsearch`,
        {
          params: {
            search_type: "Near Position Search",
            in_csys: "Equatorial",
            in_equinox: "J2000.0",
            lon: `${coords.ra}d`,
            lat: `${coords.dec}d`,
            radius: radiusArcmin,
            of: "json_short",
          },
          timeout: 15000,
        }
      );

      // NED returns varying formats — parse defensively
      const results = Array.isArray(res.data) ? res.data : [];
      return results.slice(0, 10).map((obj: any) => ({
        source: "NED" as const,
        objectName: obj.prefname || obj.objname || null,
        objectType: obj.objtype || null,
        distance: null,
        redshift: obj.z || null,
        knownProperties: obj,
      }));
    } catch (err) {
      console.error("NED query failed:", (err as Error).message);
      return [];
    }
  }

  /**
   * Query both SIMBAD and NED in parallel
   */
  async crossReference(
    coords: Coordinates,
    radiusArcmin = 1.0
  ): Promise<CatalogMatch[]> {
    const [simbad, ned] = await Promise.all([
      this.querySIMBAD(coords, radiusArcmin),
      this.queryNED(coords, radiusArcmin),
    ]);
    return [...simbad, ...ned];
  }

  /**
   * Check if an object at these coordinates is uncatalogued
   */
  async isUncatalogued(
    coords: Coordinates,
    radiusArcmin = 0.5
  ): Promise<boolean> {
    const matches = await this.crossReference(coords, radiusArcmin);
    return matches.length === 0;
  }
}
