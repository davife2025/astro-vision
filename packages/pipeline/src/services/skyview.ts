import type { ArchivalImage, Coordinates } from "../types";

const SKYVIEW_BASE = "https://skyview.gsfc.nasa.gov/cgi-bin/images";

interface SurveyConfig {
  name: string;
  key: string;
  wavelength: "optical" | "infrared" | "ultraviolet" | "radio";
}

const SURVEYS: SurveyConfig[] = [
  { name: "DSS2 Red", key: "dss2r", wavelength: "optical" },
  { name: "SDSS i-band", key: "sdssi", wavelength: "optical" },
  { name: "SDSS g-band", key: "sdssg", wavelength: "optical" },
  { name: "2MASS J-band", key: "2massj", wavelength: "infrared" },
  { name: "2MASS K-band", key: "2massk", wavelength: "infrared" },
  { name: "GALEX Near-UV", key: "galexnuv", wavelength: "ultraviolet" },
  { name: "GALEX Far-UV", key: "galexfuv", wavelength: "ultraviolet" },
];

export class SkyViewService {
  buildImageUrl(
    survey: string,
    coords: Coordinates,
    sizeDeg = 0.15,
    pixels = 600
  ): string {
    return `${SKYVIEW_BASE}?survey=${survey}&position=${coords.ra},${coords.dec}&size=${sizeDeg}&pixels=${pixels}`;
  }

  getArchivalImages(
    coords: Coordinates,
    sizeDeg = 0.15,
    pixels = 600
  ): ArchivalImage[] {
    return SURVEYS.map((survey) => ({
      url: this.buildImageUrl(survey.key, coords, sizeDeg, pixels),
      survey: survey.name,
      wavelength: survey.wavelength,
      epoch: null,
    }));
  }

  getPrimaryOptical(coords: Coordinates, pixels = 600): ArchivalImage {
    // DSS2 has the widest coverage and historical depth
    return {
      url: this.buildImageUrl("dss2r", coords, 0.15, pixels),
      survey: "DSS2 Red",
      wavelength: "optical",
      epoch: null,
    };
  }

  getByWavelength(
    coords: Coordinates,
    wavelength: "optical" | "infrared" | "ultraviolet",
    pixels = 600
  ): ArchivalImage[] {
    return SURVEYS.filter((s) => s.wavelength === wavelength).map((survey) => ({
      url: this.buildImageUrl(survey.key, coords, 0.15, pixels),
      survey: survey.name,
      wavelength: survey.wavelength,
      epoch: null,
    }));
  }
}
