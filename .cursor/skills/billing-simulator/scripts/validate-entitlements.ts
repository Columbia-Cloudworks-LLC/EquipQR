/**
 * validate-entitlements.ts
 *
 * Queries the local Supabase database to verify subscription state after
 * a simulated Stripe webhook event.
 *
 * Usage:
 *   deno run --allow-net --allow-env .cursor/skills/billing-simulator/scripts/validate-entitlements.ts [org_id]
 *
 * Environment:
 *   SUPABASE_URL              (default: http://localhost:54321)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 */

/* eslint-disable no-console -- CLI script, console output is intentional */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: SUPABASE_SERVICE_ROLE_KEY is required.\n" +
    "  Set it via: export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase status -o json | jq -r '.SERVICE_ROLE_KEY')"
  );
  Deno.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const orgIdFilter: string | undefined = Deno.args[0];

// ---------------------------------------------------------------------------
// Colour helpers (ANSI)
// ---------------------------------------------------------------------------
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

interface LicenseSubscription {
  id: string;
  organization_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  quantity: number;
  current_period_start: string;
  current_period_end: string;
  updated_at: string;
}

interface OrganizationSlot {
  id: string;
  organization_id: string;
  purchased_slots: number;
  used_slots: number;
  billing_period_start: string;
  billing_period_end: string;
  stripe_subscription_id: string | null;
  auto_renew: boolean;
}

interface OrgMember {
  user_id: string;
  role: string;
  status: string;
  joined_date: string;
}

interface WebhookEvent {
  event_id: string;
  processed_at: string;
}

interface StripeEventLog {
  event_id: string;
  type: string;
  subscription_id: string | null;
  created_at: string;
}

