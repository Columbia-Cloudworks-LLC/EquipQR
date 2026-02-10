# QBO Troubleshooting & Error Handling

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| **200** | Success (but may contain `Fault` in body) | Always check response body |
| **400** | Bad Request | Invalid syntax or malformed request |
| **401** | Unauthorized | Token expired — refresh and retry |
| **403** | Forbidden | Insufficient permissions or restricted resource |
| **404** | Not Found | Resource doesn't exist |
| **429** | Rate Limited | Exponential backoff with jitter |
| **500** | Internal Server Error | Retry once with backoff |
| **503** | Service Unavailable | Retry with exponential backoff |

## Fault Types

Even with 200 OK, response may contain a `Fault` element:

```json
{
  "Fault": {
    "Error": [{
      "Message": "Duplicate Name Exists Error",
      "Detail": "The name supplied already exists.",
      "code": "6240",
      "element": "Customer.DisplayName"
    }],
    "type": "ValidationFault"
  }
}
```

| Fault Type | Cause | Fix |
|-----------|-------|-----|
| **ValidationFault** | Invalid data or business rule violation | Correct request payload, check required fields |
| **SystemFault** | Server-side error | Retry request |
| **AuthenticationFault** | Invalid credentials | Refresh access token, re-authenticate |
| **AuthorizationFault** | Insufficient permissions | Check OAuth scopes, ensure admin access |

## Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| **3200** | Stale Object (SyncToken mismatch) | Re-read entity for latest SyncToken, retry |
| **6000** | Business Validation Error | Check TotalAmt, required fields, duplicate DocNumber |
| **3100** | Invalid Reference | Verify referenced entity exists (CustomerRef, ItemRef) |
| **6240** | Duplicate Name | Use unique DisplayName for Customer/Item |
| **610** | Object Not Found | Verify entity ID exists |
| **4001** | Invalid Token | Refresh access token |

### Java SDK Exception Types
- `ValidationException`: Validation faults
- `ServiceException`: Service faults
- `AuthenticationException`: Auth faults
- `BadRequestException`: 400 status
- `InvalidTokenException`: 401 status
- `InternalServiceException`: 500 status

---

## Troubleshooting Specific Issues

### SyncToken Mismatch (Error 3200)

**Symptom:** "stale object error" when updating entities
**Cause:** SyncToken doesn't match current version (concurrent modification)

```python
def safe_update_with_retry(entity_type, entity_id, updates, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            entity = read_entity(entity_type, entity_id)
            entity.update(updates)
            entity['sparse'] = True
            return update_entity(entity_type, entity)
        except SyncTokenError:
            if attempt == max_attempts - 1:
                raise
            continue  # Retry with fresh SyncToken
```

### Required Field Missing (Error 6000)

**Symptom:** "business validation error" or "required field missing"

**Common Required Fields:**
- **Customer:** `DisplayName` (must be unique)
- **Invoice:** `CustomerRef`, `Line` (at least one)
- **Payment:** `TotalAmt`, `CustomerRef`
- **Item:** `Name`, `Type`, `IncomeAccountRef` (for Service)

**Fix:** Validate data locally before API call. Check for duplicate DocNumber.

### OAuth Token Expiration (401)

**Symptom:** "invalid_token" or "token_expired"

```javascript
async function apiCallWithAutoRefresh(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.response?.status === 401) {
      await refreshAccessToken();
      return await apiFunction();  // Retry with new token
    }
    throw error;
  }
}
```

**Prevention:**
- Refresh proactively at ~50 min mark
- Store token expiry time and check before requests
- Handle 401 responses automatically

### Invalid Reference (Error 3100)

**Symptom:** "object not found" when referencing CustomerRef, ItemRef, etc.

```python
def validate_reference(entity_type, entity_id, access_token):
    """Verify entity exists before creating reference"""
    try:
        read_entity(entity_type, entity_id, access_token)
        return True
    except NotFoundError:
        return False

# Before creating invoice
if validate_reference('Customer', customer_id, token):
    if validate_reference('Item', item_id, token):
        create_invoice(customer_id, item_id)
```

### Rate Limiting (429)

**Symptom:** "throttle_limit_exceeded"

```python
import time, random

def api_call_with_backoff(api_function, max_retries=5):
    for attempt in range(max_retries):
        try:
            return api_function()
        except RateLimitError:
            if attempt == max_retries - 1:
                raise
            delay = (2 ** attempt) + random.uniform(0, 1)  # Jitter
            time.sleep(delay)
```

