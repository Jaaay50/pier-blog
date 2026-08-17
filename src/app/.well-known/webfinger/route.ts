const ADMIN_EMAIL = "ethan@ethanpier.com";
const OIDC_ISSUER = "https://dev-u2dk7idxjygkxqcg.us.auth0.com/";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      subject: `acct:${ADMIN_EMAIL}`,
      links: [
        {
          rel: "http://openid.net/specs/connect/1.0/issuer",
          href: OIDC_ISSUER,
        },
      ],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Type": "application/jrd+json; charset=utf-8",
      },
    },
  );
}
