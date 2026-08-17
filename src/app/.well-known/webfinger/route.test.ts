import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /.well-known/webfinger", () => {
  it("返回 Tailscale OIDC 发现所需的固定 JRD", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/jrd+json; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=300",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      subject: "acct:ethan@ethanpier.com",
      links: [
        {
          rel: "http://openid.net/specs/connect/1.0/issuer",
          href: "https://dev-u2dk7idxjygkxqcg.us.auth0.com/",
        },
      ],
    });
  });
});
