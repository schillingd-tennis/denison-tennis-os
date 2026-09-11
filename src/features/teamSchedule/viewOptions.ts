import {
  Calendar,
  Car,
  Flag,
  Home,
  List,
  MapPin,
  Plane,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { ScheduleViewMode } from "./directorySessionState";

export const SCHEDULE_VIEW_OPTIONS: readonly {
  value: ScheduleViewMode;
  label: string;
  icon?: LucideIcon;
}[] = [
  { value: "all", label: "All Matches", icon: List },
  { value: "fall", label: "Fall", icon: Calendar },
  { value: "spring", label: "Spring", icon: Calendar },
  { value: "ncac", label: "NCAC", icon: Flag },
  { value: "nonConference", label: "Non-Conference", icon: Flag },
  { value: "home", label: "Home", icon: Home },
  { value: "away", label: "Away", icon: Plane },
  { value: "neutral", label: "Neutral", icon: MapPin },
  { value: "events", label: "Tournaments / Events", icon: Trophy },
  { value: "tentative", label: "Tentative / TBD", icon: Sparkles },
  { value: "doubleheaders", label: "Doubleheaders", icon: Car },
];

const OTHER_VIEW_VALUES = new Set<ScheduleViewMode>(["fall", "spring", "doubleheaders"]);

/** Keep the highest-use schedule views visible in the desktop toolbar. */
export const PRIMARY_SCHEDULE_VIEW_OPTIONS = SCHEDULE_VIEW_OPTIONS.filter(
  (option) => !OTHER_VIEW_VALUES.has(option.value),
);

/** Lower-frequency desktop views share one compact dropdown to preserve search width. */
export const OTHER_SCHEDULE_VIEW_OPTIONS = SCHEDULE_VIEW_OPTIONS.filter((option) =>
  OTHER_VIEW_VALUES.has(option.value),
);
