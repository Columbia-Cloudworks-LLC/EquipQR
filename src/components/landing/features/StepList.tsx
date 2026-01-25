interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepListProps {
  steps: Step[];
}

export const StepList = ({ steps }: StepListProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
              {step.number}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
