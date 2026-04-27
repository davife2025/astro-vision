import axios from "axios";
import type { Coordinates } from "../types";

const ASTROMETRY_BASE = "http://nova.astrometry.net/api";

export class AstrometryService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async login(): Promise<string> {
    const res = await axios.post(
      `${ASTROMETRY_BASE}/login`,
      `request-json=${JSON.stringify({ apikey: this.apiKey })}`
    );
    if (res.data.status !== "success") {
      throw new Error("Astrometry login failed");
    }
    return res.data.session;
  }

  async uploadImage(session: string, imageBuffer: Buffer): Promise<number> {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("request-json", JSON.stringify({ session, publicly_visible: "n" }));
    form.append("file", imageBuffer, { filename: "observation.jpg" });

    const res = await axios.post(`${ASTROMETRY_BASE}/upload`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (res.data.status !== "success") {
      throw new Error("Astrometry upload failed");
    }
    return res.data.subid;
  }

  async waitForCalibration(
    subId: number,
    maxAttempts = 30,
    intervalMs = 3000,
    onProgress?: (attempt: number, maxAttempts: number) => void
  ): Promise<Coordinates> {
    for (let i = 0; i < maxAttempts; i++) {
      if (onProgress) onProgress(i + 1, maxAttempts);

      const statusRes = await axios.get(`${ASTROMETRY_BASE}/submissions/${subId}`);
      const jobs = statusRes.data.jobs || [];
      const calibrations = statusRes.data.job_calibrations || [];

      if (calibrations.length > 0 && jobs.length > 0) {
        const jobId = jobs[0];
        const calRes = await axios.get(`${ASTROMETRY_BASE}/jobs/${jobId}/calibration/`);
        return {
          ra: calRes.data.ra,
          dec: calRes.data.dec,
          fieldWidth: calRes.data.width_arcsec,
          fieldHeight: calRes.data.height_arcsec,
          orientation: calRes.data.orientation,
          pixscale: calRes.data.pixscale,
        };
      }

      // Check for failure
      if (statusRes.data.processing_finished && calibrations.length === 0) {
        throw new Error("Plate solving failed — image may not contain enough stars");
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error("Astrometry solving timed out");
  }

  async solve(
    imageBuffer: Buffer,
    onProgress?: (attempt: number, maxAttempts: number) => void
  ): Promise<Coordinates> {
    const session = await this.login();
    const subId = await this.uploadImage(session, imageBuffer);
    return this.waitForCalibration(subId, 30, 3000, onProgress);
  }
}