async function fetchSubscriptions(): Promise<LicenseSubscription[]> {
  let query = supabase
    .from("user_license_subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (orgIdFilter) {
    query = query.eq("organization_id", orgIdFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(`user_license_subscriptions query failed: ${error.message}`);
  return data ?? [];
}

async function fetchSlots(orgId: string): Promise<OrganizationSlot[]> {
  const { data, error } = await supabase
    .from("organization_slots")
    .select("*")
    .eq("organization_id", orgId)
    .order("billing_period_start", { ascending: false })
    .limit(5);

  if (error) throw new Error(`organization_slots query failed: ${error.message}`);
  return data ?? [];
}

async function fetchMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, role, status, joined_date")
    .eq("organization_id", orgId)
    .order("joined_date", { ascending: true });

  if (error) throw new Error(`organization_members query failed: ${error.message}`);
  return data ?? [];
}

async function fetchRecentWebhookEvents(limit = 10): Promise<WebhookEvent[]> {
  const { data, error } = await supabase
    .from("webhook_events")
    .select("*")
    .order("processed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`webhook_events query failed: ${error.message}`);
  return data ?? [];
}

async function fetchRecentEventLogs(limit = 10): Promise<StripeEventLog[]> {
  const { data, error } = await supabase
    .from("stripe_event_logs")
    .select("event_id, type, subscription_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`stripe_event_logs query failed: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Validation checks
// ---------------------------------------------------------------------------

interface CheckResult {
  label: string;
  pass: boolean;
  detail: string;
}

function checkSubscriptionStatus(sub: LicenseSubscription): CheckResult[] {
  const results: CheckResult[] = [];
  const validStatuses = ["active", "past_due", "cancelled", "paused", "trialing", "incomplete"];

  results.push({
    label: "Subscription status is valid",
    pass: validStatuses.includes(sub.status),
    detail: `status = '${sub.status}'`,
  });

  results.push({
    label: "Quantity is positive",
    pass: sub.quantity > 0,
    detail: `quantity = ${sub.quantity}`,
  });

  const periodStart = new Date(sub.current_period_start);
  const periodEnd = new Date(sub.current_period_end);
  results.push({
    label: "Period end is after period start",
    pass: periodEnd > periodStart,
    detail: `${sub.current_period_start} → ${sub.current_period_end}`,
  });

  return results;
}

function checkSlots(slots: OrganizationSlot[], sub: LicenseSubscription): CheckResult[] {
  const results: CheckResult[] = [];

  if (slots.length === 0) {
    results.push({
      label: "Organization slots exist",
      pass: false,
      detail: "No organization_slots rows found",
    });
    return results;
  }

  const latestSlot = slots[0];

  results.push({
    label: "Purchased slots match subscription quantity",
    pass: latestSlot.purchased_slots === sub.quantity,
    detail: `purchased_slots = ${latestSlot.purchased_slots}, subscription quantity = ${sub.quantity}`,
  });

  results.push({
    label: "Used slots do not exceed purchased slots",
    pass: latestSlot.used_slots <= latestSlot.purchased_slots,
    detail: `used = ${latestSlot.used_slots}, purchased = ${latestSlot.purchased_slots}`,
  });

  return results;
}

function checkMembers(members: OrgMember[], sub: LicenseSubscription): CheckResult[] {
  const results: CheckResult[] = [];
  const activeNonOwners = members.filter((m) => m.role !== "owner" && m.status === "active");
  const inactiveNonOwners = members.filter((m) => m.role !== "owner" && m.status === "inactive");
  const owners = members.filter((m) => m.role === "owner");

  results.push({
    label: "At least one owner exists",
    pass: owners.length > 0,
    detail: `owners = ${owners.length}`,
  });

  if (sub.status === "cancelled" || sub.status === "paused") {
    results.push({
      label: `All non-owner members inactive (subscription ${sub.status})`,
      pass: activeNonOwners.length === 0,
      detail: `active non-owners = ${activeNonOwners.length}, inactive = ${inactiveNonOwners.length}`,
    });
  } else if (sub.status === "active") {
    results.push({
      label: "Active non-owner count within license limit",
      pass: activeNonOwners.length <= sub.quantity,
      detail: `active non-owners = ${activeNonOwners.length}, license quantity = ${sub.quantity}`,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printResults(title: string, results: CheckResult[]) {
  console.log(`\n${bold(title)}`);
  for (const r of results) {
    const icon = r.pass ? green("PASS") : red("FAIL");
    console.log(`  [${icon}] ${r.label}`);
    console.log(`         ${dim(r.detail)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(bold("\n=== Billing Entitlement Validator ===\n"));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  if (orgIdFilter) console.log(`Filtering by organization: ${orgIdFilter}`);

  // 1. Recent webhook events
  const events = await fetchRecentWebhookEvents(5);
  console.log(`\n${bold("Recent Webhook Events")} (last 5):`);
  if (events.length === 0) {
    console.log(yellow("  No webhook events found. Have you triggered any?"));
  } else {
    for (const e of events) {
      console.log(`  ${dim(e.processed_at)}  ${e.event_id}`);
    }
  }

  // 2. Recent event logs (with event type)
  const logs = await fetchRecentEventLogs(5);
  console.log(`\n${bold("Recent Stripe Event Logs")} (last 5):`);
  if (logs.length === 0) {
    console.log(yellow("  No event logs found."));
  } else {
    for (const l of logs) {
      console.log(`  ${dim(l.created_at)}  ${l.type}  ${dim(l.subscription_id ?? "—")}`);
    }
  }

  // 3. Subscription validation
  const subscriptions = await fetchSubscriptions();
  if (subscriptions.length === 0) {
    console.log(yellow("\nNo user_license_subscriptions found. Run a checkout.session.completed event first."));
    Deno.exit(0);
  }

  let allPassed = true;

  for (const sub of subscriptions) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(bold(`Organization: ${sub.organization_id}`));
    console.log(`Stripe Sub:   ${sub.stripe_subscription_id}`);
    console.log(`Status:       ${sub.status}`);
    console.log(`Quantity:     ${sub.quantity}`);

    // Subscription checks
    const subResults = checkSubscriptionStatus(sub);
    printResults("Subscription Record", subResults);

    // Slots checks
    const slots = await fetchSlots(sub.organization_id);
    const slotResults = checkSlots(slots, sub);
    printResults("Organization Slots", slotResults);

    // Member checks
    const members = await fetchMembers(sub.organization_id);
    const memberResults = checkMembers(members, sub);
    printResults("Member Entitlements", memberResults);

    const allResults = [...subResults, ...slotResults, ...memberResults];
    const failed = allResults.filter((r) => !r.pass);
    if (failed.length > 0) allPassed = false;
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  if (allPassed) {
    console.log(green(bold("All checks passed.")));
  } else {
    console.log(red(bold("Some checks failed. Review the output above.")));
  }
  console.log("");

  Deno.exit(allPassed ? 0 : 1);
}

await main();
