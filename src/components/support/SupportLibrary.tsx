import { useMemo, useState, useCallback, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import PersonaBadge from "./PersonaBadge";
import SupportArticleView from "./SupportArticleView";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_ORDER,
  SUPPORT_PERSONAS,
  SUPPORT_NON_ALL_PERSONAS,
} from "./content/taxonomy";
import { SUPPORT_ARTICLES } from "./content/articles";
import type {
  SupportArticle,
  SupportArticleRelated,
  SupportCategoryId,
  SupportPersona,
} from "./content/types";

interface SupportLibraryProps {
  /**
   * When true, dashboard-only articles (e.g. bug report ticket list) are shown.
   * When false, they are filtered out so the public `/support` page renders
   * only content that applies to everyone.
   */
  includeDashboardOnly?: boolean;
  className?: string;
}

const ALL_PERSONAS = "all" as const;

type PersonaFilter = SupportPersona | typeof ALL_PERSONAS;

function matchesSearch(article: SupportArticle, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  if (article.title.toLowerCase().includes(lower)) return true;
  if (article.summary.toLowerCase().includes(lower)) return true;
  return article.steps.some((step) => step.title.toLowerCase().includes(lower));
}

function matchesPersona(
  article: SupportArticle,
  persona: PersonaFilter,
): boolean {
  if (persona === ALL_PERSONAS) return true;
  return (
    article.personas.includes(persona) || article.personas.includes("all")
  );
}

const SupportLibrary: React.FC<SupportLibraryProps> = ({
  includeDashboardOnly = true,
  className,
}) => {
  const [category, setCategory] = useState<SupportCategoryId>("start-here");
  const [persona, setPersona] = useState<PersonaFilter>(ALL_PERSONAS);
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    return SUPPORT_ARTICLES.filter((article) => {
      if (!includeDashboardOnly && article.dashboardOnly) return false;
      if (!matchesPersona(article, persona)) return false;
      if (!matchesSearch(article, query)) return false;
      return true;
    });
  }, [includeDashboardOnly, persona, query]);

  const articlesByCategory = useMemo(() => {
    const map = new Map<SupportCategoryId, SupportArticle[]>();
    for (const article of filteredArticles) {
      const list = map.get(article.category) ?? [];
      list.push(article);
      map.set(article.category, list);
    }
    return map;
  }, [filteredArticles]);

  const activeCategoryHasResults =
    (articlesByCategory.get(category)?.length ?? 0) > 0;

  // If the current category is empty after filtering, auto-switch to the first
  // category that has results so the user is not staring at an empty panel.
  useEffect(() => {
    if (activeCategoryHasResults) return;
    const firstWithResults = SUPPORT_CATEGORY_ORDER.find(
      (id) => (articlesByCategory.get(id)?.length ?? 0) > 0,
    );
    if (firstWithResults && firstWithResults !== category) {
      setCategory(firstWithResults);
    }
  }, [activeCategoryHasResults, articlesByCategory, category]);

  const totalArticles = filteredArticles.length;

  const handleRelatedClick = useCallback((related: SupportArticleRelated) => {
    const target = SUPPORT_ARTICLES.find((a) => a.id === related.id);
    if (!target) return;
    setCategory(target.category);
    setPersona(ALL_PERSONAS);
    setQuery("");
    // Defer scroll so the target article has rendered under the new category.
    window.setTimeout(() => {
      const node = document.getElementById(`support-article-${target.id}`);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                EquipQR Support Library
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step-by-step guides organized by role and workflow. Pick a
                category, filter by your role, or search for a specific task.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search articles, e.g. 'QR code' or 'QuickBooks'"
                aria-label="Search support library"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="toolbar"
              aria-label="Filter by role"
            >
              <Button
                type="button"
                size="sm"
                variant={persona === ALL_PERSONAS ? "default" : "outline"}
                onClick={() => setPersona(ALL_PERSONAS)}
                className="h-7 px-3 text-xs"
              >
                Everyone
              </Button>
              {SUPPORT_NON_ALL_PERSONAS.map((id) => {
                const meta = SUPPORT_PERSONAS[id];
                const Icon = meta.icon;
                const active = persona === id;
                return (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setPersona(id)}
                    className="h-7 px-3 text-xs gap-1"
                    aria-pressed={active}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              Showing {totalArticles} article{totalArticles === 1 ? "" : "s"}
            </span>
            {persona !== ALL_PERSONAS ? (
              <>
                <span>for</span>
                <PersonaBadge persona={persona} className="align-middle" />
              </>
            ) : null}
            {query ? <span>matching &quot;{query}&quot;</span> : null}
          </div>
        </CardHeader>
      </Card>

      <Tabs
        value={activeCategoryHasResults ? category : category}
        onValueChange={(value) => setCategory(value as SupportCategoryId)}
        className="w-full"
      >
        <TabsList className="grid w-full !h-auto items-stretch grid-cols-4 xl:grid-cols-8 gap-1 p-1">
          {SUPPORT_CATEGORY_ORDER.map((id) => {
            const meta = SUPPORT_CATEGORIES[id];
            const Icon = meta.icon;
            const count = articlesByCategory.get(id)?.length ?? 0;
            return (
              <TabsTrigger
                key={id}
                value={id}
                className="flex flex-col items-center justify-center gap-1 min-h-[3.5rem] px-1 py-2 text-xs min-w-0"
                aria-label={`${meta.label} (${count} article${count === 1 ? "" : "s"})`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight w-full truncate">
                  {meta.shortLabel}
                </span>
                {count > 0 ? (
                  <span className="hidden sm:inline text-[10px] font-normal text-muted-foreground leading-none">
                    {count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SUPPORT_CATEGORY_ORDER.map((id) => {
          const meta = SUPPORT_CATEGORIES[id];
          const articles = articlesByCategory.get(id) ?? [];
          return (
            <TabsContent key={id} value={id} className="mt-4 space-y-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <meta.icon className="h-5 w-5" aria-hidden="true" />
                  {meta.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {meta.description}
                </p>
              </div>
              <Separator />
              {articles.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No articles matched the current filters. Try clearing the
                    search or picking a different role.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <SupportArticleView
                      key={article.id}
                      article={article}
                      onRelatedClick={handleRelatedClick}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default SupportLibrary;
