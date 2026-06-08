/**
 * Deno unit tests for the QBO contact normalization helper.
 * Tests buildQBOContacts in isolation — no Supabase or HTTP dependencies.
 */
import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { buildQBOContacts } from "./qbo-contacts.ts";
import {
  buildCustomerQueries,
  sanitizeCustomerSearchQuery,
} from "./qbo-customer-query.ts";

const stubCustomer = {
  Id: "qb-1",
  DisplayName: "Bill's Windsurf Shop",
  GivenName: "Bill",
  FamilyName: "Lucchini",
  PrimaryEmailAddr: { Address: "surf@intuit.com" },
  PrimaryPhone: { FreeFormNumber: "(415) 444-6538" },
  Mobile: { FreeFormNumber: "(415) 555-0001" },
  Fax: { FreeFormNumber: "(415) 555-0002" },
  AlternatePhone: { FreeFormNumber: "(415) 555-0003" },
};

Deno.test("buildQBOContacts returns entries for all five documented fields", () => {
  const contacts = buildQBOContacts(stubCustomer);
  assertEquals(contacts.length, 5, "Expected 5 contact entries");
  const fields = contacts.map((c) => c.sourceField);
  assertEquals(fields.includes("primary_email"), true, "Missing primary_email");
  assertEquals(fields.includes("primary_phone"), true, "Missing primary_phone");
  assertEquals(fields.includes("mobile"), true, "Missing mobile");
  assertEquals(fields.includes("fax"), true, "Missing fax");
  assertEquals(fields.includes("alternate_phone"), true, "Missing alternate_phone");
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

Deno.test("buildQBOContacts alternate_phone entry uses AlternatePhone.FreeFormNumber", () => {
  const contacts = buildQBOContacts(stubCustomer);
  const altEntry = contacts.find((c) => c.sourceField === "alternate_phone");
  assertExists(altEntry, "alternate_phone entry missing");
  assertEquals(altEntry!.phone, "(415) 555-0003");
  assertEquals(altEntry!.role, "Alternate phone");
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
  assertEquals(contacts.length, 4, "Expected 4 contacts without fax");
  assertEquals(contacts.some((c) => c.sourceField === "fax"), false);
});

Deno.test("buildQBOContacts returns only present fields (no alternate_phone when absent)", () => {
  const customerNoAlt = { ...stubCustomer, AlternatePhone: undefined };
  const contacts = buildQBOContacts(customerNoAlt);
  assertEquals(contacts.length, 4, "Expected 4 contacts without alternate_phone");
  assertEquals(contacts.some((c) => c.sourceField === "alternate_phone"), false);
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
      "Contact entry must not include token fields",
    );
  }
});

Deno.test("buildCustomerQueries does not use unsupported QBO OR filters", () => {
  const queries = buildCustomerQueries("Matthew Hankins");

  assertEquals(queries.length, 2);
  assertEquals(queries.some((query) => /\sOR\s/i.test(query)), false);
  assertEquals(queries[0].includes("DisplayName LIKE '%Matthew Hankins%'"), true);
  assertEquals(queries[1].includes("CompanyName LIKE '%Matthew Hankins%'"), true);
});

Deno.test("buildCustomerQueries returns one active-customer query when search is empty", () => {
  const queries = buildCustomerQueries("");

  assertEquals(queries.length, 1);
  assertEquals(queries[0].endsWith("WHERE Active = true MAXRESULTS 100"), true);
});

Deno.test("sanitizeCustomerSearchQuery strips unsupported QBO special characters", () => {
  assertEquals(sanitizeCustomerSearchQuery("3-A Equipment; DROP"), "3-A Equipment DROP");
});

Deno.test("buildCustomerQueries does not request non-queryable BillAddr or ShipAddr fields", () => {
  const queries = buildCustomerQueries("");

  assertEquals(queries.length, 1);
  assertEquals(queries[0].includes("BillAddr"), false);
  assertEquals(queries[0].includes("ShipAddr"), false);
  assertEquals(
    queries[0].includes(
      "SELECT Id, DisplayName, GivenName, FamilyName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Mobile, Fax, AlternatePhone, Taxable FROM Customer",
    ),
    true,
  );
});
