import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock fetch to handle both DemoBanner's /api/status and signal fetches
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            mode: "mock",
            hasXApiKey: false,
            hasXApiSecret: false,
            hasGrokApiKey: false,
            hasPriceApiKey: false,
          }),
        });
      }
      // Default: return pending promise (won't resolve)
      return new Promise(() => {});
    });
  });

  it("renders idle state initially with Run Signals button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /run signals/i })).toBeInTheDocument();
    expect(screen.getByText(/press the run button to fetch signal data/i)).toBeInTheDocument();
    expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
  });

  it("renders loading state after clicking Run Signals", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /run signals/i }));

    expect(screen.getByText(/Loading signals for/i)).toBeInTheDocument();
    expect(screen.getByText(/AAPL/i)).toBeInTheDocument();
  });

  it("renders signal panels after successful data fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ mode: "mock", hasXApiKey: false, hasXApiSecret: false, hasGrokApiKey: false, hasPriceApiKey: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: "test data" }),
      });
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /run signals/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("Whisper Number Tracker")).toBeInTheDocument();
    expect(screen.getByText("Fear Compression Scan")).toBeInTheDocument();
    expect(screen.getByText("Future Price Path Simulation")).toBeInTheDocument();
  });

  it("handles fetch errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ mode: "mock", hasXApiKey: false, hasXApiSecret: false, hasGrokApiKey: false, hasPriceApiKey: false }),
        });
      }
      return Promise.reject(new Error("Network error"));
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /run signals/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    const signalPanels = screen.getAllByText(/Error:/);
    expect(signalPanels.length).toBeGreaterThan(0);
  });

  it("handles HTTP error responses", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ mode: "mock", hasXApiKey: false, hasXApiSecret: false, hasGrokApiKey: false, hasPriceApiKey: false }),
        });
      }
      return Promise.resolve({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /run signals/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Loading signals/i)).not.toBeInTheDocument();
    });

    const errorMessages = screen.getAllByText(/Failed to fetch:/);
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("renders all 10 signal panels after run", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ mode: "mock", hasXApiKey: false, hasXApiSecret: false, hasGrokApiKey: false, hasPriceApiKey: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: "test" }),
      });
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /run signals/i }));

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

  it("renders DemoBanner component", () => {
    render(<App />);
    expect(screen.getByText(/DEX Liquidity Tracker Dashboard/i)).toBeInTheDocument();
  });

  it("displays ticker input field", () => {
    render(<App />);

    const tickerInput = screen.getByPlaceholderText("Enter ticker symbol") as HTMLInputElement;
    expect(tickerInput).toBeInTheDocument();
    expect(tickerInput.value).toBe("AAPL");
  });

  it("disables Run button while loading", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /run signals/i });
    fireEvent.click(button);

    expect(screen.getByRole("button", { name: /running/i })).toBeDisabled();
  });
});
