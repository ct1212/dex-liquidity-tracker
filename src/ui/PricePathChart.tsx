import React from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import "./PricePathChart.css";

export interface PricePoint {
  date: Date;
  price: number;
  high: number;
  low: number;
}

export interface PricePath {
  scenario: "bullish" | "base" | "bearish";
  confidence: number;
  pricePoints: PricePoint[];
  expectedReturn: number;
  volatility: number;
  probability: number;
}

export interface PricePathChartProps {
  paths: PricePath[];
  currentPrice: number;
  title?: string;
  height?: number;
  showConfidenceIntervals?: boolean;
}

const PricePathChart: React.FC<PricePathChartProps> = ({
  paths,
  currentPrice,
  title,
  height = 400,
  showConfidenceIntervals = true,
}) => {
  if (!paths || paths.length === 0) {
    return (
      <div className="price-path-chart-empty">
        <p>No price path data available</p>
      </div>
    );
  }

  // Transform data for Recharts
  // We need to merge all paths into a single timeline
  const allDates = new Set<string>();

  paths.forEach((path) => {
    path.pricePoints.forEach((point) => {
      const date = point.date instanceof Date ? point.date : new Date(point.date);
      allDates.add(date.toISOString());
    });
  });

  const sortedDates = Array.from(allDates).sort();

  const chartData = sortedDates.map((dateStr) => {
    const date = new Date(dateStr);
    const dataPoint: Record<string, number | string> = {
      date: date.toLocaleDateString(),
      timestamp: date.getTime(),
    };

    paths.forEach((path) => {
      const point = path.pricePoints.find((p) => {
        const pDate = p.date instanceof Date ? p.date : new Date(p.date);
        return pDate.toISOString() === dateStr;
      });

      if (point) {
        dataPoint[`${path.scenario}Price`] = point.price;
        if (showConfidenceIntervals) {
          dataPoint[`${path.scenario}High`] = point.high;
          dataPoint[`${path.scenario}Low`] = point.low;
        }
      }
    });

    return dataPoint;
  });

  // Define colors for each scenario
  const colors = {
    bullish: "#10b981", // green
    base: "#3b82f6", // blue
    bearish: "#ef4444", // red
  };

  // Find bullish, base, and bearish paths
  const bullishPath = paths.find((p) => p.scenario === "bullish");
  const basePath = paths.find((p) => p.scenario === "base");
  const bearishPath = paths.find((p) => p.scenario === "bearish");

  return (
    <div className="price-path-chart-container">
      {title && <h4 className="price-path-chart-title">{title}</h4>}

      <div className="price-path-legend">
        {bullishPath && (
          <div className="path-info" style={{ color: colors.bullish }}>
            <strong>Bullish:</strong> {bullishPath.expectedReturn.toFixed(2)}% (Prob:{" "}
            {(bullishPath.probability * 100).toFixed(0)}%)
          </div>
        )}
        {basePath && (
          <div className="path-info" style={{ color: colors.base }}>
            <strong>Base:</strong> {basePath.expectedReturn.toFixed(2)}% (Prob:{" "}
            {(basePath.probability * 100).toFixed(0)}%)
          </div>
        )}
        {bearishPath && (
          <div className="path-info" style={{ color: colors.bearish }}>
            <strong>Bearish:</strong> {bearishPath.expectedReturn.toFixed(2)}% (Prob:{" "}
            {(bearishPath.probability * 100).toFixed(0)}%)
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            label={{ value: "Date", position: "insideBottom", offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: "Price ($)", angle: -90, position: "insideLeft" }}
            tick={{ fontSize: 12 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                return (
                  <div className="custom-tooltip">
                    <p className="label">{payload[0].payload.date}</p>
                    {payload.map((entry, index) => {
                      if (
                        entry.name &&
                        !entry.name.includes("High") &&
                        !entry.name.includes("Low")
                      ) {
                        return (
                          <p key={index} style={{ color: entry.color }}>
                            {entry.name}: ${Number(entry.value).toFixed(2)}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />

          {/* Confidence intervals as areas (if enabled) */}
          {showConfidenceIntervals && bullishPath && (
            <Area
              type="monotone"
              dataKey="bullishHigh"
              stroke="none"
              fill={colors.bullish}
              fillOpacity={0.1}
              isAnimationActive={false}
            />
          )}
          {showConfidenceIntervals && bullishPath && (
            <Area
              type="monotone"
              dataKey="bullishLow"
              stroke="none"
              fill={colors.bullish}
              fillOpacity={0.1}
              isAnimationActive={false}
            />
          )}

          {/* Price paths as lines */}
          {bullishPath && (
            <Line
              type="monotone"
              dataKey="bullishPrice"
              stroke={colors.bullish}
              strokeWidth={2}
              dot={false}
              name="Bullish"
              isAnimationActive={false}
            />
          )}
          {basePath && (
            <Line
              type="monotone"
              dataKey="basePrice"
              stroke={colors.base}
              strokeWidth={2}
              dot={false}
              name="Base"
              isAnimationActive={false}
            />
          )}
          {bearishPath && (
            <Line
              type="monotone"
              dataKey="bearishPrice"
              stroke={colors.bearish}
              strokeWidth={2}
              dot={false}
              name="Bearish"
              isAnimationActive={false}
            />
          )}

          {/* Current price reference line */}
          <Line
            type="monotone"
            dataKey={() => currentPrice}
            stroke="#6b7280"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="Current Price"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="price-path-current">
        Current Price: <strong>${currentPrice.toFixed(2)}</strong>
      </div>
    </div>
  );
};

export default PricePathChart;
