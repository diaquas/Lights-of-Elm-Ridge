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
};

const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// --- Icons ---
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

// --- Status Checkbox ---
const StatusCheck = ({ status, onClick }) => {
  const configs = {
    approved: { bg: COLORS.green, border: COLORS.green, icon: true, opacity: 1 },
    strong: { bg: COLORS.green, border: COLORS.green, icon: true, opacity: 1 },
    manual: { bg: COLORS.green, border: COLORS.green, icon: true, opacity: 1 },
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
      title={status === "approved" || status === "strong" || status === "manual" ? "Approved" : clickable ? "Click to approve" : status === "unmapped" ? "Unmapped" : "Covered by group"}
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

// --- Fixed-Width FX Badge (always 42px, 5+ digits show tooltip) ---
const FxBadge = ({ count }) => {
  const display = count > 9999 ? "9.9k" : String(count);
  const full = count > 9999 ? `${count.toLocaleString()} fx` : null;
  return (
    <span title={full} style={{
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

// --- Type Badge (fixed 42px, color = type identity only) ---
const TypeBadge = ({ type = "GRP" }) => {
  const typeColors = {
    SUPER: { bg: "rgba(168, 85, 247, 0.2)", color: "#a855f7" },
    GRP: { bg: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" },
    SUB: { bg: "rgba(45, 212, 191, 0.2)", color: "#2dd4bf" },
  };
  const c = typeColors[type] || typeColors.GRP;
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

// --- Confidence Badge ---
const ConfidenceBadge = ({ value }) => {
  const color = value >= 60 ? COLORS.green : value >= 40 ? COLORS.yellow : COLORS.red;
  const bg = value >= 60 ? COLORS.greenDark : value >= 40 ? COLORS.yellowDark : COLORS.redDark;
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: bg, color, fontFamily: MONO }}>{value}%</span>;
};

// --- Icon Button ---
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

// --- Health Bar (tooltip shows breakdown + total models) ---
const HealthBar = ({ strong = 0, needsReview = 0, weakReview = 0, manual = 0, unmapped = 0, covered = 0, totalModels = 0 }) => {
  const total = strong + needsReview + weakReview + manual + unmapped + covered;
  if (total === 0) return null;
  const segments = [
    { count: strong + manual, color: COLORS.green, label: "Mapped" },
    { count: needsReview, color: COLORS.yellow, label: "Review (40-59%)" },
    { count: weakReview, color: COLORS.red, label: "Weak (<40%)" },
    { count: unmapped, color: COLORS.blue, label: "Unmapped" },
    { count: covered, color: COLORS.gray, label: "Covered by group" },
  ];
  const lines = [`${totalModels || total} models total`, ...segments.filter(s => s.count > 0).map(s => `${s.count} ${s.label}`)];
  return (
    <div title={lines.join("\n")} style={{ display: "flex", width: "100%", height: 4, borderRadius: 2, overflow: "hidden", gap: 1, background: COLORS.cardBorder, cursor: "help" }}>
      {segments.map((seg, i) => seg.count > 0 ? (
        <div key={i} style={{ width: `${(seg.count / total) * 100}%`, background: seg.color, opacity: seg.color === COLORS.gray ? 0.4 : 0.85 }} />
      ) : null)}
    </div>
  );
};

// --- Destination Pill ---
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

// --- Row Actions ---
const RowActions = ({ hasMapping, visible = true }) => (
  <div style={{ display: "flex", gap: 2, alignItems: "center", opacity: visible ? 1 : 0, transition: "opacity 0.1s ease", flexShrink: 0 }}>
    {hasMapping && <IconBtn tooltip="Remove mapping"><UnlinkIcon size={11} color={COLORS.textMuted} /></IconBtn>}
    <IconBtn tooltip="Skip — remove from workflow" danger><XIcon size={10} color={COLORS.textMuted} /></IconBtn>
  </div>
);

// --- Section Label ---
const SectionLabel = ({ label, count }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 0 6px 0", borderBottom: `1px solid ${COLORS.cardBorder}`, marginBottom: 6 }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.green, textTransform: "uppercase", fontFamily: MONO }}>{label}</span>
    <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: MONO }}>({count})</span>
  </div>
);

// Grid columns for groups: checkbox | fx | chevron | badge | name | destination | health | actions
const GROUP_GRID = "18px 42px 16px 42px 1fr auto minmax(50px, 100px) 50px";
// Grid columns for models (indented, no chevron/badge): checkbox | fx | name | destination | health | actions
const MODEL_GRID = "18px 42px 1fr auto minmax(50px, 100px) 50px";

// ============================================================
// GROUP CARD
// ============================================================
const GroupCard = ({ name, fx, mapped, destination, confidence, autoMatched, health, expanded, onToggle, borderColor, directModels = 0, needsGroupApproval = false, showCascade = false, type = "GRP", children }) => {
  const hasHealth = directModels > 0;
  const [hovered, setHovered] = useState(false);
  
  return (
    <div style={{ marginBottom: 2 }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ background: COLORS.cardBg, borderRadius: 6, borderLeft: `3px solid ${borderColor}`, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: GROUP_GRID,
          alignItems: "center", padding: "6px 10px 6px 8px", gap: "0 6px", minHeight: 32,
        }}>
          <StatusCheck status={!destination ? "unmapped" : needsGroupApproval ? (confidence < 40 ? "weak" : "needsReview") : "approved"} />
          <FxBadge count={fx} />
          <div onClick={onToggle} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {expanded ? <ChevronDown /> : <ChevronRight />}
          </div>
          <TypeBadge type={type} />
          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {destination ? <DestinationPill name={destination} confidence={confidence} autoMatched={autoMatched} /> : <span style={{ fontSize: 12, color: COLORS.textDim, cursor: "pointer", fontFamily: SANS }}>+ Assign</span>}
          </div>
          <div style={{ padding: "0 2px" }}>
            {hasHealth ? <HealthBar {...health} totalModels={directModels} /> : <div />}
          </div>
          <RowActions hasMapping={!!destination} visible={hovered} />
        </div>

        {showCascade && (
          <div style={{ display: "flex", alignItems: "center", padding: "5px 12px 6px 40px", gap: 8, background: "rgba(74, 222, 128, 0.04)", borderTop: `1px solid ${COLORS.green}22` }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: SANS }}>Map {directModels} models inside this group to matching models in the source?</span>
            <div style={{ flex: 1 }} />
            <button style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 4, border: `1px solid ${COLORS.green}44`, background: "rgba(74, 222, 128, 0.08)", color: COLORS.green, cursor: "pointer", fontFamily: SANS }}>Yes, Map Models</button>
            <button style={{ fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 4, border: `1px solid ${COLORS.cardBorder}`, background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontFamily: SANS }}>No thanks</button>
          </div>
        )}
      </div>
      {expanded && <div style={{ paddingLeft: 20, paddingTop: 2 }}>{children}</div>}
    </div>
  );
};

