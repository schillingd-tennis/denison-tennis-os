import { redirect } from "next/navigation";

import { TEAM_OPERATIONS_SCHEDULE_ROUTE } from "@/lib/module-routes";

export default function TeamOperationsIndexPage() {
  redirect(TEAM_OPERATIONS_SCHEDULE_ROUTE);
}
