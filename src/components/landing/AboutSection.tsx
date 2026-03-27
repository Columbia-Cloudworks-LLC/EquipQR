import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Server, 
  Hammer, 
  Building, 
  Package,
  HelpCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LandingReveal from './LandingReveal';

interface UseCase {
  icon: LucideIcon;
  title: string;
  description: string;
  win: string;
}

const useCases: UseCase[] = [
  {
    icon: Wrench,
    title: 'Heavy Equipment & Repair Shops',
    description: 'QR codes on excavators, loaders, and trucks. Mechanics scan to see history, schedule service, or log repairs.',
    win: 'Zero confusion on service status; faster turnaround times.'
  },
  {
    icon: Server,
    title: 'IT Departments & MSPs',
    description: 'Tag every device at setup. A quick scan shows who had it, specs, and warranty.',
    win: 'Accurate asset lifecycle management without the manual data entry.'
  },
  {
    icon: Hammer,
    title: 'Tool Cribs & Shared Inventory',
    description: 'Check tools in and out to specific employees. Know who has what at any moment.',
    win: 'Accountability that reduces lost or stolen inventory.'
  },
  {
    icon: Building,
    title: 'Facilities & Property Management',
    description: 'Codes on HVAC, boilers, and safety equipment. Technicians scan to log inspections and prove compliance.',
    win: 'A digital paper trail that keeps inspectors happy and buildings safe.'
  },
  {
    icon: Package,
    title: 'Equipment Rental Agencies',
    description: 'Scan returns to log damage, flag for cleaning, or mark ready to rent.',
    win: 'Catch damage early and get inventory back in rotation faster.'
  },
  {
    icon: HelpCircle,
    title: 'Have a Unique Workflow?',
    description: 'EquipQR is flexible. Contact us to see how we can fit your tracking needs.',
    win: 'A custom solution tailored to your business.'
  }
];

const AboutSection = ({ id }: { id?: string }) => {
  return (
    <section id={id} className="scroll-mt-20 py-16 bg-muted/20">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Who Is EquipQR™ For?
          </h2>
          <p className="mx-auto max-w-3xl text-left text-xl text-muted-foreground sm:text-center">
            Whether you're managing heavy equipment, IT assets, tools, facilities, or rental inventory, EquipQR™ helps you track, maintain, and organize your equipment with ease.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => {
            const getIconColor = (i: number) => {
              const colors = ['text-primary', 'text-info', 'text-success', 'text-warning', 'text-secondary', 'text-primary'];
              return colors[i % colors.length];
            };
            const isCtaCard = useCase.title === 'Have a Unique Workflow?';

            return (
              <LandingReveal key={useCase.title} delayMs={index * 60} className="h-full">
                <Card
                  className={`relative flex h-full flex-col overflow-hidden border-border bg-card/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-card hover:shadow-lg ${
                    isCtaCard ? 'border-dashed bg-primary/5' : ''
                  }`}
                >
                  {/* Subtle gradient stripe at top */}
                  <div
                    className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
                    aria-hidden
                  />
                  <CardHeader className="pb-2 flex-shrink-0">
                    <div className="mb-3 flex">
                      <span
                        className={`rounded-2xl bg-primary/10 p-3 ${getIconColor(index)}`}
                        aria-hidden
                      >
                        <useCase.icon className="h-10 w-10 sm:h-11 sm:w-11" />
                      </span>
                    </div>
                    <CardTitle className="text-xl">{useCase.title}</CardTitle>
                    <div className="mt-3 border-t border-border/50 pt-3">
                      <Badge
                        aria-label="The Win"
                        variant="outline"
                        className="w-fit border-primary/40 bg-primary/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.22em] text-primary/90"
                      >
                        The Win
                      </Badge>
                      <p className="mt-2 text-sm font-medium text-foreground">{useCase.win}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow pb-6 pt-0">
                    <CardDescription className="text-sm leading-relaxed">
                      {useCase.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
