import { useEffect, useRef, useState } from "react";
import { RotateCcw, Layers, Info } from "lucide-react";
import SceneViewer from "./components/3D/screenViewer";

export default function App() {
  const [isIdle, setIsIdle] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [canvasBlurPx, setCanvasBlurPx] = useState(6);
  const idleTimer = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Idle detection — fade UI chrome after 3 s of no mouse movement
  useEffect(() => {
    const resetIdle = () => {
      setIsIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(
        () => setIsIdle(true),
        3000,
      );
    };

    resetIdle(); // start timer on mount
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const chromeStyle: React.CSSProperties = {
    opacity: isIdle ? 0.3 : 1,
    transition: "opacity 200ms ease",
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Space Grotesk', sans-serif",
        background:
          "radial-gradient(ellipse 120% 80% at 50% 45%, #f0f8fa 0%, #e8f4f6 22%, #dee7ed 45%, #c5e0de 70%, #a3d8d2 85%, #80cbc4 100%)",
        zIndex: 0,
      }}
    >
      {/* ── Noise overlay (film grain) ───────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch' result='noise'/%3E%3CfeColorMatrix in='noise' type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* ── Frosted glass overlay (full page) ───────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 10,
          backdropFilter: "blur(24px) saturate(160%) brightness(1.04)",
          WebkitBackdropFilter:
            "blur(24px) saturate(160%) brightness(1.04)",
          background: "rgba(255, 255, 255, 0.06)",
          maskImage: `radial-gradient(
    ellipse 55% 52% at 50% 50%,
    transparent 0%,
    transparent 38%,
    rgba(0,0,0,0.15) 52%,
    rgba(0,0,0,0.55) 68%,
    rgba(0,0,0,0.92) 84%,
    black 100%
  )`,
          WebkitMaskImage: `radial-gradient(
    ellipse 55% 52% at 50% 50%,
    transparent 0%,
    transparent 38%,
    rgba(0,0,0,0.15) 52%,
    rgba(0,0,0,0.55) 68%,
    rgba(0,0,0,0.92) 84%,
    black 100%
  )`,
        }}
      />

      {/* ── Header Bar ─────────────────────────────────────────── */}
      <header
        style={{
          ...chromeStyle,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "transparent",
          zIndex: 20,
        }}
      >
        {/* Title */}
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 300,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: "#4a6b6b",
          }}
        >
          Atomic Viewer
        </span>

        {/* Icon Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {[
            { Icon: RotateCcw, label: "Rotate" },
            { Icon: Layers, label: "Explode view" },
            { Icon: Info, label: "Info" },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              title={label}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "1px solid rgba(128, 203, 196, 0.25)",
                borderRadius: 4,
                cursor: "pointer",
                color: "#4a6b6b",
                padding: 0,
                transition:
                  "border-color 200ms ease, color 200ms ease",
              }}
              onMouseEnter={(e) => {
                (
                  e.currentTarget as HTMLButtonElement
                ).style.borderColor = "rgba(128, 203, 196, 0.5)";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.color = "#2d4a4a";
              }}
              onMouseLeave={(e) => {
                (
                  e.currentTarget as HTMLButtonElement
                ).style.borderColor = "rgba(128, 203, 196, 0.25)";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.color = "#4a6b6b";
              }}
            >
              <Icon size={14} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </header>

      {/* ── 3D Scene Container ──────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          id="scene-container"
          onMouseDown={() => setIsGrabbing(true)}
          onMouseUp={() => setIsGrabbing(false)}
          onMouseEnter={(e) => {
            (
              e.currentTarget as HTMLDivElement
            ).style.borderColor = "rgba(128, 203, 196, 0.5)";
          }}
          onMouseLeave={(e) => {
            setIsGrabbing(false);
            (
              e.currentTarget as HTMLDivElement
            ).style.borderColor = "rgba(163, 216, 210, 0.35)";
          }}
          style={{
            width: "60vw",
            height: "60vh",
            minWidth: 400,
            minHeight: 400,
            background: "transparent",
            border: "1px solid rgba(163, 216, 210, 0.35)",
            borderRadius: 4,
            cursor: isGrabbing ? "grabbing" : "grab",
            transition: "border-color 200ms ease",
          }}
        >
          <SceneViewer
            autoRotate={autoRotate}
            onAutoRotateChange={setAutoRotate}
            canvasBlurPx={canvasBlurPx}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>

      {/* ── Right panel: Blur slider + ROTATE button ─────────────── */}
      <div
        style={{
          position: "fixed",
          top: 56,
          right: 24,
          bottom: 52,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <label
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "rgba(74, 107, 107, 0.8)",
              textTransform: "uppercase",
            }}
          >
            Blur {canvasBlurPx}px
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={canvasBlurPx}
            onChange={(e) => setCanvasBlurPx(Number(e.target.value))}
            style={{
              width: 100,
              accentColor: "rgba(128, 203, 196, 0.8)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "#555",
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.15)";
          }}
        >
          {autoRotate ? "⏸ PAUSE" : "▶ ROTATE"}
        </button>
      </div>

      {/* ── Bottom Status Bar ───────────────────────────────────── */}
      <footer
        style={{
          ...chromeStyle,
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "transparent",
          zIndex: 20,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: "rgba(74, 107, 107, 0.65)",
            fontWeight: 400,
            letterSpacing: "0.04em",
          }}
        >
          model_v1.glb
        </span>

        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: "rgba(74, 107, 107, 0.65)",
            fontWeight: 400,
            letterSpacing: "0.04em",
          }}
        >
          drag to rotate · scroll to zoom
        </span>

        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: "rgba(74, 107, 107, 0.65)",
            fontWeight: 400,
            letterSpacing: "0.04em",
          }}
        >
          24,832 polygons
        </span>
      </footer>

      {/* ── Responsive style override ───────────────────────────── */}
      <style>{`
        @media (max-width: 640px) {
          #scene-container {
            width: 90vw !important;
            height: 50vh !important;
            min-width: unset !important;
            min-height: unset !important;
          }
        }
      `}</style>
    </div>
  );
}