import type { SchedulePackingItem } from "./eventPlanningTypes";

export const PACKING_GROUPS = {
  School: ["Team Uniforms", "Laundry Bag", "Balls", "Medical kit", "Wellness Bag", "String", "Grips", "Poles"],
  Home: ["Van Bag", "Money Bag"],
  Van: ["Stringer", "Coolers / drinks", "Pump drink", "Snacks"],
} as const;
export const DEFAULT_PACKING_STARTERS = Object.values(PACKING_GROUPS).flat();
export function packingGroup(name: string): string {
  return Object.entries(PACKING_GROUPS).find(([, names]) => names.some((n) => n.toLowerCase() === name.trim().toLowerCase()))?.[0] ?? "Additional items";
}
export function withDefaultPacking(eventId: string, saved: SchedulePackingItem[]): SchedulePackingItem[] {
  const used = new Set<string>();
  const defaults = DEFAULT_PACKING_STARTERS.map((name, index) => {
    const existing = saved.find((item) => item.itemName.trim().toLowerCase() === name.toLowerCase());
    if (existing) { used.add(existing.id); return { ...existing, itemName: name }; }
    return { id: `default:${name}`, eventId, itemName: name, quantity: 1, responsible: null, notes: null, isChecked: false, isStarter: true, sortOrder: index };
  });
  return [...defaults, ...saved.filter((item) => !used.has(item.id))];
}
