# QBO Common Workflows & Code Examples

## Workflow 1: Create and Send Invoice

### Steps
1. Query or create customer
2. Query items for line items
3. Create invoice with line items
4. Send invoice email

```python
import requests
from datetime import datetime, timedelta

class QuickBooksInvoice:
    def __init__(self, realm_id, access_token, base_url='https://sandbox-quickbooks.api.intuit.com'):
        self.realm_id = realm_id
        self.access_token = access_token
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def create_invoice(self, customer_id, line_items, due_days=30, tax_code='TAX', memo=None):
        txn_date = datetime.now().strftime('%Y-%m-%d')
        due_date = (datetime.now() + timedelta(days=due_days)).strftime('%Y-%m-%d')

        lines = []
        subtotal = 0
        for idx, item in enumerate(line_items, start=1):
            amount = item['quantity'] * item['unit_price']
            subtotal += amount
            lines.append({
                "LineNum": idx,
                "Amount": amount,
                "DetailType": "SalesItemLineDetail",
                "Description": item.get('description', ''),
                "SalesItemLineDetail": {
                    "ItemRef": {"value": item['item_id']},
                    "Qty": item['quantity'],
                    "UnitPrice": item['unit_price'],
                    "TaxCodeRef": {"value": tax_code}
                }
            })
        lines.append({"Amount": subtotal, "DetailType": "SubTotalLineDetail", "SubTotalLineDetail": {}})

        invoice_data = {
            "TxnDate": txn_date,
            "DueDate": due_date,
            "CustomerRef": {"value": customer_id},
            "BillEmail": {},
            "EmailStatus": "NeedToSend",
            "Line": lines
        }
        if memo:
            invoice_data["CustomerMemo"] = {"value": memo}

        url = f"{self.base_url}/v3/company/{self.realm_id}/invoice"
        response = requests.post(url, json=invoice_data, headers=self.headers)
        response.raise_for_status()
        result = response.json()

        if 'Fault' in result:
            raise Exception(f"Fault: {result['Fault']}")
        return result['Invoice']

    def send_invoice(self, invoice_id, email_address):
        url = f"{self.base_url}/v3/company/{self.realm_id}/invoice/{invoice_id}/send"
        response = requests.post(url, params={"sendTo": email_address}, headers=self.headers)
        response.raise_for_status()
        result = response.json()
        if 'Fault' in result:
            raise Exception(f"Fault: {result['Fault']}")
        return result['Invoice']

# Usage
mgr = QuickBooksInvoice(realm_id='123', access_token='token')
invoice = mgr.create_invoice(
    customer_id='42',
    line_items=[
        {'item_id': '1', 'quantity': 10, 'unit_price': 150.00, 'description': 'Consulting - Dec 2024'},
        {'item_id': '5', 'quantity': 1, 'unit_price': 500.00, 'description': 'Project management'}
    ],
    due_days=30,
    memo='Thank you for your business!'
)
mgr.send_invoice(invoice['Id'], 'customer@example.com')
```

---

## Workflow 2: Record Payment Against Invoice

### Steps
1. Query invoice by DocNumber
2. Create payment entity linked to invoice
3. Verify balance updates

```python
def record_payment(realm_id, invoice_id, customer_id, amount,
                   payment_method_id, check_number, access_token):
    payment_data = {
        "TotalAmt": amount,
        "CustomerRef": {"value": customer_id},
        "PaymentMethodRef": {"value": payment_method_id},
        "PaymentRefNum": check_number,
        "TxnDate": datetime.now().strftime('%Y-%m-%d'),
        "Line": [{
            "Amount": amount,
            "LinkedTxn": [{"TxnId": invoice_id, "TxnType": "Invoice"}]
        }]
    }
    url = f"{base_url}/v3/company/{realm_id}/payment"
    response = requests.post(url, json=payment_data, headers=headers)
    return response.json()['Payment']
```

### Apply Payment to Multiple Invoices

