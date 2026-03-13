import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wrench, 
  Server, 
  Hammer, 
  Building, 
  Package,
  HelpCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
              <Card
                key={useCase.title}
                className={`relative border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-200 h-full flex flex-col hover:-translate-y-1 hover:shadow-lg overflow-hidden ${
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
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">The Win</p>
                    <p className="text-sm font-medium text-foreground">{useCase.win}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow pb-6 pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {useCase.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
