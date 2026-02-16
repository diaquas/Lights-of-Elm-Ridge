import { useState } from "react";

const ModIQSourceSelector = () => {
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [layoutDragOver, setLayoutDragOver] = useState(false);
  const [vendorFile, setVendorFile] = useState(null);
  const [layoutFile, setLayoutFile] = useState(null);

  const ready = selected && (selected !== "vendor" || vendorFile) && layoutFile;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ModIQ Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "48px",
        animation: "fadeIn 0.6s ease-out",
      }}>
        <div style={{
          fontSize: "48px",
          fontWeight: "800",
          color: "#fff",
          letterSpacing: "-2px",
          lineHeight: 1,
        }}>
          Mod<span style={{ color: "#ef4444" }}>IQ</span>
        </div>
        <div style={{
          fontSize: "13px",
          color: "#737373",
          marginTop: "6px",
          letterSpacing: "0.5px",
        }}>
          by Lights of Elm Ridge
        </div>
      </div>

      {/* Step 1 Label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
        animation: "fadeIn 0.6s ease-out 0.1s both",
      }}>
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: selected ? "#22c55e" : "#ef4444",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: "700",
          transition: "background 0.3s",
        }}>
          {selected ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : "1"}
        </div>
        <div style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#a3a3a3",
          letterSpacing: "-0.3px",
        }}>
          What are you mapping <span style={{ color: "#fff", fontWeight: "700" }}>FROM</span>?
        </div>
      </div>

      {/* Card Container */}
      <div style={{
        display: "flex",
        gap: "16px",
        maxWidth: "860px",
        width: "100%",
        animation: "fadeIn 0.6s ease-out 0.2s both",
      }}>

        {/* === OUR LAYOUTS GROUP === */}
        <div style={{
          flex: "2",
          display: "flex",
          flexDirection: "column",
          gap: "0",
        }}>
          {/* Logo header band */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "11px 0",
            borderRadius: "12px 12px 0 0",
            background: "linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)",
            borderTop: "1px solid rgba(239,68,68,0.15)",
            borderLeft: "1px solid rgba(239,68,68,0.08)",
            borderRight: "1px solid rgba(239,68,68,0.08)",
          }}>
            {/* Simplified tree/logo mark */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
              <path d="M12 2L7 8h3l-4 6h3l-5 8h16l-5-8h3l-4-6h3L12 2z"/>
            </svg>
            <span style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "rgba(239,68,68,0.7)",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}>
              Lights of Elm Ridge
            </span>
          </div>

          {/* Two cards side by side */}
          <div style={{ display: "flex", gap: "2px" }}>

            {/* Halloween Card */}
            <button
              onClick={() => setSelected("halloween")}
              style={{
                flex: 1,
                background: selected === "halloween"
                  ? "linear-gradient(170deg, #1a1a1a 0%, #1c1210 60%, #1a1008 100%)"
                  : "#131313",
                border: selected === "halloween"
                  ? "2px solid #f97316"
                  : "2px solid rgba(255,255,255,0.04)",
                borderTop: "none",
                borderRadius: "0 0 0 12px",
                padding: "32px 20px 28px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
                outline: "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (selected !== "halloween") {
                  e.currentTarget.style.background = "linear-gradient(170deg, #1a1a1a 0%, #1c1510 100%)";
                  e.currentTarget.style.borderColor = "rgba(249,115,22,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (selected !== "halloween") {
                  e.currentTarget.style.background = "#131313";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                }
              }}
            >
              <div style={{
                fontSize: "44px",
                marginBottom: "14px",
                filter: selected === "halloween" ? "none" : "grayscale(0.2) brightness(0.9)",
                transition: "filter 0.2s",
              }}>🎃</div>

              <div style={{
                fontSize: "17px",
                fontWeight: "700",
                color: selected === "halloween" ? "#fb923c" : "#d4d4d4",
                marginBottom: "2px",
                transition: "color 0.2s",
                letterSpacing: "-0.2px",
              }}>Halloween</div>

              <div style={{
                fontSize: "11px",
                color: "#525252",
                letterSpacing: "0.3px",
              }}>Display Layout</div>

              {selected === "halloween" && (
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#f97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "popIn 0.2s ease-out",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>

            {/* Christmas Card */}
            <button
              onClick={() => setSelected("christmas")}
              style={{
                flex: 1,
                background: selected === "christmas"
                  ? "linear-gradient(170deg, #1a1a1a 0%, #0f1a10 60%, #0a1a0a 100%)"
                  : "#131313",
                border: selected === "christmas"
                  ? "2px solid #22c55e"
                  : "2px solid rgba(255,255,255,0.04)",
                borderTop: "none",
                borderRadius: "0 0 12px 0",
                padding: "32px 20px 28px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
                outline: "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (selected !== "christmas") {
                  e.currentTarget.style.background = "linear-gradient(170deg, #1a1a1a 0%, #0f1a10 100%)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (selected !== "christmas") {
                  e.currentTarget.style.background = "#131313";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                }
              }}
            >
              <div style={{
                fontSize: "44px",
                marginBottom: "14px",
                filter: selected === "christmas" ? "none" : "grayscale(0.2) brightness(0.9)",
                transition: "filter 0.2s",
              }}>🎄</div>

              <div style={{
                fontSize: "17px",
                fontWeight: "700",
                color: selected === "christmas" ? "#4ade80" : "#d4d4d4",
                marginBottom: "2px",
                transition: "color 0.2s",
                letterSpacing: "-0.2px",
              }}>Christmas</div>

              <div style={{
                fontSize: "11px",
                color: "#525252",
                letterSpacing: "0.3px",
              }}>Display Layout</div>

              {selected === "christmas" && (
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "popIn 0.2s ease-out",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* === ANOTHER VENDOR CARD === */}
        <button
          onClick={() => setSelected("vendor")}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); setSelected("vendor"); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); setSelected("vendor"); setVendorFile("vendor_rgbeffects.xml"); }}
          style={{
            flex: "1",
            background: selected === "vendor"
              ? "linear-gradient(170deg, #1a1a1a 0%, #141420 60%, #12121e 100%)"
              : "#131313",
            border: selected === "vendor"
              ? "2px solid #6366f1"
              : dragOver
                ? "2px dashed #6366f1"
                : "2px solid rgba(255,255,255,0.04)",
            borderRadius: "12px",
            padding: "32px 20px 28px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s ease",
            outline: "none",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (selected !== "vendor") {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (selected !== "vendor" && !dragOver) {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
            }
          }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: selected === "vendor" ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
            transition: "background 0.2s",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke={selected === "vendor" ? "#818cf8" : "#525252"}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "stroke 0.2s" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>

          <div style={{
            fontSize: "17px",
            fontWeight: "700",
            color: selected === "vendor" ? "#a5b4fc" : "#d4d4d4",
            marginBottom: "2px",
            transition: "color 0.2s",
            letterSpacing: "-0.2px",
          }}>Other Vendor</div>

          <div style={{
            fontSize: "11px",
            color: "#525252",
            lineHeight: 1.5,
            letterSpacing: "0.3px",
          }}>
            Upload their layout
          </div>

          {selected === "vendor" && (
            <div style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "popIn 0.2s ease-out",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* Vendor Upload Zone - only appears for vendor selection */}
      {selected === "vendor" && !vendorFile && (
        <div style={{
          maxWidth: "860px",
          width: "100%",
          marginTop: "12px",
          animation: "slideDown 0.25s ease-out",
        }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); setVendorFile("uploaded_rgbeffects.xml"); }}
            style={{
              background: dragOver ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.015)",
              border: dragOver ? "1px dashed #6366f1" : "1px dashed #333",
              borderRadius: "10px",
              padding: "20px",
              textAlign: "center",
              transition: "all 0.15s",
              cursor: "pointer",
            }}
            onClick={() => setVendorFile("uploaded_rgbeffects.xml")}
          >
            <div style={{ fontSize: "13px", color: "#737373" }}>
              Drop <span style={{ color: "#a3a3a3", fontWeight: "600" }}>xlights_rgbeffects.xml</span> here or click to browse
            </div>
          </div>
        </div>
      )}

      {/* Vendor file confirmation */}
      {selected === "vendor" && vendorFile && (
        <div style={{
          maxWidth: "860px",
          width: "100%",
          marginTop: "12px",
          animation: "slideDown 0.25s ease-out",
        }}>
          <div style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontSize: "13px", color: "#a5b4fc", flex: 1 }}>{vendorFile}</span>
            <span style={{ fontSize: "11px", color: "#4ade80" }}>✓ 52 models found</span>
            <button
              onClick={(e) => { e.stopPropagation(); setVendorFile(null); }}
              style={{
                background: "none", border: "none", color: "#525252",
                cursor: "pointer", fontSize: "16px", padding: "0 4px",
              }}
            >×</button>
          </div>
        </div>
      )}

      {/* Step 2 - Your Layout */}
      <div style={{
        maxWidth: "860px",
        width: "100%",
        marginTop: "36px",
        animation: "fadeIn 0.6s ease-out 0.4s both",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}>
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: layoutFile ? "#22c55e" : (selected && (selected !== "vendor" || vendorFile)) ? "#ef4444" : "#262626",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "700",
            transition: "background 0.3s",
          }}>
            {layoutFile ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : "2"}
          </div>
          <div style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#a3a3a3",
            letterSpacing: "-0.3px",
          }}>
            Upload <span style={{ color: "#fff", fontWeight: "700" }}>YOUR</span> layout
          </div>
        </div>

        {!layoutFile ? (
          <div
            onClick={() => setLayoutFile("my_rgbeffects.xml")}
            onDragOver={(e) => { e.preventDefault(); setLayoutDragOver(true); }}
            onDragLeave={() => setLayoutDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setLayoutDragOver(false); setLayoutFile("my_rgbeffects.xml"); }}
            style={{
              background: layoutDragOver ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.015)",
              border: layoutDragOver ? "2px dashed #ef4444" : "2px dashed #262626",
              borderRadius: "12px",
              padding: "28px",
              textAlign: "center",
              cursor: (selected && (selected !== "vendor" || vendorFile)) ? "pointer" : "not-allowed",
              opacity: (selected && (selected !== "vendor" || vendorFile)) ? 1 : 0.35,
              transition: "all 0.2s",
              pointerEvents: (selected && (selected !== "vendor" || vendorFile)) ? "auto" : "none",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px" }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <div style={{ fontSize: "13px", color: "#737373" }}>
              Drop your <span style={{ color: "#a3a3a3", fontWeight: "600" }}>xlights_rgbeffects.xml</span> here or click to browse
            </div>
            <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "4px" }}>
              Found in your xLights show folder
            </div>
          </div>
        ) : (
          <div style={{
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "slideDown 0.25s ease-out",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span style={{ fontSize: "13px", color: "#fca5a5", flex: 1 }}>{layoutFile}</span>
            <span style={{ fontSize: "11px", color: "#4ade80" }}>✓ 89 models found</span>
            <button
              onClick={() => setLayoutFile(null)}
              style={{
                background: "none", border: "none", color: "#525252",
                cursor: "pointer", fontSize: "16px", padding: "0 4px",
              }}
            >×</button>
          </div>
        )}
      </div>

      {/* ModIQ It Button */}
      <div style={{
        maxWidth: "860px",
        width: "100%",
        marginTop: "24px",
        animation: "fadeIn 0.6s ease-out 0.5s both",
      }}>
        <button
          disabled={!ready}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "none",
            background: ready
              ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              : "#1a1a1a",
            color: ready ? "#fff" : "#404040",
            fontSize: "18px",
            fontWeight: "700",
            letterSpacing: "-0.3px",
            cursor: ready ? "pointer" : "not-allowed",
            transition: "all 0.3s",
            boxShadow: ready ? "0 4px 24px rgba(239,68,68,0.2)" : "none",
          }}
          onMouseEnter={(e) => {
            if (ready) {
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(239,68,68,0.3)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (ready) {
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(239,68,68,0.2)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {ready ? "ModIQ It →" : "ModIQ It"}
        </button>
      </div>

      {/* Keyboard hints */}
      <div style={{
        marginTop: "16px",
        fontSize: "11px",
        color: "#333",
        letterSpacing: "0.3px",
        animation: "fadeIn 0.6s ease-out 0.6s both",
      }}>
        Tab: next step · Enter: confirm · Esc: clear
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ModIQSourceSelector;
