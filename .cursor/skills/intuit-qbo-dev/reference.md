# QBO API Entity & Operations Reference

## Customer

Represents customers and sub-customers (jobs).

**Key Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `Id` | string (read-only) | Unique identifier |
| `DisplayName` | string (required) | Must be unique |
| `GivenName`, `FamilyName` | string | First and last name |
| `CompanyName` | string | Business customers |
| `PrimaryEmailAddr` | object | `{ "Address": "email@example.com" }` |
| `PrimaryPhone` | object | `{ "FreeFormNumber": "(555) 123-4567" }` |
| `BillAddr`, `ShipAddr` | object | Address objects |
| `Balance` | decimal (read-only) | Outstanding balance |
| `Active` | boolean | Whether active |
| `SyncToken` | string (required for updates) | Optimistic locking |

**Reference:** `CustomerRef: { "value": "123", "name": "Customer Name" }`

## Invoice

Represents sales invoices sent to customers.

**Key Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `Id` | string (read-only) | Unique identifier |
| `DocNumber` | string | Invoice number (auto-generated if omitted) |
| `TxnDate` | date | YYYY-MM-DD format |
| `DueDate` | date | Payment due date |
| `CustomerRef` | object (required) | `{ "value": "customerId" }` |
| `Line` | array (required) | Invoice line items |
| `TotalAmt` | decimal (read-only) | Calculated total |
| `Balance` | decimal (read-only) | Unpaid balance |
| `EmailStatus` | enum | `NotSet`, `NeedToSend`, `EmailSent` |
| `BillEmail` | object | Delivery email |
| `TxnTaxDetail` | object | Tax calculation details |
| `LinkedTxn` | array | Linked transactions (payments, credit memos) |
| `SyncToken` | string (required for updates) | Optimistic locking |

### Line Items Structure

```json
{
  "Line": [
    {
      "Amount": 100.00,
      "DetailType": "SalesItemLineDetail",
      "SalesItemLineDetail": {
        "ItemRef": { "value": "1", "name": "Services" },
        "Qty": 1,
        "UnitPrice": 100.00,
        "TaxCodeRef": { "value": "TAX" }
      }
    },
    {
      "Amount": 100.00,
      "DetailType": "SubTotalLineDetail",
      "SubTotalLineDetail": {}
    }
  ]
}
```

## Payment

Represents payments received from customers.

**Key Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `Id` | string (read-only) | Unique identifier |
| `TotalAmt` | decimal (required) | Total payment amount |
| `CustomerRef` | object (required) | Customer reference |
| `PaymentMethodRef` | object | Payment method (cash, check, etc.) |
| `PaymentRefNum` | string | Check number or transaction ID |
| `TxnDate` | date | Payment date |
| `DepositToAccountRef` | object | Bank account for deposit |
| `Line` | array | Payment application to invoices |
| `UnappliedAmt` | decimal (read-only) | Amount not applied to invoices |
| `SyncToken` | string (required for updates) | Optimistic locking |

### Payment Line (Applied to Invoice)

```json
{
  "Line": [{
    "Amount": 100.00,
    "LinkedTxn": [{ "TxnId": "123", "TxnType": "Invoice" }]
  }]
}
```

## Item

Represents products or services sold.

**Types:** `Service`, `Inventory`, `NonInventory`, `Category`

**Key Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `Id` | string (read-only) | Unique identifier |
| `Name` | string (required) | Must be unique |
| `Type` | enum (required) | Service, Inventory, NonInventory, Category |
| `Description` | string | Item description |
| `UnitPrice` | decimal | Sales price |
| `PurchaseCost` | decimal | Purchase/cost price |
| `IncomeAccountRef` | object (required) | Income account reference |
| `ExpenseAccountRef` | object | Expense account for purchases |
| `TrackQtyOnHand` | boolean | Track inventory quantity |
| `QtyOnHand` | decimal | Current inventory quantity |
| `Active` | boolean | Whether active |

## Account

Represents chart of accounts entries.

