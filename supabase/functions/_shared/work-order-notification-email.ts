/**
 * Shared HTML email builder for work-order status notifications and daily digests (#1438).
 *
 * Security invariant:
 * Templates accept ONLY the pre-redacted channel-agnostic `WorkOrderNotificationSafeView`
 * produced at emission time:
 *   - work_order_id, title, new_status, priority, equipment_name, team_name,
 *     organization_name, deep_link_path
 * Explicitly excluded: cost, labor hours, inventory/stock quantities, private notes,
 * customer financial data, and any data governed by `limit_sensitive_pi`.
 */

import { resolvePublicSiteUrl } from "./public-site-url.ts";

export interface WorkOrderNotificationSafeView {
  work_order_id: string;
  title: string;
  new_status: string;
  priority: string;
  equipment_name?: string | null;
  team_name?: string | null;
  organization_name: string;
  deep_link_path: string;
}

const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function sanitizeSubjectText(text: string, fallback: string): string {
  const sanitized = text
    .replace(/[\r\n\t\v\f\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return sanitized.length > 0 ? sanitized : fallback;
}

export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function isValidWorkOrderSafeView(
  value: unknown,
): value is WorkOrderNotificationSafeView {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.work_order_id === "string" &&
    obj.work_order_id.length > 0 &&
    typeof obj.title === "string" &&
    obj.title.length > 0 &&
    typeof obj.new_status === "string" &&
    obj.new_status.length > 0 &&
    typeof obj.priority === "string" &&
    obj.priority.length > 0 &&
    typeof obj.organization_name === "string" &&
    obj.organization_name.length > 0 &&
    typeof obj.deep_link_path === "string" &&
    obj.deep_link_path.startsWith("/")
  );
}

export function buildWorkOrderNotificationEmail(
  safeView: WorkOrderNotificationSafeView,
  baseUrl: string = resolvePublicSiteUrl(),
): { subject: string; html: string } {
  const statusLabel = formatStatusLabel(safeView.new_status);
  const priorityLabel = formatStatusLabel(safeView.priority);
  const isHighPriority = safeView.priority.toLowerCase() === "high";

  const subjectOrg = sanitizeSubjectText(safeView.organization_name, "EquipQR");
  const subjectTitle = sanitizeSubjectText(safeView.title, "Work Order");
  const priorityPrefix = isHighPriority ? "[High Priority] " : "";
  const subject = `${priorityPrefix}[${subjectOrg}] Work Order ${statusLabel}: ${subjectTitle}`;

  const safeTitle = escapeHtml(safeView.title);
  const safeStatus = escapeHtml(statusLabel);
  const safePriority = escapeHtml(priorityLabel);
  const safeOrg = escapeHtml(safeView.organization_name);
  const safeEquipment = safeView.equipment_name ? escapeHtml(safeView.equipment_name) : null;
  const safeTeam = safeView.team_name ? escapeHtml(safeView.team_name) : null;
  const safePath = safeView.deep_link_path.startsWith("/")
    ? safeView.deep_link_path
    : "/dashboard/notifications";
  const targetUrl = escapeHtml(`${baseUrl.replace(/\/$/, "")}${safePath}`);

  const badgeBg = isHighPriority ? "#dc2626" : "#2563eb";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0;">EquipQR™</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">${safeOrg}</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${badgeBg};">
        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: ${badgeBg};">
          Work Order ${safeStatus}${isHighPriority ? " &bull; High Priority" : ""}
        </p>
        <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">${safeTitle}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; width: 120px;">Status:</td>
            <td style="padding: 4px 0;">${safeStatus}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Priority:</td>
            <td style="padding: 4px 0;">${safePriority}</td>
          </tr>
          ${
            safeEquipment
              ? `<tr><td style="padding: 4px 0; font-weight: 600;">Equipment:</td><td style="padding: 4px 0;">${safeEquipment}</td></tr>`
              : ""
          }
          ${
            safeTeam
              ? `<tr><td style="padding: 4px 0; font-weight: 600;">Team:</td><td style="padding: 4px 0;">${safeTeam}</td></tr>`
              : ""
          }
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${targetUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Work Order
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        You received this notification based on your ${safeOrg} notification preferences in EquipQR™.
      </p>
    </div>
  `;

  return { subject, html };
}

export function buildWorkOrderDigestEmail(
  organizationName: string,
  items: WorkOrderNotificationSafeView[],
  baseUrl: string = resolvePublicSiteUrl(),
): { subject: string; html: string } {
  const subjectOrg = sanitizeSubjectText(organizationName, "EquipQR");
  const count = items.length;
  const subject = `[${subjectOrg}] Daily Work Order Digest (${count} update${count === 1 ? "" : "s"})`;

  const safeOrg = escapeHtml(organizationName);
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const notificationsUrl = escapeHtml(`${cleanBaseUrl}/dashboard/notifications`);

  const rowsHtml = items
    .map((item) => {
      const safeTitle = escapeHtml(item.title);
      const safeStatus = escapeHtml(formatStatusLabel(item.new_status));
      const safePriority = escapeHtml(formatStatusLabel(item.priority));
      const safeEquipment = item.equipment_name ? escapeHtml(item.equipment_name) : "—";
      const safeTeam = item.team_name ? escapeHtml(item.team_name) : "—";
      const safePath = item.deep_link_path.startsWith("/")
        ? item.deep_link_path
        : "/dashboard/notifications";
      const itemUrl = escapeHtml(`${cleanBaseUrl}${safePath}`);

      return `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
            <a href="${itemUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${safeTitle}</a>
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${safeStatus}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${safePriority}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${safeEquipment}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${safeTeam}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0;">EquipQR™ Daily Digest</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">${safeOrg} &bull; ${count} work order update${count === 1 ? "" : "s"}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #374151; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6; text-align: left;">
            <th style="padding: 10px 8px; border-bottom: 2px solid #d1d5db;">Work Order</th>
            <th style="padding: 10px 8px; border-bottom: 2px solid #d1d5db;">Status</th>
            <th style="padding: 10px 8px; border-bottom: 2px solid #d1d5db;">Priority</th>
            <th style="padding: 10px 8px; border-bottom: 2px solid #d1d5db;">Equipment</th>
            <th style="padding: 10px 8px; border-bottom: 2px solid #d1d5db;">Team</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${notificationsUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Open Notification Center
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        You received this daily digest based on your ${safeOrg} notification preferences in EquipQR™.
      </p>
    </div>
  `;

  return { subject, html };
}
