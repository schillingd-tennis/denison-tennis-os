import {
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import type { CommunicationType } from "../types";

export const COMMUNICATION_TYPE_META: Record<
  CommunicationType,
  { label: string; icon: LucideIcon }
> = {
  call: { label: "Call", icon: Phone },
  text: { label: "Text", icon: MessageSquare },
  email: { label: "Email", icon: Mail },
  meeting: { label: "Meeting", icon: Calendar },
  note: { label: "Note", icon: StickyNote },
};

export function getCommunicationTypeLabel(type: CommunicationType): string {
  return COMMUNICATION_TYPE_META[type].label;
}

export function getCommunicationTypeIcon(type: CommunicationType): LucideIcon {
  return COMMUNICATION_TYPE_META[type].icon;
}
