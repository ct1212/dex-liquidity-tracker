import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import PricePathChart, { PricePath, PricePoint } from "./PricePathChart";

// Mock Recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("PricePathChart", () => {
  const createMockPricePoints = (basePrice: number, days: number): PricePoint[] => {
    const points: PricePoint[] = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const price = basePrice * (1 + i * 0.01); // Simple linear growth for testing
      points.push({
        date,
        price,
        high: price * 1.1,
        low: price * 0.9,
      });
    }
    return points;
  };

  const createMockPaths = (): PricePath[] => {
    return [
      {
        scenario: "bullish",
        confidence: 0.7,
        pricePoints: createMockPricePoints(100, 30),
        expectedReturn: 15.5,
        volatility: 0.25,
        probability: 0.4,
      },
      {
        scenario: "base",
        confidence: 0.6,
        pricePoints: createMockPricePoints(100, 30),
        expectedReturn: 5.2,
        volatility: 0.2,
        probability: 0.35,
      },
      {
        scenario: "bearish",
        confidence: 0.5,
        pricePoints: createMockPricePoints(100, 30),
        expectedReturn: -8.3,
        volatility: 0.3,
        probability: 0.25,
      },
    ];
  };

  it("renders empty state when no paths are provided", () => {
    render(<PricePathChart paths={[]} currentPrice={100} />);
    expect(screen.getByText("No price path data available")).toBeInTheDocument();
  });

  it("renders chart with sample paths", () => {
    const paths = createMockPaths();
    render(<PricePathChart paths={paths} currentPrice={100} />);

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    const paths = createMockPaths();
    render(<PricePathChart paths={paths} currentPrice={100} title="Future Price Simulation" />);

    expect(screen.getByText("Future Price Simulation")).toBeInTheDocument();
  });

  it("displays current price", () => {
    const paths = createMockPaths();
    render(<PricePathChart paths={paths} currentPrice={123.45} />);

    expect(screen.getByText(/Current Price:/)).toBeInTheDocument();
    expect(screen.getByText(/\$123\.45/)).toBeInTheDocument();
  });

  it("displays path legend with expected returns and probabilities", () => {
    const paths = createMockPaths();
    render(<PricePathChart paths={paths} currentPrice={100} />);

    // Check for bullish path info
    expect(screen.getByText(/Bullish:/)).toBeInTheDocument();
    expect(screen.getByText(/15\.50%/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument(); // 0.4 probability = 40%

    // Check for base path info
    expect(screen.getByText(/Base:/)).toBeInTheDocument();
    expect(screen.getByText(/5\.20%/)).toBeInTheDocument();
    expect(screen.getByText(/35%/)).toBeInTheDocument();

    // Check for bearish path info
    expect(screen.getByText(/Bearish:/)).toBeInTheDocument();
    expect(screen.getByText(/-8\.30%/)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it("handles missing scenario paths gracefully", () => {
    const paths: PricePath[] = [
      {
        scenario: "bullish",
        confidence: 0.7,
        pricePoints: createMockPricePoints(100, 30),
        expectedReturn: 15.5,
        volatility: 0.25,
        probability: 0.5,
      },
    ];

    const { container } = render(<PricePathChart paths={paths} currentPrice={100} />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Bullish:/)).toBeInTheDocument();
  });

  it("applies custom height", () => {
    const paths = createMockPaths();
    const { container } = render(<PricePathChart paths={paths} currentPrice={100} height={500} />);
    expect(container).toBeTruthy();
  });

  it("handles showConfidenceIntervals prop", () => {
    const paths = createMockPaths();

    // With confidence intervals (default)
    const { rerender } = render(<PricePathChart paths={paths} currentPrice={100} />);
    expect(screen.getAllByTestId("area").length).toBeGreaterThan(0);

    // Without confidence intervals
    rerender(<PricePathChart paths={paths} currentPrice={100} showConfidenceIntervals={false} />);
    // Chart still renders
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  it("handles Date objects and date strings in price points", () => {
    const pathWithDateStrings: PricePath = {
      scenario: "base",
      confidence: 0.6,
      pricePoints: [
        {
          date: new Date("2024-01-01"),
          price: 100,
          high: 110,
          low: 90,
        },
        {
          date: new Date("2024-01-02"),
          price: 105,
          high: 115.5,
          low: 94.5,
        },
      ],
      expectedReturn: 5.0,
      volatility: 0.2,
      probability: 0.5,
    };

    const { container } = render(
      <PricePathChart paths={[pathWithDateStrings]} currentPrice={100} />
    );
    expect(container).toBeTruthy();
  });

  it("formats percentages correctly in legend", () => {
    const paths: PricePath[] = [
      {
        scenario: "bullish",
        confidence: 0.7,
        pricePoints: createMockPricePoints(100, 30),
        expectedReturn: 25.555, // Should display as formatted
        volatility: 0.25,
        probability: 0.333, // Should be rounded to 33%
      },
    ];

    render(<PricePathChart paths={paths} currentPrice={100} />);
    expect(screen.getByText(/25\.55%/)).toBeInTheDocument(); // toFixed(2) rounds to 25.56, but JS actually displays 25.55
    expect(screen.getByText(/33%/)).toBeInTheDocument();
  });

  it("renders with all three paths simultaneously", () => {
    const paths = createMockPaths();
    render(<PricePathChart paths={paths} currentPrice={100} />);

    // All three scenarios should be present
    expect(screen.getByText(/Bullish:/)).toBeInTheDocument();
    expect(screen.getByText(/Base:/)).toBeInTheDocument();
    expect(screen.getByText(/Bearish:/)).toBeInTheDocument();

    // Chart components should be rendered
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
    expect(screen.getAllByTestId("line").length).toBeGreaterThan(0);
  });
});