// ============================================================
// MODEL ROW
// ============================================================
const ModelRow = ({ name, fx, destination, confidence, autoMatched, covered, borderColor, needsApproval = false }) => {
  const [hovered, setHovered] = useState(false);
  
  if (covered) {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: MODEL_GRID,
        alignItems: "center", padding: "3px 10px 3px 8px", gap: "0 6px",
        minHeight: 26, borderLeft: `3px solid ${COLORS.gray}33`, borderRadius: 4, marginBottom: 1, opacity: 0.4,
      }}>
        <StatusCheck status="covered" />
        <FxBadge count={fx} />
        <span style={{ fontSize: 12, color: COLORS.textDim, fontFamily: SANS }}>{name}</span>
        <span style={{ fontSize: 11, color: COLORS.textDim, fontStyle: "italic", fontFamily: SANS, textAlign: "right" }}>covered by group</span>
        <div />
        <div style={{ width: 50 }} />
      </div>
    );
  }
  
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: "grid", gridTemplateColumns: MODEL_GRID,
      alignItems: "center", padding: "3px 10px 3px 8px", gap: "0 6px",
      minHeight: 28, borderLeft: `3px solid ${borderColor}`, borderRadius: 4, marginBottom: 1,
      background: hovered ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.1s ease",
    }}>
      <StatusCheck status={!destination ? "unmapped" : needsApproval ? (confidence < 40 ? "weak" : "needsReview") : "approved"} />
      <FxBadge count={fx} />
      <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.text, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {destination ? <DestinationPill name={destination} confidence={confidence} autoMatched={autoMatched} /> : <span style={{ fontSize: 11, color: COLORS.textDim, cursor: "pointer", fontFamily: SANS }}>+ Assign</span>}
      </div>
      <div />
      <RowActions hasMapping={!!destination} visible={hovered} />
    </div>
  );
};

