import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SupportArticle,
  SupportArticleRelated,
} from "./content/types";
import PersonaBadge from "./PersonaBadge";
import SupportScreenshot from "./SupportScreenshot";

interface SupportArticleViewProps {
  article: SupportArticle;
  className?: string;
  onRelatedClick?: (related: SupportArticleRelated) => void;
}

const SupportArticleView: React.FC<SupportArticleViewProps> = ({
  article,
  className,
  onRelatedClick,
}) => {
  const reviewedDate = new Date(`${article.lastReviewed}T00:00:00`);
  const reviewedLabel = Number.isNaN(reviewedDate.getTime())
    ? article.lastReviewed
    : reviewedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <Card className={cn("scroll-mt-20", className)} id={`support-article-${article.id}`}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {article.personas.map((persona) => (
            <PersonaBadge key={persona} persona={persona} />
          ))}
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Reviewed {reviewedLabel}
          </Badge>
        </div>
        <CardTitle className="text-lg sm:text-xl">{article.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{article.summary}</p>
        {article.requirement ? (
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 text-primary" aria-hidden="true" />
            <p>
              <span className="font-medium text-foreground">Requires: </span>
              {article.requirement}
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {article.intro ? (
          <div className="prose prose-sm max-w-none text-sm text-muted-foreground dark:prose-invert">
            {article.intro}
          </div>
        ) : null}

        <ol className="space-y-4">
          {article.steps.map((step, index) => {
            const stepNumber = index + 1;
            return (
              <li
                key={`${article.id}-step-${stepNumber}`}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold"
                    aria-hidden="true"
                  >
                    {stepNumber}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h4 className="font-medium text-base">{step.title}</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      {step.description}
                    </div>
                    {step.note ? (
                      <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 mt-0.5 text-info" aria-hidden="true" />
                        <div>
                          <span className="font-medium text-foreground">Note: </span>
                          {step.note}
                        </div>
                      </div>
                    ) : null}
                    {step.screenshot ? (
                      <SupportScreenshot
                        screenshot={step.screenshot}
                        stepNumber={stepNumber}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {article.outro ? (
          <div className="prose prose-sm max-w-none text-sm text-muted-foreground dark:prose-invert">
            {article.outro}
          </div>
        ) : null}

        {article.related && article.related.length > 0 ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Related articles
            </p>
            <ul className="space-y-1">
              {article.related.map((related) => (
                <li key={related.id}>
                  {onRelatedClick ? (
                    <button
                      type="button"
                      onClick={() => onRelatedClick(related)}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      {related.label}
                    </button>
                  ) : (
                    <a
                      href={`#support-article-${related.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      {related.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SupportArticleView;
