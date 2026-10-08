import AutomationHealthDashboard from "@/features/automationHealth/components/AutomationHealthDashboard";
import { getAutomationHealthSnapshot } from "@/features/automationHealth/repository";

export const dynamic = "force-dynamic";

export default async function AutomationHealthPage() {
  const snapshot = await getAutomationHealthSnapshot();
  return <AutomationHealthDashboard snapshot={snapshot} />;
}
