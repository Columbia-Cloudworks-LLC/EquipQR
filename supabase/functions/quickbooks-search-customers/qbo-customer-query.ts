// BillAddr and ShipAddr are not queryable via QBO query language (QueryValidationError).
const CUSTOMER_SELECT =
  "SELECT Id, DisplayName, GivenName, FamilyName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Mobile, Fax, AlternatePhone, Taxable FROM Customer";

export function sanitizeCustomerSearchQuery(query: unknown): string {
  if (typeof query !== "string") return "";
  return query.replace(/[^a-zA-Z0-9\s\-.,']/g, "").trim();
}

function escapeQuickBooksQueryLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function buildCustomerByIdQuery(quickbooksCustomerId: unknown): string | null {
  if (typeof quickbooksCustomerId !== 'string') return null;
  const sanitizedId = quickbooksCustomerId.replace(/[^0-9]/g, '');
  if (!sanitizedId) return null;
  return `${CUSTOMER_SELECT} WHERE Id = '${sanitizedId}' MAXRESULTS 1`;
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
