import {
  Compass,
  HardHat,
  ClipboardList,
  QrCode,
  Package,
  Users,
  Settings2,
  ShieldCheck,
  Eye,
  Wrench,
  UserPlus,
  UserCheck,
  Shield,
  Globe2,
} from "lucide-react";

import type {
  SupportCategory,
  SupportCategoryId,
  SupportPersona,
  SupportPersonaMeta,
} from "./types";

export const SUPPORT_CATEGORIES: Record<SupportCategoryId, SupportCategory> = {
  "start-here": {
    id: "start-here",
    label: "Start Here",
    shortLabel: "Start",
    description: "New to EquipQR? Get oriented and set up your organization.",
    icon: Compass,
  },
  "technician-field-work": {
    id: "technician-field-work",
    label: "Technician Field Work",
    shortLabel: "Field",
    description:
      "Fast mobile-first workflows for technicians scanning equipment, running work orders, and documenting what they did.",
    icon: HardHat,
  },
  "work-orders": {
    id: "work-orders",
    label: "Work Orders",
    shortLabel: "Work Orders",
    description:
      "Create, assign, schedule, and close work orders across your teams.",
    icon: ClipboardList,
  },
  "equipment-qr": {
    id: "equipment-qr",
    label: "Equipment & QR Codes",
    shortLabel: "Equipment",
    description:
      "Add equipment, print QR codes, and keep records current so field scans always resolve.",
    icon: QrCode,
  },
  "inventory-parts": {
    id: "inventory-parts",
    label: "Inventory & Parts",
    shortLabel: "Inventory",
    description:
      "Track parts, delegate inventory to parts managers, and organize interchangeable components.",
    icon: Package,
  },
  "teams-roles": {
    id: "teams-roles",
    label: "Teams & Roles",
    shortLabel: "Teams",
    description:
      "Understand the Organization and Team role tiers and decide who should hold each role.",
    icon: Users,
  },
  "admin-integrations": {
    id: "admin-integrations",
    label: "Admin & Integrations",
    shortLabel: "Admin",
    description:
      "Organization administration, QuickBooks, and Google Workspace workflows for admins and owners.",
    icon: Settings2,
  },
  "privacy-support": {
    id: "privacy-support",
    label: "Privacy & Support",
    shortLabel: "Support",
    description:
      "Report issues, track your tickets, submit a privacy request, and use the audit log.",
    icon: ShieldCheck,
  },
};

export const SUPPORT_CATEGORY_ORDER: SupportCategoryId[] = [
  "start-here",
  "technician-field-work",
  "work-orders",
  "equipment-qr",
  "inventory-parts",
  "teams-roles",
  "admin-integrations",
  "privacy-support",
];

export const SUPPORT_PERSONAS: Record<SupportPersona, SupportPersonaMeta> = {
  technician: {
    id: "technician",
    label: "Technician",
    description: "Field workers executing work orders and maintenance on equipment.",
    icon: Wrench,
  },
  requestor: {
    id: "requestor",
    label: "Requestor",
    description:
      "Trusted customers or equipment owners who submit work requests by scanning a QR code.",
    icon: UserPlus,
  },
  manager: {
    id: "manager",
    label: "Manager",
    description:
      "Team managers who triage requests, assign technicians, and oversee their team's work.",
    icon: UserCheck,
  },
  admin: {
    id: "admin",
    label: "Admin",
    description:
      "Organization admins managing members, teams, equipment, and integrations.",
    icon: Shield,
  },
  owner: {
    id: "owner",
    label: "Owner",
    description: "Organization owners with full administrative control.",
    icon: Shield,
  },
  all: {
    id: "all",
    label: "Everyone",
    description: "Guidance that applies to every EquipQR user.",
    icon: Globe2,
  },
};

export const SUPPORT_PERSONA_ORDER: SupportPersona[] = [
  "all",
  "technician",
  "requestor",
  "manager",
  "admin",
  "owner",
];

export const SUPPORT_NON_ALL_PERSONAS: SupportPersona[] = [
  "technician",
  "requestor",
  "manager",
  "admin",
  "owner",
];

export const SUPPORT_PERSONA_BADGE_CLASS: Record<SupportPersona, string> = {
  technician: "bg-success/10 text-success border-success/30",
  requestor: "bg-warning/10 text-warning border-warning/30",
  manager: "bg-info/10 text-info border-info/30",
  admin: "bg-primary/10 text-primary border-primary/30",
  owner: "bg-primary/15 text-primary border-primary/40",
  all: "bg-muted text-muted-foreground border-border",
};

export const EyeIconForViewer = Eye;
