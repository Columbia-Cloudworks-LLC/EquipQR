/**
 * Deno unit tests for the QBO contact normalization helper.
 * Tests buildQBOContacts in isolation — no Supabase or HTTP dependencies.
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { buildQBOContacts } from "./qbo-contacts.ts";

const stubCustomer = {
  Id: "qb-1",
  DisplayName: "Bill's Windsurf Shop",
  GivenName: "Bill",
  FamilyName: "Lucchini",
  PrimaryEmailAddr: { Address: "surf@intuit.com" },
  PrimaryPhone: { FreeFormNumber: "(415) 444-6538" },
  Mobile: { FreeFormNumber: "(415) 555-0001" },
  Fax: { FreeFormNumber: "(415) 555-0002" },
};

Deno.test("buildQBOContacts returns entries for all four documented fields", () => {
  const contacts = buildQBOContacts(stubCustomer);
  assertEquals(contacts.length, 4, "Expected 4 contact entries");
  const fields = contacts.map((c) => c.sourceField);
  assertEquals(fields.includes("primary_email"), true, "Missing primary_email");
  assertEquals(fields.includes("primary_phone"), true, "Missing primary_phone");
  assertEquals(fields.includes("mobile"), true, "Missing mobile");
  assertEquals(fields.includes("fax"), true, "Missing fax");
});

Deno.test("buildQBOContacts primary_email entry has correct email and role", () => {
  const contacts = buildQBOContacts(stubCustomer);
  const emailEntry = contacts.find((c) => c.sourceField === "primary_email");
  assertExists(emailEntry, "primary_email entry missing");
  assertEquals(emailEntry!.email, "surf@intuit.com");
  assertEquals(emailEntry!.role, "Primary email");
  assertEquals(emailEntry!.phone, undefined);
});

Deno.test("buildQBOContacts primary_phone entry has correct phone and role", () => {
  const contacts = buildQBOContacts(stubCustomer);
  const phoneEntry = contacts.find((c) => c.sourceField === "primary_phone");
  assertExists(phoneEntry, "primary_phone entry missing");
  assertEquals(phoneEntry!.phone, "(415) 444-6538");
  assertEquals(phoneEntry!.role, "Primary phone");
  assertEquals(phoneEntry!.email, undefined);
});

Deno.test("buildQBOContacts mobile entry uses Mobile.FreeFormNumber", () => {
  const contacts = buildQBOContacts(stubCustomer);
  const mobileEntry = contacts.find((c) => c.sourceField === "mobile");
  assertExists(mobileEntry, "mobile entry missing");
  assertEquals(mobileEntry!.phone, "(415) 555-0001");
  assertEquals(mobileEntry!.role, "Mobile");
});

Deno.test("buildQBOContacts fax entry uses Fax.FreeFormNumber", () => {
  const contacts = buildQBOContacts(stubCustomer);
  const faxEntry = contacts.find((c) => c.sourceField === "fax");
  assertExists(faxEntry, "fax entry missing");
  assertEquals(faxEntry!.phone, "(415) 555-0002");
  assertEquals(faxEntry!.role, "Fax");
});

Deno.test("buildQBOContacts derives display name from GivenName + FamilyName", () => {
  const contacts = buildQBOContacts(stubCustomer);
  for (const c of contacts) {
    assertEquals(c.name, "Bill Lucchini");
  }
});

Deno.test("buildQBOContacts falls back to DisplayName when name parts absent", () => {
  const customerNoName = { ...stubCustomer, GivenName: undefined, FamilyName: undefined };
  const contacts = buildQBOContacts(customerNoName);
  for (const c of contacts) {
    assertEquals(c.name, "Bill's Windsurf Shop");
  }
});

Deno.test("buildQBOContacts returns only present fields (no fax when absent)", () => {
  const customerNoFax = { ...stubCustomer, Fax: undefined };
  const contacts = buildQBOContacts(customerNoFax);
  assertEquals(contacts.length, 3, "Expected 3 contacts without fax");
  assertEquals(contacts.some((c) => c.sourceField === "fax"), false);
});

Deno.test("buildQBOContacts returns empty array when no contact fields present", () => {
  const bareCustomer = { Id: "qb-2", DisplayName: "Bare Co" };
  const contacts = buildQBOContacts(bareCustomer as typeof stubCustomer);
  assertEquals(contacts.length, 0);
});

Deno.test("buildQBOContacts does not include token fields in output", () => {
  const contacts = buildQBOContacts(stubCustomer);
  for (const c of contacts) {
    const keys = Object.keys(c);
    assertEquals(
      keys.some((k) => k.toLowerCase().includes("token")),
      false,
      "Contact entry must not include token fields"
    );
  }
});
