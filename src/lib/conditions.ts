// Centralized condition label & color mapping for listings
// Handles both English DB values (new, like-new, good, fair) and legacy Portuguese values

const conditionMap: Record<string, { label: string; color: string }> = {
  // English keys (current Sell form)
  "new": { label: "Novo", color: "bg-lego-green text-white" },
  "like-new": { label: "Como Novo", color: "bg-lego-blue text-white" },
  "good": { label: "Bom", color: "bg-lego-yellow text-foreground" },
  "fair": { label: "Razoável", color: "bg-lego-orange text-white" },
  // Legacy Portuguese keys
  "novo": { label: "Novo", color: "bg-lego-green text-white" },
  "como novo": { label: "Como Novo", color: "bg-lego-blue text-white" },
  "usado": { label: "Usado", color: "bg-lego-orange text-white" },
  // Mixed / verbose legacy
  "Novo (Selado)": { label: "Novo", color: "bg-lego-green text-white" },
  "Como Novo": { label: "Como Novo", color: "bg-lego-blue text-white" },
  "Usado (Completo)": { label: "Usado", color: "bg-lego-orange text-white" },
};

const fallback = { label: "Outro", color: "bg-muted text-muted-foreground" };

export function getConditionLabel(condition: string): string {
  return (conditionMap[condition] || fallback).label;
}

export function getConditionColor(condition: string): string {
  return (conditionMap[condition] || fallback).color;
}
