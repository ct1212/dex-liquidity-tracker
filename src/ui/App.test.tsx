import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("renders loading state initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    render(<App />);
    expect(screen.getByText(/Loading signals for/i)).toBeInTheDocument();
    expect(screen.getByText(/AAPL/i)).toBeInTheDocument();
  });

  it("renders signal panels after successful data fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: "test data" }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("Whisper Number Tracker")).toBeInTheDocument();
    expect(screen.getByText("Fear Compression Scan")).toBeInTheDocument();
    expect(screen.getByText("Future Price Path Simulation")).toBeInTheDocument();
  });

  it("handles fetch errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    const signalPanels = screen.getAllByText(/Error:/);
    expect(signalPanels.length).toBeGreaterThan(0);
  });

  it("handles HTTP error responses", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
      json: async () => ({}),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    const errorMessages = screen.getAllByText(/Failed to fetch:/);
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("renders all 10 signal panels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: "test" }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("Whisper Number Tracker")).toBeInTheDocument();
    expect(screen.getByText("Crowded Trade Exit Signal")).toBeInTheDocument();
    expect(screen.getByText("Small Cap Smart Money")).toBeInTheDocument();
    expect(screen.getByText("Fear Compression Scan")).toBeInTheDocument();
    expect(screen.getByText("Macro to Micro Translation")).toBeInTheDocument();
    expect(screen.getByText("Management Credibility Signal")).toBeInTheDocument();
    expect(screen.getByText("Early Meme Formation Detector")).toBeInTheDocument();
    expect(screen.getByText("Regulatory Tailwind Radar")).toBeInTheDocument();
    expect(screen.getByText("Global Edge Finder")).toBeInTheDocument();
    expect(screen.getByText("Future Price Path Simulation")).toBeInTheDocument();
  });

  it("renders DemoBanner component", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: "test" }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    // DemoBanner should be present in the document
    expect(screen.getByText(/DEX Liquidity Tracker Dashboard/i)).toBeInTheDocument();
  });

  it("displays ticker input field", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    render(<App />);

    const tickerInput = screen.getByPlaceholderText("Enter ticker symbol") as HTMLInputElement;
    expect(tickerInput).toBeInTheDocument();
    expect(tickerInput.value).toBe("AAPL");
  });
});
