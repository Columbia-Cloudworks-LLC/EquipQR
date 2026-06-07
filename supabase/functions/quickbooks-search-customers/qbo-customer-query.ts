const CUSTOMER_SELECT =
  "SELECT Id, DisplayName, GivenName, FamilyName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Mobile, Fax, AlternatePhone, BillAddr, ShipAddr, Taxable FROM Customer";

export function sanitizeCustomerSearchQuery(query: unknown): string {
  if (typeof query !== "string") return "";
  return query.replace(/[^a-zA-Z0-9\s\-.,']/g, "").trim();
}

function escapeQuickBooksQueryLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function buildCustomerQueries(query: unknown): string[] {
  const sanitizedQuery = sanitizeCustomerSearchQuery(query);

  if (!sanitizedQuery) {
    return [`${CUSTOMER_SELECT} WHERE Active = true MAXRESULTS 100`];
  }

  const escapedQuery = escapeQuickBooksQueryLiteral(sanitizedQuery);
  const likeClause = `LIKE '%${escapedQuery}%'`;

  // QBO query language does not support OR. Run separate supported filters and
  // merge by Id after fetching.
  return [
    `${CUSTOMER_SELECT} WHERE Active = true AND DisplayName ${likeClause} MAXRESULTS 100`,
    `${CUSTOMER_SELECT} WHERE Active = true AND CompanyName ${likeClause} MAXRESULTS 100`,
  ];
}
