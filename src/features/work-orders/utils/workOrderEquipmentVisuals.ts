import {
  Cog,
  Shovel,
  Truck,
  Zap,
  Lightbulb,
  Mountain,
  Construction,
  type LucideIcon,
} from 'lucide-react';

export function getWorkOrderEquipmentFallbackIcon(equipmentName?: string): LucideIcon {
  const name = equipmentName?.toLowerCase() ?? '';
  if (name.includes('excavator')) return Shovel;
  if (name.includes('dozer') || name.includes('bulldozer')) return Mountain;
  if (name.includes('generator')) return Zap;
  if (name.includes('light tower') || name.includes('light plant')) return Lightbulb;
  if (name.includes('loader') || name.includes('truck') || name.includes('hauler')) return Truck;
  if (name.includes('crane') || name.includes('boom') || name.includes('forklift')) return Construction;
  return Cog;
}

export function getWorkOrderEquipmentFallbackTint(equipmentName?: string): string {
  const name = equipmentName?.toLowerCase() ?? '';
  if (name.includes('excavator')) return 'bg-amber-500/10';
  if (name.includes('dozer') || name.includes('bulldozer')) return 'bg-orange-500/10';
  if (name.includes('generator')) return 'bg-yellow-500/10';
  if (name.includes('light tower') || name.includes('light plant')) return 'bg-sky-500/10';
  if (name.includes('loader') || name.includes('truck') || name.includes('hauler')) return 'bg-emerald-500/10';
  if (name.includes('crane') || name.includes('boom') || name.includes('forklift')) return 'bg-violet-500/10';
  return 'bg-muted';
}

export function formatWorkOrderMachineHours(hours?: number | null): string | null {
  if (typeof hours !== 'number') return null;
  return `${hours.toLocaleString()} hrs`;
}

export function formatWorkOrderPriorityLabel(priority?: string): string {
  if (!priority) return 'Priority';
  return priority.replace('_', ' ');
}
