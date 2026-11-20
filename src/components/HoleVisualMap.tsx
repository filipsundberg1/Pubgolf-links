import React from 'react';
import { evaluateGolfHoleScore, type PubHole } from '../utils/golfRules';

interface HoleVisualMapProps {
  hole: PubHole;
  playerSips: number;
}

interface Point {
  x: number;
  y: number;
}

function getGeometryForShape(shape: PubHole['shape']): {
  fairwayPath: string;
  semiRoughPath: string;
  tee: Point;
  waypoints: Point[];
  green: Point;
  bunkers: { cx: number; cy: number; rx: number; ry: number; rot: number }[];
  waterPath?: string;
} {
  switch (shape) {
    case 'dogleg-left':
      return {
        semiRoughPath:
          'M 185 450 C 195 360, 210 265, 165 185 C 135 135, 100 100, 95 75 C 90 45, 135 35, 165 55 C 215 95, 255 165, 245 265 C 235 350, 230 420, 225 450 Z',
        fairwayPath:
          'M 192 442 C 200 360, 205 265, 168 190 C 142 142, 112 108, 108 82 C 105 58, 138 50, 156 68 C 198 105, 238 170, 230 262 C 222 345, 218 415, 216 442 Z',
        tee: { x: 204, y: 432 },
        waypoints: [
          { x: 202, y: 335 },
          { x: 185, y: 235 },
          { x: 152, y: 155 },
        ],
        green: { x: 126, y: 78 },
        bunkers: [
          { cx: 145, cy: 215, rx: 18, ry: 11, rot: -25 },
          { cx: 92, cy: 96, rx: 14, ry: 9, rot: 15 },
          { cx: 162, cy: 70, rx: 13, ry: 8, rot: -15 },
        ],
      };

    case 'dogleg-right':
      return {
        semiRoughPath:
          'M 115 450 C 105 360, 90 265, 135 185 C 165 135, 200 100, 205 75 C 210 45, 165 35, 135 55 C 85 95, 45 165, 55 265 C 65 350, 70 420, 75 450 Z',
        fairwayPath:
          'M 108 442 C 100 360, 95 265, 132 190 C 158 142, 188 108, 192 82 C 195 58, 162 50, 144 68 C 102 105, 62 170, 70 262 C 78 345, 82 415, 84 442 Z',
        tee: { x: 96, y: 432 },
        waypoints: [
          { x: 98, y: 335 },
          { x: 115, y: 235 },
          { x: 148, y: 155 },
        ],
        green: { x: 174, y: 78 },
        bunkers: [
          { cx: 155, cy: 215, rx: 18, ry: 11, rot: 25 },
          { cx: 208, cy: 96, rx: 14, ry: 9, rot: -15 },
        ],
        waterPath:
          'M 165 255 C 195 235, 235 245, 245 285 C 252 320, 220 355, 185 345 C 155 335, 148 275, 165 255 Z',
      };

    case 'island-green':
      return {
        semiRoughPath:
          'M 122 450 C 115 365, 118 265, 128 205 C 138 175, 162 175, 172 205 C 182 265, 185 365, 178 450 Z',
        fairwayPath:
          'M 130 440 C 125 365, 128 270, 136 212 C 142 188, 158 188, 164 212 C 172 270, 175 365, 170 440 Z',
        tee: { x: 150, y: 432 },
        waypoints: [
          { x: 150, y: 325 },
          { x: 150, y: 225 },
        ],
        green: { x: 150, y: 92 },
        bunkers: [
          { cx: 116, cy: 98, rx: 12, ry: 8, rot: -20 },
          { cx: 184, cy: 88, rx: 13, ry: 8, rot: 20 },
        ],
        waterPath:
          'M 75 110 C 75 62, 110 42, 150 42 C 190 42, 225 62, 225 110 C 225 152, 190 168, 150 168 C 110 168, 75 152, 75 110 Z',
      };

    case 'double-dogleg':
      return {
        semiRoughPath:
          'M 135 450 C 110 380, 82 320, 115 245 C 145 180, 195 150, 165 75 C 155 48, 120 48, 115 78 C 105 140, 62 195, 58 265 C 55 335, 95 395, 105 450 Z',
        fairwayPath:
          'M 128 442 C 105 380, 86 320, 118 248 C 146 184, 186 152, 158 80 C 150 58, 126 58, 122 82 C 112 140, 72 195, 68 262 C 65 330, 100 390, 112 442 Z',
        tee: { x: 120, y: 432 },
        waypoints: [
          { x: 96, y: 345 },
          { x: 112, y: 252 },
          { x: 148, y: 168 },
        ],
        green: { x: 140, y: 78 },
        bunkers: [
          { cx: 144, cy: 268, rx: 16, ry: 10, rot: 25 },
          { cx: 102, cy: 165, rx: 15, ry: 9, rot: -20 },
          { cx: 172, cy: 84, rx: 13, ry: 8, rot: 12 },
        ],
      };

    case 'straight':
    default:
      return {
        semiRoughPath:
          'M 120 450 C 112 350, 108 210, 120 80 C 125 45, 175 45, 180 80 C 192 210, 188 350, 180 450 Z',
        fairwayPath:
          'M 128 442 C 122 350, 118 210, 128 86 C 132 58, 168 58, 172 86 C 182 210, 178 350, 172 442 Z',
        tee: { x: 150, y: 432 },
        waypoints: [
          { x: 150, y: 330 },
          { x: 150, y: 230 },
          { x: 150, y: 150 },
        ],
        green: { x: 150, y: 80 },
        bunkers: [
          { cx: 112, cy: 220, rx: 14, ry: 22, rot: 8 },
          { cx: 188, cy: 170, rx: 14, ry: 20, rot: -10 },
          { cx: 116, cy: 88, rx: 14, ry: 10, rot: -18 },
        ],
      };
  }
}

