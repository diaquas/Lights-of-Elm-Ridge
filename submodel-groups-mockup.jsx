import { useState } from "react";

const COLORS = {
  bg: "#1a1714",
  cardBg: "#242019",
  cardBorder: "#3a3530",
  headerBg: "#2a2520",
  text: "#e8e0d4",
  textMuted: "#8a8078",
  textDim: "#5a5550",
  green: "#4ade80",
  greenDark: "#166534",
  yellow: "#facc15",
  yellowDark: "#854d0e",
  red: "#ef4444",
  redDark: "#991b1b",
  blue: "#60a5fa",
  blueDark: "#1e40af",
  gray: "#4a4540",
  grayLight: "#6a6560",
  accent: "#e8432a",
  linkBlue: "#60a5fa",
  purple: "#c084fc",
  teal: "#2dd4bf",
};

const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// --- Icons (same as Groups & Models) ---
const ChevronRight = ({ size = 13, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const ChevronDown = ({ size = 13, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);
const Link2Icon = ({ size = 12, color = COLORS.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
);
const UnlinkIcon = ({ size = 12, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 7h2a5 5 0 0 1 4.015 7.985" /><path d="M9 17H7A5 5 0 0 1 2.985 9.015" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
);
const XIcon = ({ size = 11, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const CheckIcon = ({ size = 10, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const EditIcon = ({ size = 11, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

// --- Status Checkbox (identical to Groups & Models) ---
const StatusCheck = ({ status, onClick }) => {
  const configs = {
    approved: { bg: COLORS.green, border: COLORS.green, icon: true, opacity: 1 },
    strong: { bg: COLORS.green, border: COLORS.green, icon: true, opacity: 1 },
    needsReview: { bg: "transparent", border: COLORS.yellow, icon: true, opacity: 0.5 },
    weak: { bg: "transparent", border: COLORS.red, icon: true, opacity: 0.35 },
    unmapped: { bg: "transparent", border: COLORS.blue, icon: false, opacity: 0.3 },
    covered: { bg: COLORS.gray, border: COLORS.gray, icon: true, opacity: 0.25 },
  };
  const c = configs[status] || configs.unmapped;
  const [hovered, setHovered] = useState(false);
  const clickable = status === "needsReview" || status === "weak";
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      title={status === "approved" || status === "strong" ? "Approved" : clickable ? "Click to approve" : status === "unmapped" ? "Unmapped" : "Covered"}
      style={{
        width: 18, height: 18, borderRadius: 4, border: `2px solid ${c.border}`,
        background: c.bg === "transparent" ? (hovered && clickable ? c.border + "22" : "transparent") : c.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: clickable ? "pointer" : "default",
        opacity: hovered && clickable ? Math.min(c.opacity + 0.3, 1) : c.opacity,
        transition: "all 0.15s ease", padding: 0, flexShrink: 0,
      }}>
      {c.icon && <CheckIcon size={10} color={c.bg === "transparent" ? c.border : "#fff"} />}
    </button>
  );
};

// --- FX Badge (identical) ---
const FxBadge = ({ count }) => {
  const display = count > 9999 ? "9.9k" : String(count);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 42, fontSize: 10, fontWeight: 600, padding: "2px 0", borderRadius: 3,
      background: count > 0 ? "rgba(192, 132, 252, 0.15)" : "rgba(90,85,80,0.3)",
      color: count > 0 ? COLORS.purple : COLORS.textDim,
      fontFamily: MONO, lineHeight: 1, flexShrink: 0, textAlign: "center",
    }}>
      {display} fx
    </span>
  );
};

// --- Type Badge (identical) ---
const TypeBadge = ({ type = "SUB" }) => {
  const typeColors = {
    SUPER: { bg: "rgba(168, 85, 247, 0.2)", color: "#a855f7" },
    GRP: { bg: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" },
    SUB: { bg: "rgba(45, 212, 191, 0.2)", color: "#2dd4bf" },
  };
  const c = typeColors[type] || typeColors.SUB;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 42, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", padding: "2px 0",
      borderRadius: 3, background: c.bg, color: c.color,
      fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, flexShrink: 0, textAlign: "center",
    }}>
      {type}
    </span>
  );
};

// --- Confidence Badge (identical) ---
const ConfidenceBadge = ({ value }) => {
  const color = value >= 60 ? COLORS.green : value >= 40 ? COLORS.yellow : COLORS.red;
  const bg = value >= 60 ? COLORS.greenDark : value >= 40 ? COLORS.yellowDark : COLORS.redDark;
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: bg, color, fontFamily: MONO }}>{value}%</span>;
};

// --- Destination Pill (identical) ---
const DestinationPill = ({ name, confidence, autoMatched = false }) => {
  const color = confidence ? (confidence >= 60 ? COLORS.green : confidence >= 40 ? COLORS.yellow : COLORS.red) : COLORS.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
      {autoMatched && <Link2Icon size={11} color={color} />}
      <span title={name} style={{ fontSize: 12, color, fontWeight: 500, fontFamily: SANS, whiteSpace: "nowrap" }}>→ {name}</span>
      {confidence != null && <ConfidenceBadge value={confidence} />}
    </div>
  );
};

// --- Icon Button (identical) ---
const IconBtn = ({ children, tooltip, onClick, danger = false }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} title={tooltip}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22,
        borderRadius: 4, border: "none",
        background: hovered ? (danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)") : "transparent",
        cursor: "pointer", opacity: hovered ? 1 : 0.5, transition: "all 0.15s ease", padding: 0,
      }}>
      {children}
    </button>
  );
};

