import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, type LucideIcon } from 'lucide-react';

interface FeatureHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaText: string;
  ctaLink?: string;
}

export const FeatureHero = ({ icon: Icon, title, description, ctaText, ctaLink = '/auth?tab=signup' }: FeatureHeroProps) => {
  return (
    <section className="relative pt-32 pb-24 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/landing#features" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Features
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
            {description}
          </p>
          
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