**Prevention:**
- Use batch operations (1 call vs 30)
- Implement request queuing
- Cache frequently accessed reference data

### Batch Operation Partial Failures

**Symptom:** Some operations in batch fail, others succeed

Each batch operation is independent — one failure doesn't affect others.

```javascript
function processBatchResults(results) {
  const failed = results.filter(r => r.Fault);
  const succeeded = results.filter(r => !r.Fault);

  // Retry failed operations individually
  for (const failure of failed) {
    console.error(`Failed ${failure.bId}: ${failure.Fault.Error[0].Message}`);
    // Re-read entity, get fresh SyncToken, retry
  }
  return { succeeded, failed };
}
```

### Multi-currency Validation Errors

**Symptom:** "currency not enabled" or "exchange rate required"

**Fix:**
- Verify multi-currency is enabled in QBO company preferences
- Include `CurrencyRef` when multi-currency is enabled:
```json
{ "CurrencyRef": { "value": "USD", "name": "United States Dollar" } }
```
- For foreign currency, API calculates exchange rate automatically

### Webhook Not Receiving Notifications

**Symptom:** Endpoint configured but no POST requests

**Checklist:**
1. Endpoint is publicly accessible (not localhost)
2. Using HTTPS (required)
3. Responding within 1 second (return 200 OK immediately, process async)
4. Test with sample payload:
```bash
curl -X POST https://yourapp.com/webhooks/quickbooks \
  -H "Content-Type: application/json" \
  -d '{"eventNotifications":[]}'
```
5. Check webhook logs in developer dashboard

### Deleted Entities in CDC Response

**Symptom:** Entities with `status: "Deleted"` only contain ID

**Fix:** CDC returns minimal data for deleted entities — only `Id` is available.

```python
def process_cdc_changes(changes):
    for entity in changes:
        if entity.get('status') == 'Deleted':
            handle_deletion(entity['Id'])  # Only ID available
        else:
            process_update(entity)  # Full entity data
```

---

## Retry Pattern with Exponential Backoff

```javascript
async function apiCallWithRetry(apiFunction, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      const status = error.response?.status;

      // Retry on server errors
      if (status >= 500 && status < 600 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry client errors (except 401 and 429)
      if (status === 401) {
        await refreshAccessToken();
        continue;
      }
      if (status === 429 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}
```

---

## Comprehensive Error Handler (Python)

```python
def handle_qbo_response(response):
    """Universal response handler for QBO API calls"""
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code
        if status == 401:
            raise TokenExpiredError("Access token expired — refresh needed")
        elif status == 429:
            raise RateLimitError("Rate limit exceeded — backoff needed")
        elif status >= 500:
            raise ServerError(f"QBO server error {status} — retry")
        else:
            raise ApiError(f"HTTP {status}: {e.response.text}")

    result = response.json()

    # Check for fault in response body (can appear with 200 OK)
    if 'Fault' in result:
        fault = result['Fault']
        fault_type = fault.get('type', 'Unknown')
        errors = fault.get('Error', [])
        error_codes = [e.get('code') for e in errors]
        error_messages = [e.get('Message') for e in errors]

        if '3200' in error_codes:
            raise SyncTokenError(f"Stale SyncToken: {error_messages}")
        elif '6240' in error_codes:
            raise DuplicateError(f"Duplicate name: {error_messages}")
        elif '3100' in error_codes:
            raise ReferenceError(f"Invalid reference: {error_messages}")
        elif '6000' in error_codes:
            raise ValidationError(f"Business validation: {error_messages}")
        else:
            raise ApiError(f"{fault_type}: {error_messages}")

    return result
```

---

## Debugging Strategies

1. **Check response body even with 200** — Fault elements can appear in successful responses
2. **Log `intuit_tid`** — Include in support requests for faster resolution
3. **Validate SyncToken** — Always use latest version from read operations
4. **Test in sandbox first** — Use sandbox companies for development
5. **Implement retry logic** — Exponential backoff for 500/503 errors
6. **Parse error details** — Check `error.code`, `element`, `message` fields
7. **Use batch operations** — Reduce API call volume, avoid rate limits
8. **Monitor API calls** — Track success/failure rates, alert on elevated errors
