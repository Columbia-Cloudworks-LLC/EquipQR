import type React from "react";
import SupportLibrary from "./SupportLibrary";

/**
 * Shared support library used by both DashboardSupport (authenticated) and the
 * public Support page. The `includeDashboardOnly` flag controls whether
 * dashboard-only articles (e.g. "Track your reported issues") are surfaced.
 *
 * The historical five-tab layout (Guide / Guides / FAQ / Roles / Tips) has been
 * replaced by a persona- and workflow-oriented library so the content scales
 * as the product grows.
 */
interface SupportTabsProps {
  includeDashboardOnly?: boolean;
}

const SupportTabs: React.FC<SupportTabsProps> = ({
  includeDashboardOnly = true,
}) => {
  return <SupportLibrary includeDashboardOnly={includeDashboardOnly} />;
};

export default SupportTabs;
