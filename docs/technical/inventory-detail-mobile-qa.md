# Inventory item detail — manual mobile QA

Use a narrow viewport (≤768px) or device emulation.

## Tab rail

- [ ] Tab row scrolls horizontally when tabs overflow; fade hints appear at left/right edges when content is clipped.
- [ ] Switching tabs applies a short panel transition; with **prefers-reduced-motion: reduce**, transitions are minimal or disabled.

## Adjust quantity

- [ ] **Adjust** opens a bottom sheet (not a centered modal) with a visible handle and rounded top.
- [ ] Add / Take actions are readable; **Cancel** is full-width below the reason field.
- [ ] Sheet dismisses via overlay tap, swipe (if supported), and **Cancel**.

## Header & overview

- [ ] Stock health badge (Healthy / Low stock / Out of stock) appears near the title.
- [ ] QR control is icon-first / low emphasis on mobile but still has an accessible name.
- [ ] Overview separates **Images** from the destructive **Delete** area (spacing + divider).

## Change history

- [ ] **Show details** / **Hide details** expands and collapses with motion; reduced-motion is respected.

## Empty fields (overview)

- [ ] Empty optional fields show an em dash (—) or subdued placeholder, not raw “Not set”.
