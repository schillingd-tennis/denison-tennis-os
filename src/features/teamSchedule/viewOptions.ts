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