// ============================================================
// MAIN
// ============================================================
export default function ModIQCardMockup() {
  const [expandedGroups, setExpandedGroups] = useState({ fence: true, bats: false, pumpkins: false, pixels: false, yard: false, fireworks: true });
  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", padding: "20px 24px", fontFamily: SANS }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: COLORS.headerBg, borderRadius: 8, marginBottom: 16, border: `1px solid ${COLORS.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>MODELS <span style={{ color: COLORS.accent, fontWeight: 700 }}>85/108</span></span>
          <div style={{ width: 100, height: 4, background: COLORS.cardBorder, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "79%", height: "100%", background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.yellow})`, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>Display: <span style={{ color: COLORS.green, fontWeight: 600 }}>67%</span> (110/165)</span>
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: MONO }}>Effects: <span style={{ color: COLORS.red, fontWeight: 600 }}>40%</span> (1921/4852)</span>
        </div>
        <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: MONO }}>Focus Mode</span>
      </div>
      
      <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 10px", fontFamily: SANS }}>Groups & Models</h1>
      
      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { label: "All", count: 108, active: true, color: COLORS.linkBlue },
          { label: "Mapped", count: 96, active: false, color: COLORS.green },
          { label: "Unmapped", count: 12, active: false, color: COLORS.blue },
        ].map((f) => (
          <button key={f.label} style={{
            fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
            border: f.active ? "none" : `1px solid ${COLORS.cardBorder}`,
            background: f.active ? f.color + "22" : "transparent",
            color: f.active ? f.color : COLORS.textMuted, cursor: "pointer", fontFamily: SANS,
          }}>{f.label} ({f.count})</button>
        ))}
      </div>

      {/* Auto-match banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "rgba(74, 222, 128, 0.06)", border: `1px solid ${COLORS.green}33`, borderRadius: 6, marginBottom: 12 }}>
        <Link2Icon size={14} color={COLORS.green} />
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>55 auto-matched</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: COLORS.greenDark, color: COLORS.green, cursor: "pointer" }}>62 strong</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: COLORS.yellowDark, color: COLORS.yellow, cursor: "pointer" }}>3 needs review</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: COLORS.textDim, cursor: "pointer" }}>Skip review, show all</span>
      </div>

      {/* DISPLAY-WIDE GROUPS */}
      <SectionLabel label="Display-Wide Groups" count={2} />
      <GroupCard name="All - Pixels" fx={139} mapped type="SUPER" destination="ALL WITH ARCHES AND SPINNERS" confidence={78} autoMatched borderColor={COLORS.green} directModels={0} health={{}} expanded={expandedGroups.pixels} onToggle={() => toggleGroup("pixels")} />
      <GroupCard name="All - Yard" fx={317} mapped type="SUPER" destination="VLS ALL YARD PROPS" confidence={92} autoMatched borderColor={COLORS.green} directModels={0} health={{}} expanded={expandedGroups.yard} onToggle={() => toggleGroup("yard")} />

      {/* GROUPS & MODELS */}
      <SectionLabel label="Groups & Models" count={15} />
      <GroupCard name="All - Bats" fx={61} mapped destination="VLS GROUP - MEGATREE BATS" confidence={100} autoMatched borderColor={COLORS.green} directModels={7} showCascade health={{ strong: 7 }} expanded={expandedGroups.bats} onToggle={() => toggleGroup("bats")} />
      
      <GroupCard name="All - Fence" fx={110} mapped needsGroupApproval destination="VLS GROUP - ALL MATRIX" confidence={65} autoMatched borderColor={COLORS.green} directModels={7} health={{ needsReview: 5, covered: 2 }} expanded={expandedGroups.fence} onToggle={() => toggleGroup("fence")}>
        <ModelRow name="Fence Panel 1" fx={7} destination="MATRIX SPINNER LEFT" confidence={54} autoMatched needsApproval borderColor={COLORS.yellow} />
        <ModelRow name="Fence Panel 2" fx={7} destination="MATRIX SPINNER LEFT" confidence={54} autoMatched needsApproval borderColor={COLORS.yellow} />
        <ModelRow name="Fence Panel 3" fx={7} destination="MATRIX SPINNER LEFT" confidence={54} autoMatched needsApproval borderColor={COLORS.yellow} />
        <ModelRow name="Fence Panel 4" fx={0} covered borderColor={COLORS.gray} />
        <ModelRow name="Fence Panel 5" fx={0} covered borderColor={COLORS.gray} />
        <ModelRow name="Fence Panel 6" fx={7} destination="MATRIX SPINNER LEFT" confidence={55} autoMatched needsApproval borderColor={COLORS.yellow} />
        <ModelRow name="Fence Panel 7" fx={6} destination="MATRIX SPINNER RIGHT" confidence={55} autoMatched needsApproval borderColor={COLORS.yellow} />
      </GroupCard>

      <GroupCard name="All - Fireworks" fx={93} mapped needsGroupApproval destination="VLS GROUP - ALL SPIDERS" confidence={26} borderColor={COLORS.red} directModels={2} health={{ unmapped: 2 }} expanded={expandedGroups.fireworks} onToggle={() => toggleGroup("fireworks")}>
        <ModelRow name="Firework 1" fx={48} borderColor={COLORS.blue} />
        <ModelRow name="Firework 2" fx={45} borderColor={COLORS.blue} />
      </GroupCard>

      <GroupCard name="All - Mini Pumpkins" fx={104} mapped needsGroupApproval destination="VLS GROUP - HOUSE LETTERS" confidence={48} autoMatched borderColor={COLORS.yellow} directModels={8} health={{ manual: 3, needsReview: 3, unmapped: 2 }} expanded={expandedGroups.pumpkins} onToggle={() => toggleGroup("pumpkins")} />
      <GroupCard name="All - Spiders" fx={79} mapped destination="VLS GROUP - LARGE SPIDERS" confidence={74} autoMatched borderColor={COLORS.green} directModels={9} health={{ strong: 8, needsReview: 1 }} expanded={false} onToggle={() => {}} />
      <GroupCard name="All - Spinners" fx={13} mapped destination="VLS GROUP - SPINNERS" confidence={100} autoMatched borderColor={COLORS.green} directModels={7} health={{ strong: 7 }} expanded={false} onToggle={() => {}} />

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, padding: "16px 16px 8px", marginTop: 12, borderTop: `1px solid ${COLORS.cardBorder}` }}>
        {[
          { color: COLORS.green, label: "Mapped (60%+ / manual)" },
          { color: COLORS.yellow, label: "Review (40-59%)" },
          { color: COLORS.red, label: "Weak (<40%)" },
          { color: COLORS.blue, label: "Unmapped" },
          { color: COLORS.gray, label: "Covered by group", dim: true },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, opacity: item.dim ? 0.4 : 0.85 }} />
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: SANS }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}