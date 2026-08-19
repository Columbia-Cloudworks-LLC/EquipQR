import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Server, 
  Hammer, 
  Building, 
  Package
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
    title: 'Heavy equipment and repair shops',
    description: 'QR codes on excavators, loaders, and trucks. Mechanics scan to see history, log a repair, or start a work order.',
    win: 'The tech has the record on the phone. Nobody calls the office.',
  },
  {
    icon: Server,
    title: 'IT departments and MSPs',
    description: 'Tag the device when it is issued. A scan shows who had it, the specs, and whether warranty still covers it.',
    win: 'You stop retyping asset spreadsheets.',
  },
  {
    icon: Hammer,
    title: 'Tool cribs and shared inventory',
    description: 'Check tools in and out against a person. You know who has the impact wrench right now.',
    win: 'Fewer tools that walk off and never come back.',
  },
  {
    icon: Building,
    title: 'Facilities and property management',
    description: 'Codes on HVAC, boilers, and safety gear. Techs scan to log the inspection.',
    win: 'The inspector asks for the log. You have it.',
  },
  {
    icon: Package,
    title: 'Equipment rental agencies',
    description: 'Scan the return. Log damage, flag it for cleaning, or mark it ready to rent.',
    win: 'Catch the ding at the gate, not on the next customer\'s job.',
  },
];

const ICON_COLORS = ['text-primary', 'text-info', 'text-success', 'text-warning', 'text-secondary'];

const AboutSection = ({ id }: { id?: string }) => {
  return (
    <section id={id} className="scroll-mt-20 py-16 bg-muted/20">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Who EquipQR is for
          </h2>
          <p className="mx-auto max-w-3xl text-left text-xl text-muted-foreground sm:text-center">
            Shops stick a QR on the machine. The next scan pulls history. Same pattern for IT gear, tool cribs, buildings, and rental fleets.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
              <LandingReveal key={useCase.title} delayMs={index * 60} className="h-full">
                <Card
                  className="relative flex h-full flex-col overflow-hidden border-border bg-card/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-card hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div
                    className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
                    aria-hidden
                  />
                  <CardHeader className="pb-2 flex-shrink-0">
                    <div className="mb-3 flex">
                      <span
                        className={`rounded-2xl bg-primary/10 p-3 ${ICON_COLORS[index % ICON_COLORS.length]}`}
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