// --- Row Actions (identical) ---
const RowActions = ({ hasMapping, visible = true }) => (
  <div style={{ display: "flex", gap: 2, alignItems: "center", opacity: visible ? 1 : 0, transition: "opacity 0.1s ease", flexShrink: 0 }}>
    {hasMapping && <IconBtn tooltip="Remove mapping"><UnlinkIcon size={11} color={COLORS.textMuted} /></IconBtn>}
    <IconBtn tooltip="Skip — remove from workflow" danger><XIcon size={10} color={COLORS.textMuted} /></IconBtn>
  </div>
);

// --- Mini Health Bar (for model selector cards) ---
const MiniHealthBar = ({ mapped = 0, unmapped = 0, review = 0 }) => {
  const total = mapped + unmapped + review;
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", width: 80, height: 4, borderRadius: 2, overflow: "hidden", gap: 1, background: COLORS.cardBorder }}>
      {mapped > 0 && <div style={{ width: `${(mapped / total) * 100}%`, background: COLORS.green, opacity: 0.85 }} />}
      {review > 0 && <div style={{ width: `${(review / total) * 100}%`, background: COLORS.yellow, opacity: 0.85 }} />}
      {unmapped > 0 && <div style={{ width: `${(unmapped / total) * 100}%`, background: COLORS.blue, opacity: 0.85 }} />}
    </div>
  );
};

// --- Section Divider (xmodel sections like **OUTER, **CENTER) ---
const SectionDivider = ({ label, count, expanded, onToggle }) => (
  <div onClick={onToggle} style={{
    display: "flex", alignItems: "center", gap: 8, padding: "12px 0 5px 0",
    borderBottom: `1px solid ${COLORS.cardBorder}`, marginBottom: 4, cursor: "pointer", userSelect: "none",
  }}>
    <div style={{ display: "flex", alignItems: "center" }}>
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.teal, textTransform: "uppercase", fontFamily: MONO }}>{label}</span>
    <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: MONO }}>({count})</span>
  </div>
);

// --- Submodel Group Row (mirrors ModelRow from Groups & Models) ---
const SUB_GRID = "18px 42px 42px 1fr auto 50px";

const SubmodelGroupRow = ({ name, fx, destination, confidence, autoMatched, status, selected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const borderColor = {
    approved: COLORS.green, strong: COLORS.green,
    needsReview: COLORS.yellow, weak: COLORS.red,
    unmapped: COLORS.blue,
  }[status] || COLORS.blue;

  return (
    <div onClick={onSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: "grid", gridTemplateColumns: SUB_GRID,
      alignItems: "center", padding: "4px 10px 4px 8px", gap: "0 6px",
      minHeight: 30, borderLeft: `3px solid ${borderColor}`, borderRadius: 4, marginBottom: 1,
      background: selected ? "rgba(45, 212, 191, 0.06)" : hovered ? "rgba(255,255,255,0.02)" : "transparent",
      cursor: "pointer", transition: "background 0.1s ease",
      outline: selected ? `1px solid ${COLORS.teal}33` : "none",
    }}>
      <StatusCheck status={status} />
      <FxBadge count={fx} />
      <TypeBadge type="SUB" />
      <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.text, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {destination ? <DestinationPill name={destination} confidence={confidence} autoMatched={autoMatched} /> : <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: SANS }}>+ Assign</span>}
      </div>
      <RowActions hasMapping={!!destination} visible={hovered} />
    </div>
  );
};

