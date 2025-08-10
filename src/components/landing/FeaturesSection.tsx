import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  QrCode, 
  ClipboardList, 
  Users, 
  Map, 
  BarChart3, 
  Shield, 
  Smartphone, 
  FileText 
} from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'QR Code Integration',
    description: 'Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations.',
    benefits: ['Instant equipment access', 'Automated tracking', 'Mobile-optimized scanning']
  },
  {
    icon: ClipboardList,
    title: 'Work Order Management',
    description: 'Create, assign, and track work orders with intelligent workflows. Monitor progress and ensure nothing falls through the cracks.',
    benefits: ['Smart assignment rules', 'Progress tracking', 'Due date management']
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Organize teams across multiple organizations with role-based access control. Track performance and distribute workload efficiently.',
    benefits: ['Cross-organizational teams', 'Role-based permissions', 'Workload balancing']
  },
  {
    icon: Map,
    title: 'Fleet Visualization',
    description: 'Interactive maps showing equipment locations, status, and maintenance routes. Optimize operations with geographic insights.',
    benefits: ['Real-time tracking', 'Route optimization', 'Geographic analytics']
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Comprehensive dashboards and reports providing insights into equipment utilization, maintenance costs, and team performance.',
    benefits: ['Performance metrics', 'Cost analysis', 'Predictive insights'],
    developmentNotice: 'Currently under active development'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Advanced role-based access control, audit trails, and secure data protection. Built for enterprise compliance.',
    benefits: ['Role-based access', 'Audit trails', 'Secure permissions']
  },
  {
    icon: Smartphone,
    title: 'Mobile-First Design',
    description: 'Native mobile experience for field technicians. Work offline and sync when connected. Optimized for all devices.',
    benefits: ['Offline capability', 'Touch-optimized UI', 'Cross-platform']
  },
  {
    icon: FileText,
    title: 'Documentation Hub',
    description: 'Centralized storage for manuals, warranties, certifications, and maintenance records. Always accessible in the field.',
    benefits: ['Document management', 'Version control', 'Field accessibility'],
    developmentNotice: 'Currently under active development'
  }
];

const FeaturesSection = ({ id }: { id?: string }) => {
  return (
    <section id={id} className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Complete Equipment Management Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to manage your fleet efficiently, from QR code tracking to advanced analytics. Built for scale and security.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const getIconColor = (index: number) => {
              const colors = ['text-primary', 'text-info', 'text-success', 'text-warning'];
              return colors[index % colors.length];
            };
            
            return (
              <Card key={index} className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <feature.icon className={`h-8 w-8 ${getIconColor(index)}`} />
                  </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      {benefit}
                    </li>
                  ))}
                </ul>
                {feature.developmentNotice && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground/70 italic">
                      {feature.developmentNotice}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;