import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /llms.txt", () => {
  it("describes Pier, Currents MCP, RSS, and the blog index", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("# Ethan Pier");
    expect(body).toContain("full-stack engineer");
    expect(body).toContain("https://currents-mcp.ethanpier.com/mcp");
    expect(body).toContain("currents_hot");
    expect(body).toContain("https://currents-api.ethanpier.com/feed.xml");
    expect(body).toContain("https://ethanpier.com/feed.xml");
    expect(body).toContain("/zh/blog/");
    expect(body).toContain("/en/currents/agent");
    expect(body.length).toBeGreaterThan(400);
  });
});
