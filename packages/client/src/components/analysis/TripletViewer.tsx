import { useState } from "react";
import clsx from "clsx";

interface TripletViewerProps {
  newImageSrc: string;
  referenceImageBase64: string | null;
  diffImageBase64: string | null;
  referenceSurvey?: string;
}

type Tab = "new" | "reference" | "difference" | "blink";

export function TripletViewer({
  newImageSrc,
  referenceImageBase64,
  diffImageBase64,
  referenceSurvey = "DSS2",
}: TripletViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [blinkIndex, setBlinkIndex] = useState(0);

  const hasReference = !!referenceImageBase64;
  const hasDiff = !!diffImageBase64;

  const tabs: { key: Tab; label: string; available: boolean }[] = [
    { key: "new", label: "New", available: true },
    { key: "reference", label: `Reference (${referenceSurvey})`, available: hasReference },
    { key: "difference", label: "Difference", available: hasDiff },
    { key: "blink", label: "Blink", available: hasReference },
  ];

  // Blink mode auto-toggles between new and reference
  const startBlink = () => {
    setActiveTab("blink");
    setBlinkIndex(0);
    const interval = setInterval(() => {
      setBlinkIndex((prev) => (prev + 1) % 2);
    }, 800);
    // Store interval for cleanup
    return () => clearInterval(interval);
  };

  const getDisplaySrc = () => {
    if (activeTab === "new") return newImageSrc;
    if (activeTab === "reference" && referenceImageBase64)
      return `data:image/jpeg;base64,${referenceImageBase64}`;
    if (activeTab === "difference" && diffImageBase64)
      return `data:image/png;base64,${diffImageBase64}`;
    if (activeTab === "blink") {
      return blinkIndex === 0
        ? newImageSrc
        : `data:image/jpeg;base64,${referenceImageBase64}`;
    }
    return newImageSrc;
  };

  return (
    <div className="space-y-2">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            disabled={!tab.available}
            onClick={() => {
              if (tab.key === "blink" && tab.available) startBlink();
              else setActiveTab(tab.key);
            }}
            className={clsx(
              "flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
              activeTab === tab.key
                ? "bg-nebula-600/20 text-nebula-300 border border-nebula-500/20"
                : tab.available
                  ? "text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent"
                  : "text-white/15 cursor-not-allowed border border-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Image display */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-black">
        <img
          src={getDisplaySrc()}
          alt={`${activeTab} view`}
          className="w-full h-auto object-contain transition-opacity duration-300"
        />

        {/* Epoch label */}
        <div className="absolute bottom-2 left-2">
          <span className={clsx(
            "px-2 py-1 rounded-lg text-[10px] font-mono backdrop-blur-sm",
            activeTab === "new" && "bg-nebula-600/40 text-nebula-200",
            activeTab === "reference" && "bg-stellar-500/40 text-stellar-200",
            activeTab === "difference" && "bg-red-500/40 text-red-200",
            activeTab === "blink" && (blinkIndex === 0
              ? "bg-nebula-600/40 text-nebula-200"
              : "bg-stellar-500/40 text-stellar-200"
            ),
          )}>
            {activeTab === "blink"
              ? (blinkIndex === 0 ? "New" : "Reference")
              : activeTab === "new"
                ? "Your Upload"
                : activeTab === "reference"
                  ? `${referenceSurvey} Archive`
                  : "Change Map"
            }
          </span>
        </div>
      </div>
    </div>
  );
}
