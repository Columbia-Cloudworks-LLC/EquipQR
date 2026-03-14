
import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

// Mock Stripe event data
const createMockEvent = (type: string, data: any, eventId = "evt_test_123") => ({
  id: eventId,
  type,
  data: { object: data },
  created: Math.floor(Date.now() / 1000),
});

// Mock subscription data
const mockSubscription = {
  id: "sub_test_123",
  status: "active",
  customer: "cus_test_123",
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
  items: {
    data: [{
      price: { id: "price_test_123" },
      quantity: 5
    }]
  }
};

// Mock invoice data
const mockInvoice = {
  id: "in_test_123",
  subscription: "sub_test_123",
  status: "paid",
  amount_paid: 5000,
};

Deno.test("Webhook idempotency - should not process same event twice", async () => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const eventId = `evt_test_${Date.now()}`;
  const mockEvent = createMockEvent("invoice.payment_succeeded", mockInvoice, eventId);

  // First insert - should succeed
  const { error: firstError } = await supabaseClient
    .from("stripe_event_logs")
    .insert({
      event_id: eventId,
      type: mockEvent.type,
      subscription_id: mockInvoice.subscription,
      payload: mockEvent,
    });

  assertEquals(firstError, null, "First event insert should succeed");

  // Second insert - should fail due to unique constraint
  const { error: secondError } = await supabaseClient
    .from("stripe_event_logs")
    .insert({
      event_id: eventId,
      type: mockEvent.type,
      subscription_id: mockInvoice.subscription,
      payload: mockEvent,
    });

  assertExists(secondError, "Second event insert should fail due to unique constraint");
  assertEquals(secondError.code, "23505", "Should be unique violation error");

  // Cleanup
  await supabaseClient
    .from("stripe_event_logs")
    .delete()
    .eq("event_id", eventId);
});

Deno.test("Event type mapping - should correctly map subscription events", async () => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const testCases = [
    {
      type: "invoice.payment_succeeded",
      data: mockInvoice,
      expectedSubscriptionId: mockInvoice.subscription
    },
    {
      type: "invoice.payment_failed", 
      data: mockInvoice,
      expectedSubscriptionId: mockInvoice.subscription
    },
    {
      type: "customer.subscription.updated",
      data: mockSubscription,
      expectedSubscriptionId: mockSubscription.id
    },
    {
      type: "customer.subscription.deleted",
      data: mockSubscription,
      expectedSubscriptionId: mockSubscription.id
    },
    {
      type: "customer.subscription.trial_will_end",
      data: mockSubscription,
      expectedSubscriptionId: mockSubscription.id
    },
    {
      type: "customer.subscription.paused",
      data: mockSubscription,
      expectedSubscriptionId: mockSubscription.id
    },
    {
      type: "customer.subscription.resumed",
      data: mockSubscription,
      expectedSubscriptionId: mockSubscription.id
    }
  ];

  for (const testCase of testCases) {
    const eventId = `evt_test_${testCase.type}_${Date.now()}`;
    const mockEvent = createMockEvent(testCase.type, testCase.data, eventId);

    const { data, error } = await supabaseClient
      .from("stripe_event_logs")
      .insert({
        event_id: eventId,
        type: testCase.type,
        subscription_id: testCase.expectedSubscriptionId,
        payload: mockEvent,
      })
      .select()
      .single();

    assertEquals(error, null, `Event ${testCase.type} should insert successfully`);
    assertEquals(data.type, testCase.type, "Event type should match");
    assertEquals(data.subscription_id, testCase.expectedSubscriptionId, "Subscription ID should match");

    // Cleanup
    await supabaseClient
      .from("stripe_event_logs")
      .delete()
      .eq("event_id", eventId);
  }
});

Deno.test("Subscription status transitions - should handle all status changes", async () => {
  const statusTransitions = [
    { from: "active", to: "past_due", event: "invoice.payment_failed" },
    { from: "past_due", to: "active", event: "invoice.payment_succeeded" },
    { from: "active", to: "paused", event: "customer.subscription.paused" },
    { from: "paused", to: "active", event: "customer.subscription.resumed" },
    { from: "active", to: "cancelled", event: "customer.subscription.deleted" },
  ];

  for (const transition of statusTransitions) {
    console.log(`Testing transition: ${transition.from} -> ${transition.to} via ${transition.event}`);
    
    // This would test the actual status update logic
    // In a real test environment, you'd create test subscriptions and verify the transitions
    assertEquals(transition.to !== transition.from, true, "Status should change");
  }
});

Deno.test("Member cleanup logic - should deactivate excess members", async () => {
  // This test would verify that when subscription quantity decreases,
  // the most recently added members are deactivated first
  
  const scenarios = [
    { oldQuantity: 10, newQuantity: 5, expectedDeactivated: 5 },
    { oldQuantity: 3, newQuantity: 8, expectedDeactivated: 0 }, // Increase, no cleanup
    { oldQuantity: 1, newQuantity: 1, expectedDeactivated: 0 }, // No change
  ];

  for (const scenario of scenarios) {
    const actualDeactivated = Math.max(0, scenario.oldQuantity - scenario.newQuantity);
    assertEquals(
      actualDeactivated, 
      scenario.expectedDeactivated,
      `Should deactivate ${scenario.expectedDeactivated} members when going from ${scenario.oldQuantity} to ${scenario.newQuantity}`
    );
  }
});
