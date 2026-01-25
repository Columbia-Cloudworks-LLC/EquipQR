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
    description: 'Stop guessing when a machine was last serviced. Stick a QR code on an excavator, skid loader, or truck. Mechanics scan it to instantly see maintenance history, upcoming service needs, or log a new repair.',
    win: 'Zero confusion on service status; faster turnaround times.'
  },
  {
    icon: Server,
    title: 'IT Departments & MSPs',
    description: 'Managing laptops, servers, and peripherals across different users is a headache. Tag every device during setup. When an employee issues a ticket or a device returns, a quick scan tells you exactly who had it, its specs, and its warranty status.',
    win: 'Accurate asset lifecycle management without the manual data entry.'
  },
  {
    icon: Hammer,
    title: 'Tool Cribs & Shared Inventory',
    description: 'Expensive tools have a habit of walking away. Use EquipQR to check equipment in and out to specific employees. Know exactly who has the hammer drill or the diagnostic tablet at any given moment.',
    win: 'Accountability that reduces lost or stolen inventory.'
  },
  {
    icon: Building,
    title: 'Facilities & Property Management',
    description: 'Keeping track of HVAC units, boilers, and fire safety equipment requires rigid documentation. Place a code on every fixed asset. Technicians scan to log inspections, ensuring you always have proof of compliance on hand.',
    win: 'A digital paper trail that keeps inspectors happy and buildings safe.'
  },
  {
    icon: Package,
    title: 'Equipment Rental Agencies',
    description: 'You need to verify the condition of your gear the moment it returns to the warehouse. Scan items as they come back to log damage, flag for cleaning, or mark as "ready to rent."',
    win: 'Catch damage before it costs you money and get inventory back in rotation faster.'
  },
  {
    icon: HelpCircle,
    title: 'Have a Unique Workflow?',
    description: 'EquipQR is flexible. Contact us to see how we can fit your specific tracking needs.',
    win: 'A custom solution tailored to your business.'
  }
];

const AboutSection = ({ id }: { id?: string }) => {
  return (
    <section id={id} className="py-16 bg-background">
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
            const getIconColor = (index: number) => {
              const colors = ['text-primary', 'text-info', 'text-success', 'text-warning', 'text-secondary', 'text-primary'];
              return colors[index % colors.length];
            };
            
            return (
              <Card key={useCase.title} className="relative border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-200 h-full flex flex-col hover:-translate-y-1 hover:shadow-lg overflow-hidden">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="mb-4">
                    <useCase.icon className={`h-8 w-8 ${getIconColor(index)}`} />
                  </div>
                  <CardTitle className="text-xl">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow pb-0">
                  <div className="flex-grow min-h-[6rem] mb-4">
                    <CardDescription className="text-sm leading-relaxed">
                      {useCase.description}
                    </CardDescription>
                  </div>
                  <div className="mt-auto pt-4 border-t border-border flex-shrink-0 bg-muted/50 -mx-6 px-6 pb-6">
                    <p className="text-sm font-semibold text-foreground mb-1">The Win:</p>
                    <p className="text-sm text-muted-foreground">
                      {useCase.win}
                    </p>
                  </div>
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
