import { Crosshair, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

interface CoordinatesCardProps {
  data: {
    ra: number;
    dec: number;
    fieldWidth?: number;
    fieldHeight?: number;
    orientation?: number;
    pixscale?: number;
  };
}

function formatRA(ra: number): string {
  const hours = ra / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${h}h ${m}m ${s.toFixed(2)}s`;
}

function formatDec(dec: number): string {
  const sign = dec >= 0 ? "+" : "-";
  const absDec = Math.abs(dec);
  const d = Math.floor(absDec);
  const m = Math.floor((absDec - d) * 60);
  const s = ((absDec - d) * 60 - m) * 60;
  return `${sign}${d}° ${m}' ${s.toFixed(1)}"`;
}

export function CoordinatesCard({ data }: CoordinatesCardProps) {
  const [copied, setCopied] = useState(false);

  const coordString = `RA ${data.ra.toFixed(6)}, Dec ${data.dec.toFixed(6)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coordString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simbadUrl = `https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${data.ra}+${data.dec}&CooFrame=FK5&CooEpoch=2000&CooEqui=2000&CooDefinedFrames=none&Radius=2&Radius.unit=arcmin&submit=submit+query`;

  return (
    <div className="glass p-4 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-aurora-500/15 border border-aurora-500/20 flex items-center justify-center">
          <Crosshair className="w-4 h-4 text-aurora-400" />
        </div>
        <div>
          <h3 className="text-xs font-display font-semibold text-white/80">Coordinates (J2000)</h3>
          <p className="text-[10px] text-white/30 font-mono">Astrometry.net plate solution</p>
        </div>
      </div>

      {/* RA / Dec */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="glass-subtle p-2.5 rounded-lg">
          <p className="text-[10px] text-white/30 mb-0.5">Right Ascension</p>
          <p className="text-xs font-mono text-white/80">{formatRA(data.ra)}</p>
          <p className="text-[10px] font-mono text-white/30">{data.ra.toFixed(6)}°</p>
        </div>
        <div className="glass-subtle p-2.5 rounded-lg">
          <p className="text-[10px] text-white/30 mb-0.5">Declination</p>
          <p className="text-xs font-mono text-white/80">{formatDec(data.dec)}</p>
          <p className="text-[10px] font-mono text-white/30">{data.dec.toFixed(6)}°</p>
        </div>
      </div>

      {/* Field metadata */}
      {(data.fieldWidth || data.pixscale) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {data.fieldWidth && (
            <span className="text-[10px] text-white/30 bg-white/[0.03] px-2 py-1 rounded">
              FoV: {(data.fieldWidth / 3600).toFixed(2)}° × {((data.fieldHeight || data.fieldWidth) / 3600).toFixed(2)}°
            </span>
          )}
          {data.pixscale && (
            <span className="text-[10px] text-white/30 bg-white/[0.03] px-2 py-1 rounded">
              Scale: {data.pixscale.toFixed(2)}″/px
            </span>
          )}
          {data.orientation !== undefined && (
            <span className="text-[10px] text-white/30 bg-white/[0.03] px-2 py-1 rounded">
              PA: {data.orientation.toFixed(1)}°
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.03]"
        >
          {copied ? <Check className="w-3 h-3 text-aurora-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy coords"}
        </button>
        <a
          href={simbadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-nebula-400/70 hover:text-nebula-300 transition-colors px-2 py-1 rounded-lg hover:bg-nebula-600/10"
        >
          <ExternalLink className="w-3 h-3" />
          View in SIMBAD
        </a>
      </div>
    </div>
  );
}
