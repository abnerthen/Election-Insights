// electiondata.my has no branding fields (colors/logos) — this is a local
// presentation-only overlay for the parties/coalitions most likely to appear
// on the dashboard, ported from the former lib/db seed. Anything not listed
// here gets a deterministic (but arbitrary) color so nothing renders blank.
const PARTY_COLORS: Record<string, string> = {
  PH: "#e62627",
  PN: "#022f54",
  BN: "#000080",
  GPS: "#f2bb13",
  GRS: "#5bc0de",
  IND: "#777777",
  DAP: "#cc0000",
  PKR: "#00adef",
  PAS: "#008000",
  UMNO: "#000080",
  AMANAH: "#0f6e51",
  BERSATU: "#022f54",
  MCA: "#0033a0",
  MIC: "#138808",
  GERAKAN: "#5aa0d8",
  WARISAN: "#f7941d",
};

function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export function getPartyColor(acronym: string): string {
  return PARTY_COLORS[acronym.toUpperCase()] ?? hashColor(acronym);
}

// For seat-winner coloring (constituency grid/row views): use the coalition's
// color so seats read as "who governs" at a glance, the same way the
// hemicycle/vote-share are grouped. Parties that contested without a
// coalition ("ALONE" — independents, but also solo parties like WARISAN)
// keep their own color instead of sharing one generic "ALONE" color.
export function getWinnerColor(party: string, coalition: string): string {
  return coalition === "ALONE" ? getPartyColor(party) : getPartyColor(coalition);
}
