---
name: intuit-qbo-dev
description: Expert guide for developing, debugging, and interacting with the Intuit QuickBooks Online API (v3). Use when writing QBO integration code, debugging API errors (Business Validation Error, Stale Object Error), handling OAuth2 tokens and realms, generating reports, or working with QBO Data Services queries. Applies to Node.js, Python, C#, and Deno implementations.
---

# Intuit QuickBooks Online (QBO) Developer Skill

## When to Use

Use this skill when:
- Writing code to integrate with QuickBooks Online (Node.js, Python, C#, Deno)
- Debugging QBO API errors (e.g., "Business Validation Error", "Stale Object Error")
- Generating reports or SQL-like queries for QBO Data Services
- Handling OAuth2 tokens and realms for Intuit
- Working with QBO invoices, customers, items, payments, or other entities
- Implementing batch operations for bulk data updates
- Setting up Change Data Capture (CDC) or webhooks for data synchronization
- Troubleshooting SyncToken, sparse update, or rate limiting issues

## Critical API Context (Read First)

1. **Base URLs:**
   - Sandbox: `https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}`
   - Production: `https://quickbooks.api.intuit.com/v3/company/{realmId}`
2. **Minor Versions:** Many fields require a `?minorversion=70` query param. Always check if a missing field requires a minor version bump.
3. **Sparse Updates:** Set `sparse: true` in the request body with the `Id` and `SyncToken` to update fields without erasing others.
4. **SyncTokens:** You cannot update an object without the latest `SyncToken`. Read the object first, then send the token back in the Update. Handle error 3200 (stale object) by re-reading and retrying.
5. **Request Headers:** All API calls require:
   ```
   Authorization: Bearer {access_token}
   Accept: application/json
   Content-Type: application/json
   ```

## Authentication (OAuth2)

### Token Lifecycle
| Token | TTL | Notes |
|-------|-----|-------|
| Access Token | 3600 seconds (1 hour) | Include as `Authorization: Bearer {token}` |
| Refresh Token | 100 days | Previous token expires 24h after new one issued |

### Key Endpoints
- **Authorization:** `https://appcenter.intuit.com/connect/oauth2`
- **Token Exchange:** `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- **Scopes:** `com.intuit.quickbooks.accounting`, `com.intuit.quickbooks.payment`

### Best Practices
- Refresh proactively (at ~50 min mark, not at expiry)
- Store `realmId` from OAuth — required for all API calls
- Always handle 401 by attempting automatic token refresh then retry
- Encrypt tokens at rest; never commit to version control
- Always use the most recent refresh token

### Token Refresh Pattern (Node.js)
```javascript
// Using intuit-oauth
oauthClient.refresh()
  .then(authResponse => {
    const { access_token, refresh_token, expires_in } = authResponse.token;
    // Store new tokens securely, schedule next refresh
  })
  .catch(e => {
    if (e.error === 'invalid_grant') {
      // Refresh token invalid — re-authentication required
    }
  });
```

## Core Entities (Quick Reference)

| Entity | Required Fields | Reference Type |
|--------|----------------|----------------|
| **Customer** | `DisplayName` (unique) | `CustomerRef: { "value": "id" }` |
| **Invoice** | `CustomerRef`, `Line[]` | `Line.SalesItemLineDetail.ItemRef` |
| **Payment** | `TotalAmt`, `CustomerRef` | `Line[].LinkedTxn[].TxnId` |
| **Item** | `Name` (unique), `Type`, `IncomeAccountRef` | `ItemRef: { "value": "id" }` |
| **Account** | `Name`, `AccountType` | `AccountRef: { "value": "id" }` |

For full entity field reference, see [reference.md](reference.md).

## CRUD Operations

### Create
`POST /v3/company/{realmId}/{entityName}`

### Read
`GET /v3/company/{realmId}/{entityName}/{entityId}`

### Update (Sparse)
`POST /v3/company/{realmId}/{entityName}` — Include `Id`, `SyncToken`, `sparse: true`.

### Delete
Most entities use soft delete (`Active: false`). Hard delete (limited):
`POST /v3/company/{realmId}/{entityName}?operation=delete` with `Id` + `SyncToken`.

### Minimal Invoice Create
```json
{
  "Line": [{
    "DetailType": "SalesItemLineDetail",
    "Amount": 100.00,
    "SalesItemLineDetail": {
      "ItemRef": { "value": "1", "name": "Services" }
    }
  }],
  "CustomerRef": { "value": "1" }
}
```

### Payment Applied to Invoice
```json
{
  "TotalAmt": 100.00,
  "CustomerRef": { "value": "1" },
  "Line": [{
    "Amount": 100.00,
    "LinkedTxn": [{ "TxnId": "123", "TxnType": "Invoice" }]
  }]
}
```

## Query Language (SQL-like)

**Endpoint:** `GET /v3/company/{realmId}/query?query={urlEncodedSQL}`

```sql
-- Basic query
SELECT * FROM Customer WHERE Active = true ORDERBY DisplayName

-- Date range
SELECT * FROM Invoice WHERE TxnDate >= '2024-01-01' AND TxnDate <= '2024-12-31'

-- Pattern match (% only, no _)
SELECT * FROM Customer WHERE DisplayName LIKE 'Acme%'

-- Pagination
SELECT * FROM Invoice STARTPOSITION 1 MAXRESULTS 100
```

### Limitations
- No `JOIN`, `GROUP BY`, or aggregate functions
- `LIKE` supports `%` only (not `_`)
- Max 1000 results per query — use pagination for larger sets
- Cannot select specific fields (always returns all)

## Batch Operations

`POST /v3/company/{realmId}/batch` — Up to 30 operations per request.

```json
{
  "BatchItemRequest": [
    { "bId": "bid1", "operation": "create", "Customer": { "DisplayName": "New" } },
    { "bId": "bid2", "operation": "update", "Invoice": { "Id": "123", "SyncToken": "1", "sparse": true, "EmailStatus": "NeedToSend" } },
    { "bId": "bid3", "operation": "query", "Query": "SELECT * FROM Customer MAXRESULTS 10" }
  ]
}
```

Benefits: 1 API call vs 30, each operation succeeds/fails independently.

## Change Detection

### CDC (Change Data Capture)
`GET /v3/company/{realmId}/cdc?entities=Invoice,Customer&changedSince={ISO8601}`
- Returns full entity data for changed entities (up to 30 days back)
- Deleted entities return only `Id` with `status: "Deleted"`
- Max 1000 entities per response

### Webhooks
- POST notifications when data changes; respond 200 OK within 1 second
- Process asynchronously; verify `intuit-signature` header
- Operations: `Create`, `Update`, `Delete`, `Merge`

| Use Case | Recommendation |
|----------|---------------|
| Real-time sync | Webhooks |
| Periodic/bulk sync | CDC |
| Backup/redundancy | Both (webhooks primary, CDC backup) |

## Error Reference

| Code | Error | Fix |
|------|-------|-----|
| **3200** | Stale Object (SyncToken mismatch) | Re-read entity for latest SyncToken, retry |
| **6000** | Business Validation Error | Check required fields, TotalAmt, duplicate DocNumber |
| **3100** | Invalid Reference | Verify referenced entity exists (CustomerRef, ItemRef) |
| **6240** | Duplicate Name | Use unique DisplayName for Customer/Item |
| **610** | Object Not Found | Verify entity ID exists |
| **4001** | Invalid Token | Refresh access token |
| **401** | Unauthorized | Token expired — refresh and retry |
| **429** | Rate Limited | Exponential backoff with jitter |
| **500/503** | Server Error | Retry once with backoff |

**Important:** Even 200 OK responses can contain a `Fault` element — always check response body.

### Retry Pattern
```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await fn(); }
    catch (error) {
      const status = error.response?.status;
      if (status >= 500 && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### Safe Update Pattern (SyncToken)
```python
def safe_update(realm_id, entity_id, changes, access_token, max_attempts=3):
    for attempt in range(max_attempts):
        entity = read_entity(realm_id, entity_id, access_token)
        entity.update(changes)
        entity['sparse'] = True
        try:
            return update_entity(realm_id, entity, access_token)
        except SyncTokenError:
            if attempt == max_attempts - 1:
                raise
            continue  # Retry with fresh SyncToken
```

## Report Endpoints

Reports are not standard CRUD. Access via `GET /v3/company/{realmId}/reports/{ReportName}`.

**Common Reports:** `BalanceSheet`, `ProfitAndLoss`, `AgedReceivables`, `CustomerIncome`
**Params:** `start_date`, `end_date`, `accounting_method` (Cash/Accrual)

## Best Practices Summary

1. **Always use SyncToken** for updates — read before write
2. **Use sparse updates** to avoid overwriting fields
3. **Use batch operations** for bulk changes (up to 30 per request)
4. **Implement CDC + webhooks** for reliable data sync
5. **Cache reference data** (payment methods, tax codes, accounts)
6. **Paginate** large result sets (MAXRESULTS + STARTPOSITION)
7. **Refresh tokens proactively** at ~50 min, not at expiry
8. **Handle 401 automatically** with refresh-and-retry
9. **Exponential backoff** for 429 and 5xx errors
10. **Check response body** for Fault elements even on 200 OK

## Additional Resources

- For full entity field reference and CRUD patterns, see [reference.md](reference.md)
- For common workflow patterns with code examples, see [workflows.md](workflows.md)
- For error handling and debugging strategies, see [troubleshooting.md](troubleshooting.md)
- **Context7 Library ID:** `/websites/developer_intuit_app_developer_qbo`
- **API Explorer:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
- **Developer Dashboard:** https://developer.intuit.com/app/developer/myapps

### SDKs
- **Node.js:** https://github.com/intuit/intuit-oauth (OAuth) + axios for API calls
- **Python:** https://github.com/intuit/intuit-oauth-python (OAuth) + requests
- **Java:** https://github.com/intuit/QuickBooks-V3-Java-SDK
- **PHP:** https://github.com/intuit/QuickBooks-V3-PHP-SDK
- **C#/.NET:** https://github.com/intuit/QuickBooks-V3-DotNET-SDK
