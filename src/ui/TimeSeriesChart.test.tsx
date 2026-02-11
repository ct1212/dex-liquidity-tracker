import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import TimeSeriesChart, { TimeSeriesDataPoint } from "./TimeSeriesChart";

// Mock Recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("TimeSeriesChart", () => {
  it("renders empty state when no data is provided", () => {
    render(<TimeSeriesChart data={[]} />);
    expect(screen.getByText("No time series data available")).toBeInTheDocument();
  });

  it("renders chart with sample data", () => {
    const sampleData: TimeSeriesDataPoint[] = [
      { timestamp: new Date("2024-01-01"), value: 10 },
      { timestamp: new Date("2024-01-02"), value: 20 },
      { timestamp: new Date("2024-01-03"), value: 15 },
    ];

    render(<TimeSeriesChart data={sampleData} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    const sampleData: TimeSeriesDataPoint[] = [{ timestamp: new Date("2024-01-01"), value: 10 }];

    render(<TimeSeriesChart data={sampleData} title="Sentiment Trend" />);
    expect(screen.getByText("Sentiment Trend")).toBeInTheDocument();
  });

  it("handles timestamp as Date object", () => {
    const sampleData: TimeSeriesDataPoint[] = [{ timestamp: new Date("2024-01-01"), value: 10 }];

    const { container } = render(<TimeSeriesChart data={sampleData} />);
    expect(container).toBeTruthy();
  });

  it("handles timestamp as string", () => {
    const sampleData: TimeSeriesDataPoint[] = [{ timestamp: "2024-01-01", value: 10 }];

    const { container } = render(<TimeSeriesChart data={sampleData} />);
    expect(container).toBeTruthy();
  });

  it("handles timestamp as number", () => {
    const sampleData: TimeSeriesDataPoint[] = [{ timestamp: Date.now(), value: 10 }];

    const { container } = render(<TimeSeriesChart data={sampleData} />);
    expect(container).toBeTruthy();
  });

  it("applies custom props correctly", () => {
    const sampleData: TimeSeriesDataPoint[] = [
      { timestamp: new Date("2024-01-01"), value: 10, label: "Point A" },
    ];

    render(
      <TimeSeriesChart
        data={sampleData}
        title="Custom Chart"
        xAxisLabel="Date"
        yAxisLabel="Score"
        lineColor="#ff0000"
        showGrid={false}
        height={400}
      />
    );

    expect(screen.getByText("Custom Chart")).toBeInTheDocument();
  });

  it("includes label in data point when provided", () => {
    const sampleData: TimeSeriesDataPoint[] = [
      { timestamp: new Date("2024-01-01"), value: 10, label: "Start" },
      { timestamp: new Date("2024-01-02"), value: 20, label: "Mid" },
      { timestamp: new Date("2024-01-03"), value: 15, label: "End" },
    ];

    const { container } = render(<TimeSeriesChart data={sampleData} />);
    expect(container).toBeTruthy();
  });
});
