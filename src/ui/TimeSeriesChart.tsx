import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./TimeSeriesChart.css";

export interface TimeSeriesDataPoint {
  timestamp: Date | string | number;
  value: number;
  label?: string;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  lineColor?: string;
  showGrid?: boolean;
  height?: number;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  xAxisLabel = "Time",
  yAxisLabel = "Value",
  lineColor = "#8884d8",
  showGrid = true,
  height = 300,
}) => {
  // Transform data for Recharts
  const chartData = data.map((point) => {
    const timestamp = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);

    return {
      timestamp: timestamp.toLocaleDateString(),
      value: point.value,
      label: point.label || "",
    };
  });

  if (!data || data.length === 0) {
    return (
      <div className="time-series-chart-empty">
        <p>No time series data available</p>
      </div>
    );
  }

  return (
    <div className="time-series-chart-container">
      {title && <h4 className="time-series-chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey="timestamp"
            label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={yAxisLabel}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