```python
def pay_multiple_invoices(realm_id, customer_id, total_paid, invoice_amounts, access_token):
    """invoice_amounts: list of {'invoice_id': str, 'amount': float}"""
    lines = [{
        "Amount": ia['amount'],
        "LinkedTxn": [{"TxnId": ia['invoice_id'], "TxnType": "Invoice"}]
    } for ia in invoice_amounts]

    payment_data = {
        "TotalAmt": total_paid,
        "CustomerRef": {"value": customer_id},
        "Line": lines
    }
    url = f"{base_url}/v3/company/{realm_id}/payment"
    response = requests.post(url, json=payment_data, headers=headers)
    return response.json()['Payment']

# Example: Pay two invoices with single check
payment = pay_multiple_invoices(realm_id, customer_id, 150.00,
    [{"invoice_id": "145", "amount": 100.00}, {"invoice_id": "146", "amount": 50.00}],
    access_token)
```

---

## Workflow 3: Customer Lifecycle Management

### Create Customer with Full Details

```python
def create_customer(realm_id, info, access_token):
    customer_data = {
        "DisplayName": info['display_name'],
        "GivenName": info.get('first_name'),
        "FamilyName": info.get('last_name'),
        "CompanyName": info.get('company_name'),
        "PrimaryEmailAddr": {"Address": info['email']},
        "PrimaryPhone": {"FreeFormNumber": info.get('phone')},
        "BillAddr": {
            "Line1": info['address_line1'],
            "City": info['city'],
            "CountrySubDivisionCode": info['state'],
            "PostalCode": info['zip']
        }
    }
    url = f"{base_url}/v3/company/{realm_id}/customer"
    response = requests.post(url, json=customer_data, headers=headers)
    return response.json()['Customer']
```

### Get Customer Transaction Summary

```python
def get_customer_transactions(realm_id, customer_id, access_token):
    invoices = query(f"SELECT * FROM Invoice WHERE CustomerRef = '{customer_id}'")
    payments = query(f"SELECT * FROM Payment WHERE CustomerRef = '{customer_id}'")
    estimates = query(f"SELECT * FROM Estimate WHERE CustomerRef = '{customer_id}'")

    total_invoiced = sum(inv['TotalAmt'] for inv in invoices)
    total_paid = sum(pmt['TotalAmt'] for pmt in payments)

    return {
        'invoices': invoices,
        'payments': payments,
        'estimates': estimates,
        'total_invoiced': total_invoiced,
        'total_paid': total_paid,
        'balance': total_invoiced - total_paid
    }
```

---

## Workflow 4: OAuth2 Token Management (Node.js)

Complete token management with automatic refresh:

```javascript
const OAuthClient = require('intuit-oauth');

class QuickBooksAuth {
  constructor(clientId, clientSecret, redirectUri, environment = 'sandbox') {
    this.oauthClient = new OAuthClient({
      clientId, clientSecret, environment, redirectUri
    });
    this.tokenExpiry = null;
    this.refreshTimer = null;
  }

  async storeTokens(authResponse) {
    const { access_token, refresh_token, expires_in } = authResponse.token;
    this.tokenExpiry = Date.now() + (expires_in * 1000);
    this.scheduleRefresh(expires_in - 300); // 5 min before expiry
    await this.saveToDatabase({ access_token, refresh_token, expiry: this.tokenExpiry });
  }

  scheduleRefresh(delaySeconds) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.refreshAccessToken(), delaySeconds * 1000);
  }

  async refreshAccessToken() {
    try {
      const authResponse = await this.oauthClient.refresh();
      await this.storeTokens(authResponse);
      return authResponse;
    } catch (error) {
      if (error.error === 'invalid_grant') {
        throw new Error('Re-authentication required');
      }
      throw error;
    }
  }

  async getAccessToken() {
    if (!this.accessToken || Date.now() >= (this.tokenExpiry - 300000)) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  async apiCall(url, options = {}) {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(url, {
        ...options,
        headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (response.status === 401) {
        await this.refreshAccessToken();
        const newToken = await this.getAccessToken();
        return fetch(url, {
          ...options,
          headers: { ...options.headers, 'Authorization': `Bearer ${newToken}`, 'Accept': 'application/json' }
        });
      }
      return response;
    } catch (error) {
      throw error;
    }
  }
}
```