// --- Model Selector Card ---
const ModelSelectorCard = ({ name, subCount, mapped, review, unmapped, sourceName, active, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
    background: active ? COLORS.cardBg : "transparent",
    border: `1px solid ${active ? COLORS.teal + "55" : COLORS.cardBorder}`,
    borderRadius: 6, cursor: "pointer", transition: "all 0.15s ease",
    marginBottom: 4,
  }}>
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      border: `2px solid ${active ? COLORS.teal : COLORS.textDim}`,
      background: active ? COLORS.teal : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, fontFamily: SANS }}>{name}</div>
      <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: MONO, marginTop: 1 }}>
        {subCount} sub-groups · paired with {sourceName}
      </div>
    </div>
    <MiniHealthBar mapped={mapped} review={review} unmapped={unmapped} />
    <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, fontFamily: MONO, flexShrink: 0 }}>
      {mapped + (review || 0)}/{subCount}
    </span>
  </div>
);

// --- Right Detail Panel ---
const DetailPanel = ({ subGroup, visible }) => {
  if (!visible || !subGroup) return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: `1px solid ${COLORS.cardBorder}`,
      padding: "24px 20px", background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: 13, color: COLORS.textDim, fontFamily: SANS, textAlign: "center" }}>
        Click a submodel group to view details and mapping options
      </span>
    </div>
  );

  const isPending = subGroup.status === "needsReview" || subGroup.status === "weak";
  const isMapped = subGroup.status === "approved" || subGroup.status === "strong";

  return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: `1px solid ${COLORS.cardBorder}`,
      padding: "20px", background: COLORS.bg, overflowY: "auto",
    }}>
      {/* Header */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: "0 0 4px", fontFamily: SANS }}>{subGroup.name}</h2>
      <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: MONO, marginBottom: 16 }}>
        Submodel Group · Section: {subGroup.section || "—"}
      </div>

      {/* Mapping State */}
      {(isPending || isMapped) && subGroup.destination && (
        <div style={{
          padding: "12px", borderRadius: 6, marginBottom: 16,
          background: isPending ? "rgba(250, 204, 21, 0.04)" : "rgba(74, 222, 128, 0.04)",
          border: `1px solid ${isPending ? COLORS.yellow + "33" : COLORS.green + "33"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: isPending ? COLORS.yellow : COLORS.green, fontFamily: MONO, textTransform: "uppercase" }}>
              {isPending ? "SUGGESTED MATCH" : "✓ MAPPED TO"}
            </span>
            <ConfidenceBadge value={subGroup.confidence} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, fontFamily: SANS, marginBottom: 2 }}>{subGroup.destination}</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: MONO, marginBottom: 10 }}>from VLS Mega Spinner</div>
          <div style={{ display: "flex", gap: 6 }}>
            {isPending && (
              <button style={{ fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 4, border: "none", background: COLORS.green, color: "#000", cursor: "pointer", fontFamily: SANS }}>Approve</button>
            )}
            {isMapped && (
              <>
                <button style={{ fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 4, border: `1px solid ${COLORS.cardBorder}`, background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontFamily: SANS }}>Change</button>
                <button style={{ fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 4, border: `1px solid ${COLORS.cardBorder}`, background: "transparent", color: COLORS.red, cursor: "pointer", fontFamily: SANS }}>Unlink</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Not mapped state */}
      {subGroup.status === "unmapped" && (
        <div style={{
          padding: "12px", borderRadius: 6, marginBottom: 16,
          background: "rgba(96, 165, 250, 0.04)", border: `1px solid ${COLORS.blue}33`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: COLORS.blue, fontFamily: MONO }}>NOT MAPPED</span>
        </div>
      )}

      {/* Other Options */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: COLORS.textMuted, fontFamily: MONO }}>
          OTHER OPTIONS (from VLS Mega Spinner)
        </span>
      </div>
      {(subGroup.alternatives || []).map((alt, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 10px", borderRadius: 4, marginBottom: 2,
          cursor: "pointer", transition: "background 0.1s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.text, fontFamily: SANS }}>{alt.name}</div>
            <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: MONO }}>{alt.meta}</div>
          </div>
          <ConfidenceBadge value={alt.confidence} />
        </div>
      ))}

      {/* Browse All */}
      <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.cardBorder}`, paddingTop: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: COLORS.textMuted, fontFamily: MONO }}>
          ALL SUB-GROUPS IN VLS MEGA SPINNER (45)
        </span>
        <div style={{ position: "relative", marginTop: 6 }}>
          <input type="text" placeholder="Search sub-groups..." style={{
            width: "100%", padding: "6px 10px", fontSize: 12, borderRadius: 4,
            border: `1px solid ${COLORS.cardBorder}`, background: COLORS.cardBg, color: COLORS.text,
            fontFamily: SANS, outline: "none", boxSizing: "border-box",
          }} />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SAMPLE DATA
// ============================================================
const MODELS = [
  { id: "showstopper", name: "Showstopper Spinner", subCount: 83, mapped: 47, review: 9, unmapped: 27, source: "VLS Mega Spinner" },
  { id: "crossspinner", name: "Cross Spinner", subCount: 13, mapped: 13, review: 0, unmapped: 0, source: "Cross Spinner" },
  { id: "overlord", name: "GE Overlord", subCount: 22, mapped: 9, review: 3, unmapped: 10, source: "GE Click Click Boom" },
];

const SECTIONS = {
  showstopper: [
    {
      label: "WHOLE SPINNER", items: [
        { name: "01 Cascading Arches", fx: 12, destination: "Cascading Arches", confidence: 72, autoMatched: true, status: "approved", section: "WHOLE SPINNER", alternatives: [{ name: "Cascading Sweep", meta: "14 pixels", confidence: 58 }, { name: "Arch Pattern", meta: "8 pixels", confidence: 45 }] },
        { name: "02 Cascading Arches-Odd", fx: 6, destination: "Cascading Arches", confidence: 72, autoMatched: true, status: "approved", section: "WHOLE SPINNER", alternatives: [{ name: "Cascading Sweep Odd", meta: "7 pixels", confidence: 55 }] },
        { name: "03 Cascading Arches-Even", fx: 3, destination: null, confidence: null, autoMatched: false, status: "unmapped", section: "WHOLE SPINNER", alternatives: [{ name: "Cascading Sweep Even", meta: "7 pixels", confidence: 42 }, { name: "Half Arches", meta: "5 pixels", confidence: 38 }] },
        { name: "04 Spiral Right", fx: 8, destination: "Spiral Right", confidence: 88, autoMatched: true, status: "approved", section: "WHOLE SPINNER", alternatives: [] },
        { name: "05 Spiral Left", fx: 8, destination: "Spiral Left", confidence: 88, autoMatched: true, status: "approved", section: "WHOLE SPINNER", alternatives: [] },
        { name: "06 Complex Sunflower", fx: 15, destination: "Sunflower Burst", confidence: 52, autoMatched: true, status: "needsReview", section: "WHOLE SPINNER", alternatives: [{ name: "Petal Sweep", meta: "20 pixels", confidence: 48 }, { name: "Flower Burst", meta: "18 pixels", confidence: 41 }] },
        { name: "07 Cascading Petal", fx: 9, destination: "Petal Cascade", confidence: 65, autoMatched: true, status: "approved", section: "WHOLE SPINNER", alternatives: [{ name: "Falling Petals", meta: "10 pixels", confidence: 52 }] },
        { name: "08 Big Petals", fx: 11, destination: "Large Petals", confidence: 78, autoMatched: true, status: "approved", section: "WHOLE SPINNER", alternatives: [] },
      ]
    },
    {
      label: "OUTER", items: [
        { name: "33 Outer Swirl Left", fx: 4, destination: "Outer Swirl Left", confidence: 92, autoMatched: true, status: "approved", section: "OUTER", alternatives: [] },
        { name: "34 Outer Swirl Right", fx: 4, destination: "Outer Swirl Right", confidence: 92, autoMatched: true, status: "approved", section: "OUTER", alternatives: [] },
        { name: "35 Outer Fireworks", fx: 7, destination: null, confidence: null, autoMatched: false, status: "unmapped", section: "OUTER", alternatives: [{ name: "Outer Burst", meta: "8 pixels", confidence: 35 }, { name: "Starburst Outer", meta: "12 pixels", confidence: 28 }] },
        { name: "36 Outer Half Moon", fx: 5, destination: "Half Moon", confidence: 44, autoMatched: true, status: "needsReview", section: "OUTER", alternatives: [{ name: "Crescent", meta: "6 pixels", confidence: 38 }] },
      ]
    },
    {
      label: "CENTER", items: [
        { name: "60 Inner Circle", fx: 3, destination: "Inner Circle", confidence: 100, autoMatched: true, status: "approved", section: "CENTER", alternatives: [] },
        { name: "61 Inner Star", fx: 5, destination: "Center Star", confidence: 68, autoMatched: true, status: "approved", section: "CENTER", alternatives: [{ name: "Star Burst", meta: "4 pixels", confidence: 55 }] },
        { name: "62 Snowflake Center", fx: 8, destination: null, confidence: null, autoMatched: false, status: "unmapped", section: "CENTER", alternatives: [{ name: "Center Flake", meta: "10 pixels", confidence: 42 }, { name: "Crystal", meta: "6 pixels", confidence: 30 }] },
      ]
    },
    {
      label: "HALLOWEEN", items: [
        { name: "71 Spider Web", fx: 8, destination: null, confidence: null, autoMatched: false, status: "unmapped", section: "HALLOWEEN", alternatives: [{ name: "Web Pattern", meta: "12 pixels", confidence: 35 }] },
        { name: "72 Ghost", fx: 4, destination: "Ghost Silhouette", confidence: 38, autoMatched: true, status: "weak", section: "HALLOWEEN", alternatives: [{ name: "Spirit", meta: "6 pixels", confidence: 30 }] },
        { name: "73 Bat", fx: 6, destination: "Bat Silhouette", confidence: 65, autoMatched: true, status: "approved", section: "HALLOWEEN", alternatives: [{ name: "Wings", meta: "8 pixels", confidence: 42 }] },
        { name: "74 Pumpkin", fx: 5, destination: null, confidence: null, autoMatched: false, status: "unmapped", section: "HALLOWEEN", alternatives: [] },
      ]
    },
  ],
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SubmodelGroupsMockup() {
  const [selectedModel, setSelectedModel] = useState("showstopper");
  const [selectedSubGroup, setSelectedSubGroup] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ "WHOLE SPINNER": true, "OUTER": true, "CENTER": true, "HALLOWEEN": true });
  const [pairingDismissed, setPairingDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const toggleSection = (label) => setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));

  const model = MODELS.find(m => m.id === selectedModel);
  const sections = SECTIONS[selectedModel] || [];
  const allItems = sections.flatMap(s => s.items);
  const totalMapped = allItems.filter(i => i.status === "approved" || i.status === "strong").length;
  const totalReview = allItems.filter(i => i.status === "needsReview" || i.status === "weak").length;
  const totalUnmapped = allItems.filter(i => i.status === "unmapped").length;
  const totalAll = allItems.length;

  const filterItems = (items) => {
    if (activeFilter === "mapped") return items.filter(i => i.status === "approved" || i.status === "strong");
    if (activeFilter === "unmapped") return items.filter(i => i.status === "unmapped" || i.status === "needsReview" || i.status === "weak");
    return items;
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", fontFamily: SANS }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* LEFT PANEL */}
      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>

        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: COLORS.headerBg, borderRadius: 8, marginBottom: 16, border: `1px solid ${COLORS.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>SUB-GROUPS <span style={{ color: COLORS.accent, fontWeight: 700 }}>{totalMapped + totalReview}/{totalAll}</span></span>
            <div style={{ width: 100, height: 4, background: COLORS.cardBorder, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${((totalMapped + totalReview) / totalAll) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.yellow})`, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>Mapped: <span style={{ color: COLORS.green, fontWeight: 600 }}>{totalMapped}</span></span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>Review: <span style={{ color: COLORS.yellow, fontWeight: 600 }}>{totalReview}</span></span>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>Unmapped: <span style={{ color: COLORS.blue, fontWeight: 600 }}>{totalUnmapped}</span></span>
          </div>
        </div>

        {/* Title + Continue */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0, fontFamily: SANS }}>Submodel Groups</h1>
          <button style={{ fontSize: 13, fontWeight: 600, padding: "8px 20px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#fff", cursor: "pointer", fontFamily: SANS }}>
            Continue to Finalize →
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[
            { key: "all", label: "All", count: totalAll, color: COLORS.linkBlue },
            { key: "mapped", label: "Mapped", count: totalMapped, color: COLORS.green },
            { key: "unmapped", label: "Unmapped", count: totalUnmapped + totalReview, color: COLORS.yellow },
          ].map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
              fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
              border: activeFilter === f.key ? "none" : `1px solid ${COLORS.cardBorder}`,
              background: activeFilter === f.key ? f.color + "22" : "transparent",
              color: activeFilter === f.key ? f.color : COLORS.textMuted, cursor: "pointer", fontFamily: SANS,
            }}>{f.label} ({f.count})</button>
          ))}
        </div>

        {/* Auto-Match Banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "rgba(74, 222, 128, 0.06)", border: `1px solid ${COLORS.green}33`, borderRadius: 6, marginBottom: 12 }}>
          <Link2Icon size={14} color={COLORS.green} />
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{totalMapped + totalReview} auto-matched</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: COLORS.greenDark, color: COLORS.green, cursor: "pointer" }}>{totalMapped} strong</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: COLORS.yellowDark, color: COLORS.yellow, cursor: "pointer" }}>{totalReview} needs review</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: COLORS.textDim, cursor: "pointer" }}>Skip review, show all</span>
        </div>

        {/* Spinner Pairing Review (collapsible) */}
        {!pairingDismissed && (
          <div style={{ padding: "14px 16px", background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.teal, fontFamily: MONO }}>HD PROP PAIRINGS</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: MONO, color: COLORS.textDim, marginBottom: 6, display: "grid", gridTemplateColumns: "1fr 20px 1fr 50px", gap: 4 }}>
              <span>YOUR DISPLAY</span><span></span><span>SOURCE</span><span style={{ textAlign: "right" }}>SCORE</span>
            </div>
            {MODELS.map(m => (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 20px 1fr 50px", gap: 4, padding: "4px 0", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: COLORS.text, fontFamily: SANS }}>{m.name}</span>
                <span style={{ fontSize: 11, color: COLORS.textDim, textAlign: "center" }}>→</span>
                <span style={{ fontSize: 12, color: COLORS.green, fontFamily: SANS }}>{m.source}</span>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                  <ConfidenceBadge value={m.id === "showstopper" ? 72 : m.id === "crossspinner" ? 100 : 81} />
                  <EditIcon size={10} color={COLORS.textDim} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => setPairingDismissed(true)} style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 4, border: "none", background: COLORS.teal, color: "#000", cursor: "pointer", fontFamily: SANS }}>Looks Good</button>
              <button style={{ fontSize: 11, fontWeight: 500, padding: "5px 14px", borderRadius: 4, border: `1px solid ${COLORS.cardBorder}`, background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontFamily: SANS }}>Let Me Adjust</button>
            </div>
          </div>
        )}

        {/* Model Selector */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.textMuted, fontFamily: MONO, display: "block", marginBottom: 6 }}>SELECT MODEL</span>
          {MODELS.map(m => (
            <ModelSelectorCard key={m.id} name={m.name} subCount={m.subCount}
              mapped={m.mapped} review={m.review} unmapped={m.unmapped}
              sourceName={m.source} active={selectedModel === m.id}
              onClick={() => { setSelectedModel(m.id); setSelectedSubGroup(null); }} />
          ))}
        </div>

        {/* Submodel Group List with Section Dividers */}
        {sections.map(section => {
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;
          return (
            <div key={section.label}>
              <SectionDivider label={section.label} count={filtered.length}
                expanded={expandedSections[section.label] !== false}
                onToggle={() => toggleSection(section.label)} />
              {expandedSections[section.label] !== false && filtered.map((item, i) => (
                <SubmodelGroupRow key={i} {...item}
                  selected={selectedSubGroup === item.name}
                  onSelect={() => setSelectedSubGroup(item.name)} />
              ))}
            </div>
          );
        })}

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, padding: "16px 16px 8px", marginTop: 12, borderTop: `1px solid ${COLORS.cardBorder}` }}>
          {[
            { color: COLORS.green, label: "Mapped (60%+ / manual)" },
            { color: COLORS.yellow, label: "Review (40-59%)" },
            { color: COLORS.red, label: "Weak (<40%)" },
            { color: COLORS.blue, label: "Unmapped" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, opacity: 0.85 }} />
              <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: SANS }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT DETAIL PANEL */}
      <DetailPanel
        visible={true}
        subGroup={selectedSubGroup ? sections.flatMap(s => s.items).find(i => i.name === selectedSubGroup) : null}
      />
    </div>
  );
}
