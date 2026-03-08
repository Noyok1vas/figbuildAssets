import { useEffect, useRef, useState } from "react";
import { RotateCcw, Layers, Info } from "lucide-react";
import SceneViewer from "./components/3D/screenViewer";

export default function App() {
  const [isIdle, setIsIdle] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
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
          "radial-gradient(ellipse at 50% 40%, #f6f9fc 0%, #e8f0f8 25%, #d0e0f0 50%, #a0b8d0 75%, #6888a8 100%)",
      }}
    >
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
          zIndex: 10,
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
            color: "#555",
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
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 4,
                cursor: "pointer",
                color: "#555",
                padding: 0,
                transition:
                  "border-color 200ms ease, color 200ms ease",
              }}
              onMouseEnter={(e) => {
                (
                  e.currentTarget as HTMLButtonElement
                ).style.borderColor = "rgba(0,0,0,0.28)";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.color = "#222";
              }}
              onMouseLeave={(e) => {
                (
                  e.currentTarget as HTMLButtonElement
                ).style.borderColor = "rgba(0,0,0,0.12)";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.color = "#555";
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
        }}
      >
        <div
          id="scene-container"
          onMouseDown={() => setIsGrabbing(true)}
          onMouseUp={() => setIsGrabbing(false)}
          onMouseEnter={(e) => {
            (
              e.currentTarget as HTMLDivElement
            ).style.borderColor = "rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            setIsGrabbing(false);
            (
              e.currentTarget as HTMLDivElement
            ).style.borderColor = "rgba(0,0,0,0.08)";
          }}
          style={{
            width: "60vw",
            height: "60vh",
            minWidth: 400,
            minHeight: 400,
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 4,
            cursor: isGrabbing ? "grabbing" : "grab",
            transition: "border-color 200ms ease",
          }}
        >
          <SceneViewer
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>
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
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: "rgba(0,0,0,0.4)",
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
            color: "rgba(0,0,0,0.4)",
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
            color: "rgba(0,0,0,0.4)",
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