export const HoleVisualMap: React.FC<HoleVisualMapProps> = ({ hole, playerSips }) => {
  const geom = getGeometryForShape(hole.shape);
  const evaluation = evaluateGolfHoleScore(playerSips, hole.par);

  // Build ideal Par shot markers along the fairway
  const parChain: Point[] = [geom.tee];
  if (hole.par === 1) {
    parChain.push(geom.green);
  } else if (hole.par === 2) {
    parChain.push(geom.waypoints[1] || geom.waypoints[0], geom.green);
  } else if (hole.par === 3) {
    parChain.push(geom.waypoints[0], geom.waypoints[1] || geom.waypoints[0], geom.green);
  } else {
    parChain.push(...geom.waypoints.slice(0, Math.min(3, hole.par - 1)), geom.green);
  }

  return (
    <div
      data-testid={`hole-visual-map-${hole.holeNumber}`}
      className="relative overflow-hidden rounded-2xl border border-[#112218]/15 bg-[#0E2419] text-[#F6F4EE] shadow-sm"
    >
      {/* Top Yardage Book Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 font-mono-tabular">
          <span className="font-bold text-[#D4AF37]">HÅL {hole.holeNumber}</span>
          <span aria-hidden="true" className="text-white/30">
            ·
          </span>
          <span>PAR {hole.par}</span>
          <span aria-hidden="true" className="text-white/30">
            ·
          </span>
          <span>{hole.lengthMeters} M</span>
        </div>
        <div className="font-mono-tabular text-white/80">
          {hole.volumeCl} cl {hole.drinkType.toUpperCase()}
        </div>
      </div>

      {/* Architectural SVG Golf Hole Map */}
      <div className="relative flex items-center justify-center p-3">
        <svg
          viewBox="0 0 300 480"
          className="h-[380px] w-full max-w-[290px] select-none"
          role="img"
          aria-label={`Visuell banguide för Hål ${hole.holeNumber}: ${hole.pubName}, Par ${hole.par}`}
        >
          <defs>
            <radialGradient id={`greenGrad-${hole.holeNumber}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#22C55E" />
            </radialGradient>
            <linearGradient id={`fairwayGrad-${hole.holeNumber}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#15803D" />
              <stop offset="50%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <pattern
              id={`mowStripes-${hole.holeNumber}`}
              width="20"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <rect width="20" height="12" fill="rgba(255,255,255,0.04)" />
            </pattern>
          </defs>

          {/* Deep Pine Rough Background */}
          <rect x="0" y="0" width="300" height="480" rx="14" fill="#0B1E14" />

          {/* Subtle Topographic Yardage Arcs */}
          <circle
            cx={geom.green.x}
            cy={geom.green.y}
            r="100"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 5"
          />
          <circle
            cx={geom.green.x}
            cy={geom.green.y}
            r="200"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 5"
          />
          <circle
            cx={geom.green.x}
            cy={geom.green.y}
            r="300"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 5"
          />

          {/* Water Hazard (if present) */}
          {geom.waterPath && (
            <path
              d={geom.waterPath}
              fill="#0369A1"
              fillOpacity="0.65"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          )}

          {/* First Cut Semi-Rough */}
          <path d={geom.semiRoughPath} fill="#14532D" opacity="0.85" />

          {/* Sculpted Fairway */}
          <path d={geom.fairwayPath} fill={`url(#fairwayGrad-${hole.holeNumber})`} />
          <path d={geom.fairwayPath} fill={`url(#mowStripes-${hole.holeNumber})`} />

          {/* Sand Bunkers */}
          {geom.bunkers.map((b, idx) => (
            <ellipse
              key={idx}
              cx={b.cx}
              cy={b.cy}
              rx={b.rx}
              ry={b.ry}
              transform={`rotate(${b.rot} ${b.cx} ${b.cy})`}
              fill="#EAB308"
              fillOpacity="0.82"
              stroke="#A16207"
              strokeWidth="1.5"
            />
          ))}

          {/* Decorative Pine Tree Clusters in Rough */}
          {[
            { x: 42, y: 95 },
            { x: 35, y: 195 },
            { x: 45, y: 310 },
            { x: 255, y: 120 },
            { x: 262, y: 230 },
            { x: 252, y: 360 },
          ].map((tree, idx) => (
            <g key={idx} opacity="0.45">
              <circle cx={tree.x} cy={tree.y} r="14" fill="#052E16" stroke="#166534" strokeWidth="1" />
              <circle cx={tree.x + 8} cy={tree.y + 10} r="10" fill="#052E16" stroke="#166534" strokeWidth="1" />
            </g>
          ))}

          {/* Putting Green Complex */}
          <ellipse
            cx={geom.green.x}
            cy={geom.green.y}
            rx="34"
            ry="26"
            fill={`url(#greenGrad-${hole.holeNumber})`}
            stroke="#86EFAC"
            strokeWidth="1.5"
          />

          {/* Tee Box (Bardisken) */}
          <rect
            x={geom.tee.x - 18}
            y={geom.tee.y - 8}
            width="36"
            height="16"
            rx="4"
            fill="#16A34A"
            stroke="#BBF7D0"
            strokeWidth="1.2"
          />
          <circle cx={geom.tee.x - 8} cy={geom.tee.y} r="2.5" fill="#FDE047" />
          <circle cx={geom.tee.x + 8} cy={geom.tee.y} r="2.5" fill="#FDE047" />

          {/* Ideal Par Line & Klunk Waypoints */}
          {parChain.map((pt, idx) => {
            if (idx === 0) return null;
            const prev = parChain[idx - 1];
            return (
              <g key={idx}>
                <line
                  x1={prev.x}
                  y1={prev.y}
                  x2={pt.x}
                  y2={pt.y}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="1.75"
                  strokeDasharray="4 4"
                />
                {idx < parChain.length - 1 && (
                  <g>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#0B1E14"
                      stroke="#D4AF37"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 3.5}
                      textAnchor="middle"
                      fill="#F6F4EE"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {idx}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Active Player's Recorded Shot Arc when played */}
          {playerSips > 0 && (
            <path
              d={`M ${geom.tee.x} ${geom.tee.y} Q 45 245 ${geom.green.x} ${geom.green.y}`}
              fill="none"
              stroke="#FDE047"
              strokeWidth="2.5"
            />
          )}

          {/* Cup & Championship Flagstick on Green */}
          <circle cx={geom.green.x} cy={geom.green.y} r="4" fill="#0B1E14" stroke="#FFFFFF" strokeWidth="1" />
          <line
            x1={geom.green.x}
            y1={geom.green.y}
            x2={geom.green.x}
            y2={geom.green.y - 34}
            stroke="#FEF08A"
            strokeWidth="2"
          />
          <polygon
            points={`${geom.green.x},${geom.green.y - 34} ${geom.green.x + 22},${geom.green.y - 27} ${geom.green.x},${geom.green.y - 20}`}
            fill="#DC2626"
          />

          {/* Yardage & Callout Labels */}
          <text
            x={geom.tee.x}
            y="466"
            textAnchor="middle"
            fill="#A7F3D0"
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
          >
            TEE · BARDISKEN
          </text>
          <text
            x={geom.green.x}
            y="26"
            textAnchor="middle"
            fill="#FDE047"
            fontSize="10"
            fontWeight="bold"
            fontFamily="JetBrains Mono, monospace"
          >
            GREEN · SISTA KLUNKEN
          </text>
        </svg>
      </div>

      {/* Bottom Legend Bar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/25 px-4 py-2.5 text-xs">
        <span className="text-white/75">
          Hinder: <strong className="font-medium text-amber-300">{hole.hazardTitle}</strong>
        </span>
        <span className="font-mono-tabular font-semibold text-[#FDE047]">
          {playerSips > 0
            ? `${playerSips} klunkar (${evaluation.svLabel})`
            : `Mål: ${hole.par} klunkar`}
        </span>
      </div>
    </div>
  );
};
