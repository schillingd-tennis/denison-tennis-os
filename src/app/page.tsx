import ModulePageShell from "@/components/ModulePageShell";
import HomeDayRuleCard from "@/features/practice/components/HomeDayRuleCard";
import { getDayRuleSummary } from "@/features/practice/repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const summary = await getDayRuleSummary();
  return <ModulePageShell title="Home" subtitle="A quick overview of what's happening across the program.">
    <HomeDayRuleCard summary={summary}/>
  </ModulePageShell>;
}
