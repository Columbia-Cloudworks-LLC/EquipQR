import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureSection } from '@/components/landing/features/FeatureSection';
import type { LucideIcon } from 'lucide-react';

export interface BuiltInTemplate {
  name: string;
  items: number;
  sections: number;
  description: string;
  icon: LucideIcon;
}

interface PmBuiltInTemplatesSectionProps {
  templates: BuiltInTemplate[];
}

export const PmBuiltInTemplatesSection = ({ templates }: PmBuiltInTemplatesSectionProps) => (
  <FeatureSection
    title="Built-in Templates"
    description="Get started immediately with professionally designed checklists for common equipment types. Each template includes comprehensive inspection items organized by category."
  >
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {templates.map((template) => (
        <Card key={template.name} className="border-border bg-card hover:bg-card/80 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <template.icon className="h-6 w-6 text-primary" />
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </div>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">{template.items}</span>
                <span className="text-muted-foreground">items</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">{template.sections}</span>
                <span className="text-muted-foreground">sections</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </FeatureSection>
);
