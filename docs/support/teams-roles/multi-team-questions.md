---
title: "Common questions about teams and roles"
description: "Quick answers to the most common questions about multi-team membership, team locations, and customer access."
lastReviewed: 2026-07-04
personas: ["all"]
---

**For:** Everyone  
**Last reviewed:** 2026-07-04

## 1. Can a technician be in multiple teams?

Yes. Internal technicians are usually added to every team whose equipment they service. Customers (Requestors, Viewers) should be on exactly one team.

## 2. Can customers see each other's data?

No. Team membership is fully isolated — a Requestor on Team A cannot see Team B's equipment or work orders, even if the same organization owns both teams.

## 3. What happens if an organization Admin is also on a team?

Their organization role overrides the team role when they act at the organization level. Within a team, their team role drives what they see first in that team's views.

## 4. Who should be an Owner versus an Admin?

Keep exactly one Owner for billing and legal actions. Every other administrator should be an Admin — that lets them do day-to-day work without risking account deletion.

## 5. When does a team location override equipment pins?

Teams can store a HQ address on the team detail page. When **Override equipment location** is enabled for that team, equipment that still opts into team fallback shows the team HQ on Fleet Map and in the location source dropdown.

![Team location editor](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/08-team-location-editor.png)

Saving an equipment assigned address or live GPS capture always takes precedence and turns off team fallback for that asset. See [Equipment location sources and maps](../equipment-qr/location-sources-and-maps).

## Related articles

- [Equipment location sources and maps](../equipment-qr/location-sources-and-maps)
