import { redirect } from "next/navigation";

import { TEAM_OPERATIONS_ROUTE } from "@/lib/module-routes";

export default function OperationsLegacyPage() {
  redirect(TEAM_OPERATIONS_ROUTE);
}
