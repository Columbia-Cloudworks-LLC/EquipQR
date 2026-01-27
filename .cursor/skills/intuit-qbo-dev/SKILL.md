---
name: intuit-qbo-dev
description: Expert guide for developing, debugging, and interacting with the Intuit QuickBooks Online API (v3). Use when writing QBO integration code, debugging API errors (Business Validation Error, Stale Object Error), handling OAuth2 tokens and realms, generating reports, or working with QBO Data Services queries. Applies to Node.js, Python, C#, and Deno implementations.
---

# Intuit QuickBooks Online (QBO) Developer Skill

## When to Use
Use this skill when:
- Writing code to integrate with QuickBooks Online (Node.js, Python, C#, Deno)
- Debugging QBO API errors (e.g., "Business Validation Error", "Stale Object")
- Generating reports or SQL-like queries for QBO Data Services
- Handling OAuth2 tokens and realms for Intuit
- Working with QBO invoices, customers, items, or other entities
- Troubleshooting SyncToken or sparse update issues

## Critical API Context (Read First)
1.  **Minor Versions:** QBO is versioned. Many fields (e.g., `TaxCodeRef` in Lines) require a specific `minorversion` query param (e.g., `?minorversion=70`). Always check if a missing field requires a minor version bump.
2.  **Sparse Updates:** QBO uses "Sparse Updates." To update a field without erasing others, you must set `sparse: true` in the request body and include the `Id` and `SyncToken`.
3.  **SyncTokens:** You cannot update an object without the latest `SyncToken`. You must Read the object first to get the token, then send it back in the Update request.

## Common Operations & Code Patterns

### 1. Authentication (OAuth2)
*Standard pattern using `intuit-oauth` (Node.js) or `python-quickbooks`.*
- **Scopes:** `com.intuit.quickbooks.accounting` (Accounting), `com.intuit.quickbooks.payment` (Payments).
- **Tokens:** Access tokens live for 60 mins; Refresh tokens for 100 days. Always implement auto-refresh logic.

### 2. The Query Language (SQL-like)
*QBO uses a subset of SQL. Usage:*
- `SELECT * FROM Customer WHERE Active = true`
- `SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime > '2023-01-01'`
- **Warning:** You cannot use `JOIN` or `GROUP BY`. You must query extensively and filter in application logic.

### 3. Creating an Invoice (JSON Structure)
Required fields for a minimal Invoice:
```json
{
  "Line": [
    {
      "DetailType": "SalesItemLineDetail",
      "Amount": 100.00,
      "SalesItemLineDetail": {
        "ItemRef": { "value": "1", "name": "Services" }
      }
    }
  ],
  "CustomerRef": { "value": "1" }
}
```

## Debugging Guide

| Error Code | Meaning | Fix |
| --- | --- | --- |
| **6000** | Business Validation Error | You are missing a required field (check `CustomerRef`) or using a duplicate Document Number (`DocNumber`). |
| **5010** | Stale Object Error | The `SyncToken` is old. Fetch the object again to get the new `SyncToken`, then retry the update. |
| **401** | Unauthorized | Token expired. Use the Refresh Token to get a new Access Token. |

## Report Endpoints

Reports are not standard CRUD. They are accessed via `/reports/<ReportName>`.

* **Common Reports:** `BalanceSheet`, `ProfitAndLoss`, `AgedReceivables`, `CustomerIncome`.
* **Params:** `start_date`, `end_date`, `accounting_method` (Cash/Accrual).
