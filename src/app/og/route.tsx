import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { parseOgParams, resolveOgData, type OgCardData } from "@/lib/og";

/**
 * /og — 社交卡片图片。只接受稳定的可信资源标识（type=site / blog /
 * currents-item / currents-event，见 src/lib/og.ts），展示内容一律从仓库
 * 文章或 Currents API 解析，不再反射任何公开 query 文案。
 *
 * 缓存边界：
 * - 成功图片：稳定 CDN 缓存（s-maxage=86400 + swr），资源内容变化靠 CDN 过期收敛；
 * - 参数非法 400 / 资源不存在 404 / 上游故障 503：一律 no-store，
 *   绝不把故障或拒绝缓存成长期状态（上游恢复后即恢复出图）。
 *
 * 运行时说明：博客卡片需要读仓库 MDX（fs），必须运行在 Node.js runtime；
 * 原 edge runtime 声明随本次收敛移除。
 */

const OK_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const FAIL_CACHE = "no-store";

function errorResponse(status: number, message: string): Response {
  return new Response(`${message}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": FAIL_CACHE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** tag → 主题色（与站内 tagToGlowColor 同源的色相，饱和度提高用于 OG） */
function tagAccent(tag: string): { main: string; soft: string } {
  const map: Record<string, { main: string; soft: string }> = {
    Performance: { main: "#3b82f6", soft: "rgba(59,130,246,0.22)" },
    Animation: { main: "#a855f7", soft: "rgba(168,85,247,0.22)" },
    Architecture: { main: "#22c55e", soft: "rgba(34,197,94,0.20)" },
    React: { main: "#60a5fa", soft: "rgba(96,165,250,0.22)" },
    "Next.js": { main: "#60a5fa", soft: "rgba(96,165,250,0.22)" },
    AI: { main: "#8b5cf6", soft: "rgba(139,92,246,0.22)" },
    "System Design": { main: "#14b8a6", soft: "rgba(20,184,166,0.20)" },
    "State Management": { main: "#60a5fa", soft: "rgba(96,165,250,0.22)" },
    "Web Vitals": { main: "#3b82f6", soft: "rgba(59,130,246,0.22)" },
    性能: { main: "#3b82f6", soft: "rgba(59,130,246,0.22)" },
    架构: { main: "#22c55e", soft: "rgba(34,197,94,0.20)" },
    状态管理: { main: "#60a5fa", soft: "rgba(96,165,250,0.22)" },
  };
  return map[tag] ?? { main: "#6a9bcc", soft: "rgba(106,155,204,0.22)" };
}

function renderCard(data: OgCardData): ImageResponse {
  const { title, description, tags, readMin } = data;
  const accent = tagAccent(tags[0] ?? "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px 56px",
          background: "linear-gradient(150deg, #0a0e1a 0%, #10182c 55%, #0a0e1a 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 主题色光晕（右上，跟 tag 色相走） */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            right: "-100px",
            width: "560px",
            height: "560px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent.soft} 0%, transparent 68%)`,
          }}
        />
        {/* 辅助光晕（左下） */}
        <div
          style={{
            position: "absolute",
            bottom: "-140px",
            left: "-80px",
            width: "460px",
            height: "460px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(106,155,204,0.12) 0%, transparent 70%)",
          }}
        />

        {/* 网格纹理：纵向桩柱阴影，呼应「码头」 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 120px)",
          }}
        />

        {/* 波浪线：三条错落的贝塞尔波形，PIER 水面意象 */}
        <svg
          width="1200"
          height="240"
          viewBox="0 0 1200 240"
          style={{ position: "absolute", bottom: "-30px", left: 0, opacity: 0.5 }}
        >
          <path
            d="M0,120 C150,90 300,150 450,120 C600,90 750,150 900,120 C1050,90 1200,150 1350,120"
            stroke={accent.main}
            strokeOpacity="0.35"
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M0,160 C180,130 360,190 540,160 C720,130 900,190 1080,160 C1260,130 1440,190 1620,160"
            stroke={accent.main}
            strokeOpacity="0.2"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,200 C200,175 400,225 600,200 C800,175 1000,225 1200,200"
            stroke="#6a9bcc"
            strokeOpacity="0.14"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* 顶部：站点标识 */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${accent.main} 0%, #6a9bcc 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 700,
              color: "#0a0e1a",
            }}
          >
            P
          </div>
          <span
            style={{
              color: "#9aa5b5",
              fontSize: "19px",
              letterSpacing: "0.04em",
              fontWeight: 500,
            }}
          >
            ethanpier.com
          </span>
          {readMin && (
            <span
              style={{
                marginLeft: "auto",
                color: "#5a6578",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {readMin} min read
            </span>
          )}
        </div>

        {/* 中部：标题 + 描述 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            flex: 1,
            justifyContent: "center",
            paddingBottom: "40px",
          }}
        >
          {/* 主题色顶线 */}
          <div
            style={{
              width: "64px",
              height: "5px",
              borderRadius: "3px",
              background: `linear-gradient(90deg, ${accent.main}, transparent)`,
            }}
          />
          <div
            style={{
              fontSize: title.length > 40 ? "46px" : "58px",
              fontWeight: 700,
              color: "#f2f4f8",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "940px",
              textShadow: "0 2px 24px rgba(0,0,0,0.4)",
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: "23px",
                color: "#8b95a7",
                lineHeight: 1.5,
                maxWidth: "820px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
        </div>

        {/* 底部：tags + Π glyph 签名 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                background: accent.soft,
                border: `1px solid ${accent.main}55`,
                color: accent.main,
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
          {/* Π 桥墩 glyph：flex 内嵌品牌签名（横梁+双桩+灯点） */}
          <div
            style={{
              marginLeft: "auto",
              width: "44px",
              height: "44px",
              display: "flex",
              position: "relative",
              opacity: 0.9,
            }}
          >
            <div style={{ position: "absolute", left: "3px", top: "6px", width: "38px", height: "4px", borderRadius: "2px", backgroundColor: "#f2f4f8", display: "flex" }} />
            <div style={{ position: "absolute", left: "11px", top: "10px", width: "4px", height: "26px", borderRadius: "2px", backgroundColor: "#f2f4f8", display: "flex" }} />
            <div style={{ position: "absolute", left: "29px", top: "10px", width: "4px", height: "26px", borderRadius: "2px", backgroundColor: "#f2f4f8", display: "flex" }} />
            <div style={{ position: "absolute", left: "19px", top: "19px", width: "6px", height: "6px", borderRadius: "3px", backgroundColor: accent.main, display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const parsed = parseOgParams(request.nextUrl.searchParams);
  if (!parsed) return errorResponse(400, "invalid og parameters");

  let data: OgCardData | null;
  try {
    data = await resolveOgData(parsed);
  } catch {
    // 上游（Currents API）故障：明确 503 + no-store，不得缓存成 404
    return errorResponse(503, "upstream temporarily unavailable");
  }
  if (!data) return errorResponse(404, "not found");

  const image = renderCard(data);
  // ImageResponse 默认带 immutable 长缓存；统一改为受控 CDN 缓存策略
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", OK_CACHE);
  return new Response(image.body, { status: image.status, headers });
}
