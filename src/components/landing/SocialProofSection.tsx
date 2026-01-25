import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from '@/components/ui/external-link';

const SocialProofSection = () => {
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Field-Tested Solution
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Currently deployed at heavy equipment repair shops who rely on EquipQR™ for their daily operations.
          </p>
        </div>
        
        <div className="flex justify-center mb-16">
          {/* Primary Client Highlight - Centered */}
          <Card className="max-w-3xl border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <img 
                    src="/branded-logos/3A-Equipment-Logo-Medium.png" 
                    alt="3-A Equipment Logo" 
                    className="h-20 w-20 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    <ExternalLink 
                      href="https://3aequip.com"
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      3-A Equipment
                    </ExternalLink>
                  </h3>
                  <Badge variant="secondary" className="mb-4">Heavy Equipment Repair Shop</Badge>
                  <p className="text-muted-foreground leading-relaxed">
                    "EquipQR™ has streamlined how we manage our heavy equipment. The QR code system makes it easy for our technicians to access equipment records and update maintenance status right from their phones in the field."
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div>
                  <div className="text-2xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground">Field adoption rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">50%</div>
                  <div className="text-sm text-muted-foreground">Faster work orders</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">Enterprise-grade</div>
            <div className="text-sm text-muted-foreground">Platform</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">Unlimited</div>
            <div className="text-sm text-muted-foreground">User Seats</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">5 GB</div>
            <div className="text-sm text-muted-foreground">Image Storage Included</div>
            <div className="text-xs text-muted-foreground mt-1">
              <a 
                href="mailto:nicholas.king@columbiacloudworks.com" 
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Contact us for more
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;