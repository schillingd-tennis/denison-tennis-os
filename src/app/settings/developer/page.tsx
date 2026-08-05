import { getDeveloperSnapshot } from "@/features/developer/getDeveloperSnapshot";
import DeveloperDashboard from "@/features/developer/components/DeveloperDashboard";

export const dynamic = "force-dynamic";

export default async function DeveloperSettingsPage() {
  const snapshot = await getDeveloperSnapshot();
  return <DeveloperDashboard snapshot={snapshot} />;
}
