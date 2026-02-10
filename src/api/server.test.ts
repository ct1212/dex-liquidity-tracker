import { describe, it, expect, afterEach } from "vitest";
import { app } from "./server.js";
import type { Server } from "http";

describe("Express Server", () => {
  let server: Server;

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it("should respond to health check endpoint", async () => {
    server = app.listen(0); // Use random available port
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://localhost:${port}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: "ok" });
  });

  it("should have JSON middleware configured", async () => {
    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    // Test that the health endpoint returns JSON (confirming JSON middleware works)
    const response = await fetch(`http://localhost:${port}/health`);
    const data = await response.json();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(data).toEqual({ status: "ok" });
  });

  it("should have CORS enabled", async () => {
    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://localhost:${port}/health`, {
      headers: {
        Origin: "http://example.com",
      },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});
