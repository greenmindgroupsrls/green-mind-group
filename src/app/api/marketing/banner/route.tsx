import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Green Mind Group";
  const link = (searchParams.get("link") || "").replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0e0b21",
          backgroundImage: "radial-gradient(circle at 80% 20%, #1c1836 0%, #0e0b21 60%)",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              height: 56,
              width: 56,
              borderRadius: 14,
              backgroundColor: "#79c110",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "white",
            }}
          >
            G
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "white" }}>Green Mind Group</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "white", lineHeight: 1.15 }}>
            Costruisci la tua entrata extra
          </div>
          <div style={{ fontSize: 28, color: "#a3a0c2" }}>{`Invitato da ${name}`}</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            backgroundColor: "rgba(121, 193, 16, 0.12)",
            border: "2px solid #79c110",
            borderRadius: 16,
            padding: "20px 28px",
            width: "fit-content",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 600, color: "#a3e635" }}>{link}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
