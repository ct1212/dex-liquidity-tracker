import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import SignalPanel from "./SignalPanel";

describe("SignalPanel", () => {
  it("renders with title and text visualization", () => {
    const html = renderToString(
      <SignalPanel title="Test Signal" data="Sample data" visualizationType="text" />
    );
    expect(html).toContain("Test Signal");
    expect(html).toContain("text");
    expect(html).toContain("Sample data");
  });

  it("renders with chart visualization type", () => {
    const html = renderToString(
      <SignalPanel title="Chart Panel" data={{ value: 42 }} visualizationType="chart" />
    );
    expect(html).toContain("Chart Panel");
    expect(html).toContain("chart");
    expect(html).toContain("Chart visualization (placeholder)");
  });

  it("renders with gauge visualization type", () => {
    const html = renderToString(
      <SignalPanel title="Gauge Panel" data={{ score: 0.75 }} visualizationType="gauge" />
    );
    expect(html).toContain("Gauge Panel");
    expect(html).toContain("gauge");
    expect(html).toContain("Gauge visualization (placeholder)");
  });

  it("renders table visualization with array data", () => {
    const data = [
      { ticker: "AAPL", price: 150, change: 2.5 },
      { ticker: "MSFT", price: 300, change: -1.2 },
    ];
    const html = renderToString(
      <SignalPanel title="Stock Table" data={data} visualizationType="table" />
    );
    expect(html).toContain("Stock Table");
    expect(html).toContain("table");
    expect(html).toContain("ticker");
    expect(html).toContain("AAPL");
    expect(html).toContain("MSFT");
  });

  it("renders list visualization with array data", () => {
    const data = ["Item 1", "Item 2", "Item 3"];
    const html = renderToString(
      <SignalPanel title="Signal List" data={data} visualizationType="list" />
    );
    expect(html).toContain("Signal List");
    expect(html).toContain("list");
    expect(html).toContain("Item 1");
    expect(html).toContain("Item 2");
    expect(html).toContain("Item 3");
  });

  it("handles null data gracefully", () => {
    const html = renderToString(
      <SignalPanel title="Null Data" data={null} visualizationType="text" />
    );
    expect(html).toContain("Null Data");
    expect(html).toContain("No data available");
  });

  it("handles undefined data gracefully", () => {
    const html = renderToString(
      <SignalPanel title="Undefined Data" data={undefined} visualizationType="text" />
    );
    expect(html).toContain("Undefined Data");
    expect(html).toContain("No data available");
  });

  it("handles empty array for table visualization", () => {
    const html = renderToString(
      <SignalPanel title="Empty Table" data={[]} visualizationType="table" />
    );
    expect(html).toContain("Empty Table");
    expect(html).toContain("No items to display");
  });

  it("handles empty array for list visualization", () => {
    const html = renderToString(
      <SignalPanel title="Empty List" data={[]} visualizationType="list" />
    );
    expect(html).toContain("Empty List");
    expect(html).toContain("No items to display");
  });

  it("handles non-array data for table visualization", () => {
    const html = renderToString(
      <SignalPanel title="Invalid Table" data={{ key: "value" }} visualizationType="table" />
    );
    expect(html).toContain("Invalid Table");
    expect(html).toContain("No table data available");
  });

  it("handles non-array data for list visualization", () => {
    const html = renderToString(
      <SignalPanel title="Invalid List" data={{ key: "value" }} visualizationType="list" />
    );
    expect(html).toContain("Invalid List");
    expect(html).toContain("No list data available");
  });

  it("renders object data as JSON for text visualization", () => {
    const data = { ticker: "AAPL", price: 150 };
    const html = renderToString(
      <SignalPanel title="Object Data" data={data} visualizationType="text" />
    );
    expect(html).toContain("Object Data");
    expect(html).toContain("AAPL");
    expect(html).toContain("150");
  });

  it("includes visualization type badge in header", () => {
    const html = renderToString(
      <SignalPanel title="Badge Test" data="test" visualizationType="chart" />
    );
    expect(html).toContain("signal-panel-type");
    expect(html).toContain("chart");
  });

  it("renders complex nested objects in list", () => {
    const data = [
      { id: 1, name: "First" },
      { id: 2, name: "Second" },
    ];
    const html = renderToString(
      <SignalPanel title="Complex List" data={data} visualizationType="list" />
    );
    expect(html).toContain("Complex List");
    expect(html).toContain("First");
    expect(html).toContain("Second");
  });

  it("renders error state when data contains error property", () => {
    const data = { error: "Failed to fetch data" };
    const html = renderToString(
      <SignalPanel title="Error Panel" data={data} visualizationType="text" />
    );
    expect(html).toContain("Error Panel");
    expect(html).toContain("signal-error");
    expect(html).toContain("Failed to fetch data");
    expect(html).toContain("signal-panel-error");
  });

  it("renders error state with different visualization types", () => {
    const data = { error: "Network error" };
    const html = renderToString(
      <SignalPanel title="Chart Error" data={data} visualizationType="chart" />
    );
    expect(html).toContain("Chart Error");
    expect(html).toContain("signal-error");
    expect(html).toContain("Network error");
  });

  it("does not render visualization when error is present", () => {
    const data = { error: "API error" };
    const html = renderToString(
      <SignalPanel title="Error Test" data={data} visualizationType="chart" />
    );
    expect(html).not.toContain("Chart visualization (placeholder)");
    expect(html).toContain("API error");
  });
});
