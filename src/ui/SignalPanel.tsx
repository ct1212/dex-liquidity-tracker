import React from "react";
import "./SignalPanel.css";

export type VisualizationType = "text" | "chart" | "gauge" | "table" | "list";

export interface SignalPanelProps {
  title: string;
  data: unknown;
  visualizationType: VisualizationType;
}

const SignalPanel: React.FC<SignalPanelProps> = ({ title, data, visualizationType }) => {
  const hasError = data && typeof data === "object" && "error" in data;

  const renderContent = () => {
    if (hasError) {
      return (
        <div className="signal-error" role="alert">
          <strong>Error:</strong> {String((data as { error: unknown }).error)}
        </div>
      );
    }

    switch (visualizationType) {
      case "text":
        return <div className="signal-content-text">{renderTextContent()}</div>;
      case "chart":
        return <div className="signal-content-chart">Chart visualization (placeholder)</div>;
      case "gauge":
        return <div className="signal-content-gauge">Gauge visualization (placeholder)</div>;
      case "table":
        return <div className="signal-content-table">{renderTableContent()}</div>;
      case "list":
        return <div className="signal-content-list">{renderListContent()}</div>;
      default:
        return <div className="signal-content-default">No visualization configured</div>;
    }
  };

  const renderTextContent = () => {
    if (data === null || data === undefined) {
      return <p className="no-data">No data available</p>;
    }
    if (typeof data === "object") {
      return <pre className="data-preview">{JSON.stringify(data, null, 2)}</pre>;
    }
    return <p>{String(data)}</p>;
  };

  const renderTableContent = () => {
    if (!data || typeof data !== "object" || !Array.isArray(data)) {
      return <p className="no-data">No table data available</p>;
    }
    if (data.length === 0) {
      return <p className="no-data">No items to display</p>;
    }

    const headers = Object.keys(data[0] as Record<string, unknown>);
    return (
      <table className="signal-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {headers.map((header) => (
                <td key={header}>{String((row as Record<string, unknown>)[header])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderListContent = () => {
    if (!data || !Array.isArray(data)) {
      return <p className="no-data">No list data available</p>;
    }
    if (data.length === 0) {
      return <p className="no-data">No items to display</p>;
    }

    return (
      <ul className="signal-list">
        {data.map((item, index) => (
          <li key={index}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className={`signal-panel ${hasError ? "signal-panel-error" : ""}`}>
      <div className="signal-panel-header">
        <h3 className="signal-panel-title">{title}</h3>
        <span className="signal-panel-type">{visualizationType}</span>
      </div>
      <div className="signal-panel-body">{renderContent()}</div>
    </div>
  );
};

export default SignalPanel;
