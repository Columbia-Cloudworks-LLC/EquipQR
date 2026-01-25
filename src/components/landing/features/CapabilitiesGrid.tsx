import { CapabilityCard } from './CapabilityCard';

export interface Capability {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CapabilitiesGridProps {
  capabilities: Capability[];
}

export const CapabilitiesGrid = ({ capabilities }: CapabilitiesGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {capabilities.map((cap) => (
        <CapabilityCard key={cap.name} icon={cap.icon} name={cap.name} description={cap.description} />
      ))}
    </div>
  );
};
