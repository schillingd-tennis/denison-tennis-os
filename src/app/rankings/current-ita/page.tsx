import CurrentItaRankingsWorkspace from "@/features/rankings/components/CurrentItaRankingsWorkspace";
import { CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT } from "@/features/rankings/snapshot/currentIta";

export default function CurrentItaRankingsPage() {
  return <CurrentItaRankingsWorkspace snapshot={CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT} />;
}