**Key Fields:**
| Field | Type | Notes |
|-------|------|-------|
| `Id` | string (read-only) | Unique identifier |
| `Name` | string (required) | Account name |
| `AccountType` | enum (required) | Bank, AR, AP, Income, Expense, etc. |
| `AccountSubType` | enum | CashOnHand, Checking, Savings, etc. |
| `CurrentBalance` | decimal (read-only) | Current balance |
| `Active` | boolean | Whether active |
| `Classification` | enum | Asset, Liability, Equity, Revenue, Expense |

**Common Account Types:** `Bank`, `Accounts Receivable`, `Accounts Payable`, `Income`, `Expense`, `Other Current Asset`, `Fixed Asset`

---

## CRUD Operations Detail

### Create Pattern

**Endpoint:** `POST /v3/company/{realmId}/{entityName}`

```python
import requests

url = f"https://sandbox-quickbooks.api.intuit.com/v3/company/{realm_id}/invoice"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

invoice_data = {
    "Line": [{
        "Amount": 100.00,
        "DetailType": "SalesItemLineDetail",
        "SalesItemLineDetail": { "ItemRef": {"value": "1"} }
    }],
    "CustomerRef": {"value": "1"}
}

response = requests.post(url, json=invoice_data, headers=headers)
if response.status_code == 200:
    invoice = response.json()['Invoice']
```

### Read Pattern

**Single Entity:** `GET /v3/company/{realmId}/{entityName}/{entityId}`

```javascript
const axios = require('axios');

async function readCustomer(realmId, customerId, accessToken) {
  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/customer/${customerId}`;
  const response = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
  });
  return response.data.Customer;
}
```

### Update Pattern (Sparse)

Always read first to get `SyncToken`, then send sparse update:

```python
def sparse_update_customer(realm_id, customer_id, sync_token, new_email, access_token):
    url = f"https://sandbox-quickbooks.api.intuit.com/v3/company/{realm_id}/customer"
    customer_data = {
        "Id": customer_id,
        "SyncToken": sync_token,
        "sparse": True,
        "PrimaryEmailAddr": { "Address": new_email }
    }
    response = requests.post(url, json=customer_data, headers=headers)
    return response.json()['Customer']
```

### Delete Pattern

**Soft delete** (most entities):
```json
{ "Id": "123", "SyncToken": "2", "sparse": true, "Active": false }
```

**Hard delete** (limited entities):
`POST /v3/company/{realmId}/{entityName}?operation=delete`
```json
{ "Id": "123", "SyncToken": "2" }
```

---

## Query Language Detail

**Endpoint:** `GET /v3/company/{realmId}/query?query={urlEncodedSQL}`

### Operators
- `=`: Equals
- `<`, `>`, `<=`, `>=`: Comparison
- `IN`: Match any in list
- `LIKE`: Pattern matching (`%` wildcard only)

### Examples

```sql
-- Customers by name pattern
SELECT * FROM Customer WHERE DisplayName LIKE 'Acme%'

-- Invoices by date range
SELECT * FROM Invoice WHERE TxnDate >= '2024-01-01' AND TxnDate <= '2024-12-31'

-- Ordered and paginated
SELECT * FROM Customer WHERE Active = true ORDERBY DisplayName
SELECT * FROM Invoice STARTPOSITION 1 MAXRESULTS 100

-- Overdue invoices
SELECT * FROM Invoice WHERE Balance > '0' AND DueDate < '2024-12-01' ORDERBY DueDate

-- By customer reference
SELECT * FROM Invoice WHERE CustomerRef = '42' ORDERBY TxnDate DESC
```

### Pagination Pattern

```python
def query_all(realm_id, entity_type, access_token):
    all_entities = []
    start = 1
    max_results = 1000
    while True:
        query = f"SELECT * FROM {entity_type} STARTPOSITION {start} MAXRESULTS {max_results}"
        entities = execute_query(realm_id, query, access_token)
        if not entities:
            break
        all_entities.extend(entities)
        if len(entities) < max_results:
            break
        start += max_results
    return all_entities
