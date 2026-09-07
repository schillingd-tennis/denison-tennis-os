import { redirect } from "next/navigation";

import { RANKINGS_CURRENT_ITA_ROUTE } from "@/lib/module-routes";

export default function RankingsIndexPage() {
  redirect(RANKINGS_CURRENT_ITA_ROUTE);
}
