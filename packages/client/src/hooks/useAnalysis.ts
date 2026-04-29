import { useState, useCallback, useRef } from "react";
import { runFullAnalysis } from "@/services/api";

export interface AnalysisState {
  id: string | null;
  status: "idle" | "running" | "done" | "error";
  progress: number;
  currentStage: string;
  stageMessage: string;
  imagePreview: string | null;
  imageFile: File | null;

  // Results
  imageQuality: any | null;
  morphology: any | null;
  annotations: any[];
  coordinates: any | null;
  catalogMatches: any[];
  archivalImages: any[];
  referenceImage: { base64: string; survey: string; wavelength: string } | null;
  diffImage: { base64: string } | null;
  changeDetection: any | null;
  visualComparison: any | null;
  synthesis: any | null;
  discoveryScore: any | null;
  tier: 1 | 2 | 3;

  error: string | null;
}

const INITIAL_STATE: AnalysisState = {
  id: null,
  status: "idle",
  progress: 0,
  currentStage: "",
  stageMessage: "",
  imagePreview: null,
  imageFile: null,
  imageQuality: null,
  morphology: null,
  annotations: [],
  coordinates: null,
  catalogMatches: [],
  archivalImages: [],
  referenceImage: null,
  diffImage: null,
  changeDetection: null,
  visualComparison: null,
  synthesis: null,
  discoveryScore: null,
  tier: 3,
  error: null,
};

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const setImageFile = useCallback((file: File) => {
    const preview = URL.createObjectURL(file);
    setState((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: preview,
      status: "idle",
      error: null,
    }));
  }, []);

  const clearImage = useCallback(() => {
    if (stateRef.current.imagePreview) {
      URL.revokeObjectURL(stateRef.current.imagePreview);
    }
    setState(INITIAL_STATE);
  }, []);

  const runAnalysis = useCallback(
    async (question?: string) => {
      const file = stateRef.current.imageFile;
      if (!file) return;

      setState((prev) => ({
        ...prev,
        status: "running",
        progress: 0,
        currentStage: "triage",
        stageMessage: "Starting analysis...",
        error: null,
        // Reset results
        imageQuality: null,
        morphology: null,
        annotations: [],
        coordinates: null,
        catalogMatches: [],
        archivalImages: [],
        referenceImage: null,
        diffImage: null,
        changeDetection: null,
        visualComparison: null,
        synthesis: null,
        discoveryScore: null,
        tier: 3,
      }));

      try {
        await runFullAnalysis(file, question || "Analyze this celestial object.", {
          onProgress: (_stage, data) => {
            setState((prev) => ({
              ...prev,
              progress: data.progress || prev.progress,
              currentStage: data.stage || prev.currentStage,
              stageMessage: data.message || prev.stageMessage,
            }));
          },
          onStageResult: (type, data) => {
            // Progressive results — update as each stage completes
            setState((prev) => {
              const updates: Partial<AnalysisState> = {};
              if (type === "imageQuality") updates.imageQuality = data;
              if (type === "morphology") updates.morphology = data;
              if (type === "annotations") updates.annotations = data;
              if (type === "coordinates") updates.coordinates = data;
              if (type === "catalogMatches") updates.catalogMatches = data;
              if (type === "archivalImages") updates.archivalImages = data;
              if (type === "referenceImage") updates.referenceImage = data;
              if (type === "diffImage") updates.diffImage = data;
              if (type === "changeDetection") updates.changeDetection = data;
              if (type === "visualComparison") updates.visualComparison = data;
              if (type === "synthesis") updates.synthesis = data;
              if (type === "discoveryScore") updates.discoveryScore = data;
              return { ...prev, ...updates };
            });
          },
          onResult: (data) => {
            setState((prev) => ({
              ...prev,
              status: "done",
              id: data.id,
              progress: 100,
              currentStage: "complete",
              stageMessage: "Analysis complete",
              tier: data.tier || prev.tier,
              imageQuality: data.imageQuality || prev.imageQuality,
              morphology: data.morphology || prev.morphology,
              annotations: data.annotations || prev.annotations,
              coordinates: data.coordinates || prev.coordinates,
              catalogMatches: data.catalogMatches || prev.catalogMatches,
              archivalImages: data.archivalImages || prev.archivalImages,
              changeDetection: data.changeDetection || prev.changeDetection,
              visualComparison: data.visualComparison || prev.visualComparison,
              synthesis: data.synthesis || prev.synthesis,
              discoveryScore: data.discoveryScore || prev.discoveryScore,
            }));
          },
          onError: (message) => {
            setState((prev) => ({
              ...prev,
              status: "error",
              error: message,
            }));
          },
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: (err as Error).message,
        }));
      }
    },
    []
  );

  return { state, setImageFile, clearImage, runAnalysis };
}