```

---

## Batch Operations Detail

**Endpoint:** `POST /v3/company/{realmId}/batch` — Up to 30 operations.

### Operation Types
- `create`: Create new entity
- `update`: Update existing entity
- `delete`: Delete entity
- `query`: Execute query

### Request Structure

```json
{
  "BatchItemRequest": [
    {
      "bId": "bid1",
      "operation": "create",
      "Customer": { "DisplayName": "New Customer 1" }
    },
    {
      "bId": "bid2",
      "operation": "update",
      "Invoice": { "Id": "123", "SyncToken": "1", "sparse": true, "EmailStatus": "NeedToSend" }
    },
    {
      "bId": "bid3",
      "operation": "query",
      "Query": "SELECT * FROM Customer WHERE Active = true MAXRESULTS 10"
    }
  ]
}
```

### Response Structure

```json
{
  "BatchItemResponse": [
    { "bId": "bid1", "Customer": { "Id": "456", "DisplayName": "New Customer 1" } },
    { "bId": "bid2", "Invoice": { "Id": "123", "SyncToken": "2" } },
    { "bId": "bid3", "QueryResponse": { "Customer": [...] } }
  ]
}
```

### Processing Batch Results

```javascript
function processBatchResults(results) {
  const succeeded = [], failed = [];
  results.forEach(result => {
    if (result.Fault) {
      failed.push({ bId: result.bId, error: result.Fault });
    } else {
      const entityType = Object.keys(result).find(k => k !== 'bId');
      succeeded.push({ bId: result.bId, entityType, entity: result[entityType] });
    }
  });
  return { succeeded, failed };
}
```

### Batch in Chunks (>30 items)

```python
async def execute_batch_chunked(realm_id, batch_items, access_token):
    results = []
    for i in range(0, len(batch_items), 30):
        chunk = batch_items[i:i+30]
        response = await post_batch(realm_id, {"BatchItemRequest": chunk}, access_token)
        results.extend(response['BatchItemResponse'])
    return results
```

---

## Change Data Capture (CDC)

**Endpoint:** `GET /v3/company/{realmId}/cdc?entities={list}&changedSince={ISO8601}`

```python
from datetime import datetime, timedelta

def get_changed_entities(realm_id, entity_types, since, access_token):
    params = {
        'entities': ','.join(entity_types),
        'changedSince': since.strftime('%Y-%m-%dT%H:%M:%S-07:00')
    }
    url = f"https://sandbox-quickbooks.api.intuit.com/v3/company/{realm_id}/cdc"
    response = requests.get(url, params=params,
        headers={"Authorization": f"Bearer {access_token}"})
    return response.json()['CDCResponse']
```

### CDC Response Structure

```json
{
  "CDCResponse": [{
    "QueryResponse": [{
      "Invoice": [
        { "Id": "123", "TotalAmt": 100.00, "Balance": 50.00 }
      ]
    }]
  }, {
    "QueryResponse": [{
      "Customer": [
        { "Id": "456", "status": "Deleted" }
      ]
    }]
  }]
}
```

### CDC Best Practices
- Max 1000 entities per response — query shorter periods
- Store `LastUpdatedTime` to set next `changedSince`
- Deleted entities only contain ID with `status: "Deleted"`
- CDC returns full payload (not just changed fields)

---

## Webhooks

### Notification Payload

```json
{
  "eventNotifications": [{
    "realmId": "123456789",
    "dataChangeEvent": {
      "entities": [
        { "name": "Invoice", "id": "145", "operation": "Create", "lastUpdated": "..." },
        { "name": "Customer", "id": "789", "operation": "Merge", "deletedId": "788" }
      ]
    }
  }]
}
```

### Handler Pattern (Node.js)

```javascript
app.post('/webhooks/quickbooks', async (req, res) => {
  const signature = req.headers['intuit-signature'];
  // Verify signature
  res.status(200).send('OK');  // Return 200 immediately
  processWebhook(req.body).catch(console.error);  // Process async
});
```

---

## Multi-currency

When multicurrency is enabled, include `CurrencyRef` in transactions:

```json
{
  "CurrencyRef": { "value": "USD", "name": "United States Dollar" },
  "ExchangeRate": 1.0
}
```

- API automatically applies exchange rates
- Home currency amounts calculated automatically
- Locale-specific requirements vary (France: DocNumber, UK: VAT)