---

## Workflow 5: Batch Sync with CDC

### Combined CDC + Batch Pattern

```python
class QuickBooksSync:
    def __init__(self, realm_id, access_token):
        self.realm_id = realm_id
        self.access_token = access_token
        self.last_sync = self.load_last_sync_time()

    def sync(self):
        # 1. Get changes via CDC
        changes = get_changed_entities(
            self.realm_id, ['Invoice', 'Customer', 'Payment'],
            self.last_sync, self.access_token
        )

        # 2. Build batch updates
        batch_items = self.build_batch(changes)
        if not batch_items:
            return {'message': 'No changes'}

        # 3. Execute in chunks of 30
        results = []
        for i in range(0, len(batch_items), 30):
            chunk = batch_items[i:i+30]
            response = execute_batch(self.realm_id, chunk, self.access_token)
            results.extend(response)

        # 4. Process results
        success = sum(1 for r in results if 'Fault' not in r)
        errors = sum(1 for r in results if 'Fault' in r)

        self.last_sync = datetime.now()
        self.save_last_sync_time()

        return {'total': len(results), 'success': success, 'errors': errors}

    def handle_webhook(self, notification):
        """Real-time webhook handler (primary)"""
        for entity in notification['dataChangeEvent']['entities']:
            self.process_entity_change(entity)
        self.last_sync = datetime.now()
```

---

## Workflow 6: Sparse Update (Node.js)

```javascript
class QuickBooksCustomer {
  constructor(realmId, accessToken, baseUrl = 'https://sandbox-quickbooks.api.intuit.com') {
    this.realmId = realmId;
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
  }

  async sparseUpdate(customerId, updates) {
    const customer = await this.readCustomer(customerId);
    const updateData = {
      Id: customerId, SyncToken: customer.SyncToken, sparse: true, ...updates
    };

    try {
      const url = `${this.baseUrl}/v3/company/${this.realmId}/customer`;
      const response = await axios.post(url, updateData, {
        headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' }
      });
      if (response.data.Fault) throw new Error(JSON.stringify(response.data.Fault));
      return response.data.Customer;
    } catch (error) {
      // Handle SyncToken mismatch with retry
      if (error.response?.data?.Fault?.Error?.[0]?.code === '3200') {
        return this.sparseUpdate(customerId, updates); // Retry with fresh token
      }
      throw error;
    }
  }

  // Convenience methods
  async updateEmail(id, email) {
    return this.sparseUpdate(id, { PrimaryEmailAddr: { Address: email } });
  }
  async updatePhone(id, phone) {
    return this.sparseUpdate(id, { PrimaryPhone: { FreeFormNumber: phone } });
  }
  async updateAddress(id, addr) {
    return this.sparseUpdate(id, {
      BillAddr: { Line1: addr.line1, City: addr.city, CountrySubDivisionCode: addr.state, PostalCode: addr.zip }
    });
  }
  async deactivate(id) {
    return this.sparseUpdate(id, { Active: false });
  }
}
```

---

## Workflow 7: Webhook Handler (Node.js)

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

app.post('/webhooks/quickbooks', async (req, res) => {
  const signature = req.headers['intuit-signature'];
  // Verify signature (recommended)

  res.status(200).send('OK');  // Must respond < 1 second

  // Process asynchronously
  for (const event of req.body.eventNotifications) {
    const realmId = event.realmId;
    for (const entity of event.dataChangeEvent.entities) {
      if (entity.operation !== 'Delete') {
        await fetchAndSync(realmId, entity.name, entity.id);
      } else {
        await handleDeletion(realmId, entity.name, entity.id);
      }
    }
  }
});
```
