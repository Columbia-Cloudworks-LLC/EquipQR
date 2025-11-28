import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle, Building } from 'lucide-react';
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Primary Client Highlight */}
          <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <Building className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    <ExternalLink 
                      href="https://3aequip.columbiacloudworks.com/"
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
          
          {/* Stats Card */}
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Simple Pricing
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Transparent pricing built for repair shops and rental operations. Pay only for what you use.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">First user completely free</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">$10/month per additional user</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">5GB photo storage included</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Pricing Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">Free</div>
            <div className="text-sm text-muted-foreground">First User Always</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">$10</div>
            <div className="text-sm text-muted-foreground">Per Additional User/Month</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">5GB</div>
            <div className="text-sm text-muted-foreground">Photo Storage Included</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground mb-2">$0.10</div>
            <div className="text-sm text-muted-foreground">Per Additional GB</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;