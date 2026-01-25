import { ReactNode } from 'react';

interface FeatureSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export const FeatureSection = ({ title, description, children, className = '' }: FeatureSectionProps) => {
  return (
    <section className={`py-24 ${className}`}>
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{title}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
};
