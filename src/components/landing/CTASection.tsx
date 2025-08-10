import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section className="py-24 bg-primary/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Ready to Streamline Your Heavy Equipment Operations?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join repair shops and rental operations using EquipQR to track equipment and manage maintenance. 
            Start free today - your first user costs nothing.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>✓ First user completely free</p>
            <p>✓ $10/month per additional user</p>
            <p>✓ 5GB image storage included with first paid user</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;