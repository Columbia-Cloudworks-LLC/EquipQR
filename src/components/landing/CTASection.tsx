import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEMO_CALENDLY_URL = 'https://calendly.com/nicholas-king-columbiacloudworks/30min';

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-success/5 to-info/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Ready to Streamline Your Heavy Equipment Operations?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join repair shops and rental operations using EquipQR™ to track equipment, manage inventory and parts, and handle maintenance workflows.
            Built for teams of any size.
          </p>

          <div className="flex flex-col items-center gap-4 mb-6">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth?tab=signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground max-w-md">
              Prefer a walkthrough first?{' '}
              <a
                href={DEMO_CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Schedule a demo
              </a>
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card. No setup fee. Most shops are scanning their first machine within 20 minutes of signup.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;