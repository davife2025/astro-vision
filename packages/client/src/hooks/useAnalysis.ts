import { useState, useCallback, useRef } from "react";
import { runFullAnalysis } from "@/services/api";

export interface Coordinates {
  ra: number;
  dec: number;
  fieldWidth?: number;
  fieldHeight?: number;
  orientation?: number;
  pixscale?: number;
}

export interface AnalysisState {
  id: string | null;
  status: "idle" | "running" | "done" | "error";
  progress: number;
  currentStage: string;
  stageMessage: string;
  imagePreview: string | null;
  imageFile: File | null;

  // Results — simple and focused
  description: string | null;
  classification: string | null;
  coordinates: Coordinates | null;
  historicalImage: string | null;
  diffCount: number | null;
  isAnomaly: boolean;
  visualComparison: string | null;
  astrosageAnalysis: string | null;
  discovery: string | null;

  error: string | null;
  astrometryError: string | null;
}

const INITIAL_STATE: AnalysisState = {
  id: null,
  status: "idle",
  progress: 0,
  currentStage: "",
  stageMessage: "",
  imagePreview: null,
  imageFile: null,
  description: null,
  classification: null,
  coordinates: null,
  historicalImage: null,
  diffCount: null,
  isAnomaly: false,
  visualComparison: null,
  astrosageAnalysis: null,
  discovery: null,
  error: null,
  astrometryError: null,
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

  const runAnalysis = useCallback(async (question?: string) => {
    const file = stateRef.current.imageFile;
    if (!file) return;

    setState((prev) => ({
      ...prev,
      status: "running",
      progress: 0,
      currentStage: "identify",
      stageMessage: "Starting...",
      error: null,
      astrometryError: null,
      description: null,
      classification: null,
      coordinates: null,
      historicalImage: null,
      diffCount: null,
      isAnomaly: false,
      visualComparison: null,
      astrosageAnalysis: null,
      discovery: null,
    }));

    try {
      await runFullAnalysis(file, question || "Analyze this celestial object.", {
        onProgress: (_stage, data) => {
          setState((prev) => ({
            ...prev,
            progress: data.progress ?? prev.progress,
            currentStage: data.stage ?? prev.currentStage,
            stageMessage: data.message ?? prev.stageMessage,
          }));
        },
        onStageResult: (type, data) => {
          setState((prev) => {
            const u: Partial<AnalysisState> = {};
            if (type === "identification") {
              u.description = data.description;
              u.classification = data.classification;
            }
            if (type === "coordinates") u.coordinates = data;
            if (type === "historicalImage") u.historicalImage = data.url;
            if (type === "comparison") {
              u.diffCount = data.diffCount;
              u.isAnomaly = data.isAnomaly;
            }
            if (type === "visualComparison") u.visualComparison = data.text;
            if (type === "astrosageAnalysis") u.astrosageAnalysis = data.text;
            if (type === "astrometryError") u.astrometryError = data.message;
            return { ...prev, ...u };
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
            description: data.description ?? prev.description,
            classification: data.classification ?? prev.classification,
            coordinates: data.coordinates ?? prev.coordinates,
            historicalImage: data.historicalImage ?? prev.historicalImage,
            diffCount: data.diffCount ?? prev.diffCount,
            isAnomaly: data.isAnomaly ?? prev.isAnomaly,
            visualComparison: data.visualComparison ?? prev.visualComparison,
            astrosageAnalysis: data.astrosageAnalysis ?? prev.astrosageAnalysis,
            discovery: data.discovery ?? prev.discovery,
          }));
        },
        onError: (message) => {
          setState((prev) => ({ ...prev, status: "error", error: message }));
        },
      });
    } catch (err) {
      setState((prev) => ({ ...prev, status: "error", error: (err as Error).message }));
    }
  }, []);

  return { state, setImageFile, clearImage, runAnalysis };
}
