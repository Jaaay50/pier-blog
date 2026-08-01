import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "Pier";
  const description = searchParams.get("description") ?? "";
  const tags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);
  const readMin = searchParams.get("readMin") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景光晕 */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(106,155,204,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-60px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(106,155,204,0.10) 0%, transparent 70%)",
          }}
        />

        {/* 顶部：站点名 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#6a9bcc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f0f0f",
            }}
          >
            P
          </div>
          <span style={{ color: "#888", fontSize: "18px", letterSpacing: "0.05em" }}>
            ethanpier.com
          </span>
        </div>

        {/* 中部：标题 + 描述 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, justifyContent: "center" }}>
          <div
            style={{
              fontSize: title.length > 40 ? "44px" : "56px",
              fontWeight: 700,
              color: "#f0f0f0",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: "22px",
                color: "#888",
                lineHeight: 1.5,
                maxWidth: "800px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
        </div>

        {/* 底部：tags + 阅读时间 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                background: "rgba(106,155,204,0.15)",
                border: "1px solid rgba(106,155,204,0.3)",
                color: "#6a9bcc",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
          {readMin && (
            <span
              style={{
                marginLeft: tags.length ? "auto" : 0,
                color: "#555",
                fontSize: "15px",
              }}
            >
              {readMin} min read
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
