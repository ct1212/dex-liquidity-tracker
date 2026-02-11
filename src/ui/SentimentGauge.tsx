import React from "react";
import "./SentimentGauge.css";

export interface SentimentGaugeProps {
  score: number; // 0-100
  label?: string;
  thresholds?: {
    low: number; // default 33
    medium: number; // default 66
  };
  size?: number; // default 200 (pixels)
  showValue?: boolean; // default true
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({
  score,
  label = "Score",
  thresholds = { low: 33, medium: 66 },
  size = 200,
  showValue = true,
}) => {
  // Clamp score to 0-100 range
  const clampedScore = Math.max(0, Math.min(score, 100));

  // Calculate gauge rotation (from -90deg to 90deg for a 180-degree gauge)
  const rotation = -90 + (clampedScore / 100) * 180;

  // Determine color based on score and thresholds
  const getColor = (): string => {
    if (clampedScore < thresholds.low) return "#ef4444"; // red
    if (clampedScore < thresholds.medium) return "#f59e0b"; // orange
    return "#10b981"; // green
  };

  const getLabel = (): string => {
    if (clampedScore < thresholds.low) return "Low";
    if (clampedScore < thresholds.medium) return "Medium";
    return "High";
  };

  const color = getColor();
  const statusLabel = getLabel();

  const radius = size / 2;
  const strokeWidth = size * 0.08;
  const innerRadius = radius - strokeWidth / 2;

  // Calculate arc path for background and foreground
  const startAngle = -90;
  const endAngle = 90;
  const backgroundPath = describeArc(radius, radius, innerRadius, startAngle, endAngle);
  const foregroundPath = describeArc(radius, radius, innerRadius, startAngle, rotation);

  return (
    <div className="sentiment-gauge-container">
      {label && <div className="sentiment-gauge-label">{label}</div>}
      <svg width={size} height={size * 0.65} className="sentiment-gauge-svg">
        {/* Background arc */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Foreground arc (colored) */}
        <path
          d={foregroundPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Center indicator */}
        <circle cx={radius} cy={radius} r={size * 0.03} fill="#6b7280" />

        {/* Needle */}
        <line
          x1={radius}
          y1={radius}
          x2={radius + innerRadius * 0.85 * Math.cos((rotation * Math.PI) / 180)}
          y2={radius + innerRadius * 0.85 * Math.sin((rotation * Math.PI) / 180)}
          stroke="#374151"
          strokeWidth={strokeWidth * 0.2}
          strokeLinecap="round"
        />

        {/* Score text */}
        {showValue && (
          <>
            <text
              x={radius}
              y={radius + size * 0.15}
              textAnchor="middle"
              className="sentiment-gauge-value"
              fontSize={size * 0.15}
              fill="#1f2937"
              fontWeight="bold"
            >
              {Math.round(clampedScore)}
            </text>
            <text
              x={radius}
              y={radius + size * 0.25}
              textAnchor="middle"
              className="sentiment-gauge-status"
              fontSize={size * 0.08}
              fill={color}
              fontWeight="600"
            >
              {statusLabel}
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

/**
 * Helper function to describe an SVG arc path
 */
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

/**
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export default SentimentGauge;
