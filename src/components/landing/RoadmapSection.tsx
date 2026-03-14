import React from 'react';
import { BarChart3 } from 'lucide-react';

const roadmapItems = [
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Comprehensive dashboards and reports for equipment utilization, maintenance costs, and team performance.',
  },
];

const RoadmapSection = () => {
  return (
    <section id="roadmap" className="py-12 bg-background border-y border-border">
      <div className="container px-4 mx-auto">
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          What&apos;s Next
        </h2>
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
          {roadmapItems.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 min-w-[200px] max-w-md"
            >
              <Icon className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
