import type React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SUPPORT_PERSONAS,
  SUPPORT_PERSONA_BADGE_CLASS,
} from "./content/taxonomy";
import type { SupportPersona } from "./content/types";

interface PersonaBadgeProps {
  persona: SupportPersona;
  className?: string;
  showIcon?: boolean;
}

const PersonaBadge: React.FC<PersonaBadgeProps> = ({
  persona,
  className,
  showIcon = true,
}) => {
  const meta = SUPPORT_PERSONAS[persona];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs font-medium",
        SUPPORT_PERSONA_BADGE_CLASS[persona],
        className,
      )}
      aria-label={`For ${meta.label}`}
    >
      {showIcon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      <span>{meta.label}</span>
    </Badge>
  );
};

export default PersonaBadge;
