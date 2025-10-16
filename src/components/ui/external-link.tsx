import * as React from "react";
import { cn } from "@/lib/utils";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  showIcon?: boolean;
}

export function ExternalLink({ href, children, className, showIcon = true, ...props }: ExternalLinkProps) {
  const content = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-2 underline hover:text-foreground transition-colors", className)}
      {...props}
    >
      {children}
      {showIcon && <ExternalLinkIcon className="h-4 w-4 opacity-80" aria-hidden="true" />}
    </a>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>Opens in a new tab</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


