import startHereArticles from "./startHere";
import technicianArticles from "./technicianFieldWork";
import workOrderArticles from "./workOrders";
import equipmentArticles from "./equipmentQr";
import inventoryArticles from "./inventoryParts";
import teamsRolesArticles from "./teamsRoles";
import adminIntegrationsArticles from "./adminIntegrations";
import privacySupportArticles from "./privacySupport";

import type { SupportArticle, SupportCategoryId } from "../types";

export const SUPPORT_ARTICLES: SupportArticle[] = [
  ...startHereArticles,
  ...technicianArticles,
  ...workOrderArticles,
  ...equipmentArticles,
  ...inventoryArticles,
  ...teamsRolesArticles,
  ...adminIntegrationsArticles,
  ...privacySupportArticles,
];

export function getArticlesByCategory(
  category: SupportCategoryId,
  { includeDashboardOnly = true }: { includeDashboardOnly?: boolean } = {},
): SupportArticle[] {
  return SUPPORT_ARTICLES.filter((article) => {
    if (article.category !== category) return false;
    if (!includeDashboardOnly && article.dashboardOnly) return false;
    return true;
  });
}

export function getArticleById(id: string): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find((article) => article.id === id);
}
