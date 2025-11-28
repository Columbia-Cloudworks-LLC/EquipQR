# EquipQR™ API Reference

## Overview

EquipQR™ uses Supabase for its backend API, providing RESTful endpoints for all data operations. This document outlines the key API patterns, authentication, and data models used throughout the application.

## Authentication

All API requests require authentication through Supabase Auth. The application supports:

- **Email/Password Authentication**
- **Magic Link Authentication** 
- **OAuth Providers** (configurable)

### Authentication Headers

```http
Authorization: Bearer <jwt_token>
apikey: <supabase_anon_key>
```

### Getting Authentication Token

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get current session
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Core Data Models

### Equipment

```typescript
interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: 'active' | 'maintenance' | 'inactive';
  location: string;
  installation_date: string;
  warranty_expiration: string | null;
  last_maintenance: string | null;
  notes: string | null;
  custom_attributes: Record<string, any> | null;
  image_url: string | null;
  last_known_location: {
    latitude: number;
    longitude: number;
    address?: string;
    timestamp?: string;
  } | null;
  team_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}
```

### Work Orders

```typescript
interface WorkOrder {
  id: string;
  title: string;
  description: string;
  equipment_id: string;
  organization_id: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assignee_id: string | null;
  team_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  estimated_hours: number | null;
  completed_at: string | null;
}
```

### Organizations

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
```

### Teams

```typescript
interface Team {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}
```

## API Endpoints

### Equipment Endpoints

#### Get All Equipment
```http
GET /rest/v1/equipment
```

**Query Parameters:**
- `organization_id=eq.<id>` - Filter by organization
- `status=eq.<status>` - Filter by status
- `team_id=eq.<id>` - Filter by team
- `limit=<number>` - Limit results
- `offset=<number>` - Pagination offset

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Equipment Name",
    "manufacturer": "Manufacturer",
    "model": "Model",
    "serial_number": "SN123456",
    "status": "active",
    "location": "Building A",
    "organization_id": "org-uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Equipment by ID
```http
GET /rest/v1/equipment?id=eq.<equipment_id>
```

#### Create Equipment
```http
POST /rest/v1/equipment
Content-Type: application/json

{
  "name": "New Equipment",
  "manufacturer": "Manufacturer",
  "model": "Model",
  "serial_number": "SN123456",
  "status": "active",
  "location": "Building A",
  "organization_id": "org-uuid"
}
```

#### Update Equipment
```http
PATCH /rest/v1/equipment?id=eq.<equipment_id>
Content-Type: application/json

{
  "status": "maintenance",
  "location": "Maintenance Bay"
}
```

#### Delete Equipment
```http
DELETE /rest/v1/equipment?id=eq.<equipment_id>
```

### Work Order Endpoints

#### Get All Work Orders
```http
GET /rest/v1/work_orders
```

**Query Parameters:**
- `organization_id=eq.<id>` - Filter by organization
- `status=eq.<status>` - Filter by status
- `assignee_id=eq.<id>` - Filter by assignee
- `equipment_id=eq.<id>` - Filter by equipment
- `priority=eq.<priority>` - Filter by priority

#### Create Work Order
```http
POST /rest/v1/work_orders
Content-Type: application/json

{
  "title": "Routine Maintenance",
  "description": "Perform routine maintenance check",
  "equipment_id": "equipment-uuid",
  "priority": "medium",
  "organization_id": "org-uuid",
  "due_date": "2024-12-31T23:59:59Z"
}
```

#### Update Work Order Status
```http
PATCH /rest/v1/work_orders?id=eq.<work_order_id>
Content-Type: application/json

{
  "status": "in_progress",
  "assignee_id": "user-uuid"
}
```

### Organization Endpoints

#### Get Organization
```http
GET /rest/v1/organizations?id=eq.<org_id>
```

#### Get Organization Members
```http
GET /rest/v1/organization_members?organization_id=eq.<org_id>
```

### Team Endpoints

#### Get Teams
```http
GET /rest/v1/teams?organization_id=eq.<org_id>
```

#### Get Team Members
```http
GET /rest/v1/team_members?team_id=eq.<team_id>
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "code": "error_code",
    "details": "Additional details"
  }
}
```

### Common Error Codes

- `PGRST301` - Row Level Security violation
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `42501` - Insufficient privilege

## Rate Limiting

Supabase enforces rate limiting based on your plan:

- **Free Tier**: 200 requests per minute
- **Pro Tier**: 1000 requests per minute
- **Team/Enterprise**: Custom limits

## Real-time Subscriptions

Subscribe to real-time changes using Supabase Realtime:

```typescript
// Subscribe to equipment changes
const subscription = supabase
  .channel('equipment_changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'equipment',
      filter: `organization_id=eq.${orgId}`
    }, 
    (payload) => {
      console.log('Equipment change:', payload);
    }
  )
  .subscribe();

// Unsubscribe when done
subscription.unsubscribe();
```

## Pagination

Use `limit` and `offset` for pagination:

```http
GET /rest/v1/equipment?limit=10&offset=20
```

Or use `Range` headers:

```http
GET /rest/v1/equipment
Range: 0-9
```

## Filtering and Sorting

### Filtering Examples

```http
# Exact match
GET /rest/v1/equipment?status=eq.active

# Not equal
GET /rest/v1/equipment?status=neq.inactive

# Greater than
GET /rest/v1/equipment?created_at=gt.2024-01-01

# In list
GET /rest/v1/equipment?status=in.(active,maintenance)

# Text search
GET /rest/v1/equipment?name=ilike.*pump*
```

### Sorting Examples

```http
# Ascending
GET /rest/v1/equipment?order=created_at.asc

# Descending
GET /rest/v1/equipment?order=created_at.desc

# Multiple columns
GET /rest/v1/equipment?order=status.asc,created_at.desc
```

## Security Considerations

1. **Row Level Security (RLS)** is enabled on all tables
2. Users can only access data from their organization
3. Role-based permissions control data access
4. API keys should be stored securely
5. Use HTTPS for all requests
6. Implement proper error handling to avoid information leakage

## SDK Usage Examples

### React Hook Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch equipment
const useEquipment = (orgId: string) => {
  return useQuery({
    queryKey: ['equipment', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', orgId);
      
      if (error) throw error;
      return data;
    }
  });
};

// Create equipment
const useCreateEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (equipment: Partial<Equipment>) => {
      const { data, error } = await supabase
        .from('equipment')
        .insert(equipment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    }
  });
};
```

This API reference provides the foundation for understanding and integrating with the EquipQR™ backend services.
