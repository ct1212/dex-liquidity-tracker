import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import SentimentGauge from "./SentimentGauge";

describe("SentimentGauge", () => {
  it("renders gauge with default props", () => {
    const { container } = render(<SentimentGauge score={50} />);
    expect(container.querySelector(".sentiment-gauge-container")).toBeInTheDocument();
    expect(container.querySelector(".sentiment-gauge-svg")).toBeInTheDocument();
  });

  it("displays score value when showValue is true", () => {
    const { container } = render(<SentimentGauge score={75} showValue={true} />);
    const valueText = container.querySelector(".sentiment-gauge-value");
    expect(valueText).toBeInTheDocument();
    expect(valueText?.textContent).toBe("75");
  });

  it("displays custom label when provided", () => {
    render(<SentimentGauge score={50} label="Fear Compression" />);
    expect(screen.getByText("Fear Compression")).toBeInTheDocument();
  });

  it("shows Low status for scores below low threshold", () => {
    const { container } = render(<SentimentGauge score={25} />);
    const statusText = container.querySelector(".sentiment-gauge-status");
    expect(statusText?.textContent).toBe("Low");
  });

  it("shows Medium status for scores between low and medium thresholds", () => {
    const { container } = render(<SentimentGauge score={50} />);
    const statusText = container.querySelector(".sentiment-gauge-status");
    expect(statusText?.textContent).toBe("Medium");
  });

  it("shows High status for scores above medium threshold", () => {
    const { container } = render(<SentimentGauge score={80} />);
    const statusText = container.querySelector(".sentiment-gauge-status");
    expect(statusText?.textContent).toBe("High");
  });

  it("clamps score to 0-100 range for values below 0", () => {
    const { container } = render(<SentimentGauge score={-10} showValue={true} />);
    const valueText = container.querySelector(".sentiment-gauge-value");
    expect(valueText?.textContent).toBe("0");
  });

  it("clamps score to 0-100 range for values above 100", () => {
    const { container } = render(<SentimentGauge score={150} showValue={true} />);
    const valueText = container.querySelector(".sentiment-gauge-value");
    expect(valueText?.textContent).toBe("100");
  });

  it("applies custom thresholds correctly", () => {
    const { container } = render(
      <SentimentGauge score={50} thresholds={{ low: 40, medium: 80 }} />
    );
    const statusText = container.querySelector(".sentiment-gauge-status");
    expect(statusText?.textContent).toBe("Medium");
  });

  it("hides value when showValue is false", () => {
    const { container } = render(<SentimentGauge score={50} showValue={false} />);
    const valueText = container.querySelector(".sentiment-gauge-value");
    expect(valueText).not.toBeInTheDocument();
  });

  it("applies custom size prop", () => {
    const { container } = render(<SentimentGauge score={50} size={300} />);
    const svg = container.querySelector(".sentiment-gauge-svg");
    expect(svg).toHaveAttribute("width", "300");
  });

  it("renders with score of 0", () => {
    const { container } = render(<SentimentGauge score={0} showValue={true} />);
    const valueText = container.querySelector(".sentiment-gauge-value");
    expect(valueText?.textContent).toBe("0");
    const statusText = container.querySelector(".sentiment-gauge-status");
    expect(statusText?.textContent).toBe("Low");
  });

  it("renders with score of 100", () => {
    const { container } = render(<SentimentGauge score={100} showValue={true} />);
    const valueText = container.querySelector(".sentiment-gauge-value");
    expect(valueText?.textContent).toBe("100");
    const statusText = container.querySelector(".sentiment-gauge-status");
    expect(statusText?.textContent).toBe("High");
  });

  it("renders without label when not provided", () => {
    const { container } = render(<SentimentGauge score={50} />);
    expect(container.querySelector(".sentiment-gauge-label")).toBeInTheDocument();
    expect(container.querySelector(".sentiment-gauge-label")?.textContent).toBe("Score");
  });

  it("handles boundary threshold values correctly", () => {
    // Test exact threshold values (default thresholds: low=33, medium=66)
    // Values < 33 are Low, >= 33 and < 66 are Medium, >= 66 are High
    const { container: container1 } = render(<SentimentGauge score={32} />);
    expect(container1.querySelector(".sentiment-gauge-status")?.textContent).toBe("Low");

    const { container: container2 } = render(<SentimentGauge score={33} />);
    expect(container2.querySelector(".sentiment-gauge-status")?.textContent).toBe("Medium");

    const { container: container3 } = render(<SentimentGauge score={65} />);
    expect(container3.querySelector(".sentiment-gauge-status")?.textContent).toBe("Medium");

    const { container: container4 } = render(<SentimentGauge score={66} />);
    expect(container4.querySelector(".sentiment-gauge-status")?.textContent).toBe("High");
  });
});
