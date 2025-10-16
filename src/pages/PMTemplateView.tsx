import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePMTemplate, useClonePMTemplate } from '@/hooks/usePMTemplates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TemplateAssignmentDialog } from '@/components/pm-templates/TemplateAssignmentDialog';
import { PMChecklistItem } from '@/services/preventativeMaintenanceService';
import { Copy, Download, Edit, Globe, ListTree, Lock, Shield, Wrench } from 'lucide-react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { useSimplifiedOrganizationRestrictions } from '@/hooks/useSimplifiedOrganizationRestrictions';
import { generateTemplatePreviewPDF } from '@/utils/templatePDF';

const groupBySection = (items: PMChecklistItem[]) => {
  const groups = items.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, PMChecklistItem[]>);
  const ordered = Object.keys(groups).sort().map((key) => ({ name: key, items: groups[key] }));
  return ordered;
};

const PMTemplateView: React.FC = () => {
  const { templateId = '' } = useParams();
  const navigate = useNavigate();
  const { data: template, isLoading } = usePMTemplate(templateId);
  const cloneTemplate = useClonePMTemplate();
  const { currentOrganization } = useSimpleOrganization();
  const { hasRole } = usePermissions();
  const { restrictions } = useSimplifiedOrganizationRestrictions();

  const [applyOpen, setApplyOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);

  const sections = useMemo(() => {
    const data = Array.isArray(template?.template_data) ? (template?.template_data as PMChecklistItem[]) : [];
    return groupBySection(data);
  }, [template]);

  const totalItems = useMemo(() => template?.template_data?.length || 0, [template]);

  const handleBack = () => navigate('/dashboard/pm-templates');
  const handleApply = () => setApplyOpen(true);
  const handleClone = async () => {
    if (!template?.id) return;
    await cloneTemplate.mutateAsync({ sourceId: template.id, newName: `${template.name} (Copy)` });
  };
  const handleEdit = () => {
    if (!template?.id) return;
    navigate(`/dashboard/pm-templates?edit=${template.id}`);
  };

  const isOrgTemplate = !!template?.organization_id;
  const isAdmin = hasRole(['owner', 'admin']);
  const canCreateCustomTemplates = restrictions.canCreateCustomPMTemplates;
  const canEdit = isOrgTemplate && !template?.is_protected && isAdmin && canCreateCustomTemplates;

  const expandAll = () => setExpanded(sections.map((s) => s.name));
  const collapseAll = () => setExpanded([]);

  useEffect(() => {
    setExpanded([]);
  }, [templateId]);

  const onDownloadPDF = () => {
    if (!template) return;
    generateTemplatePreviewPDF({
      name: template.name,
      description: template.description || undefined,
      sections,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    });
  };

  return (
    <div className="space-y-6 p-content">
      {!currentOrganization && (
        <Card className="p-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">PM Templates</h1>
            <p className="text-muted-foreground">Please select an organization to manage PM templates.</p>
          </div>
        </Card>
      )}
      {currentOrganization && !isAdmin && (
        <Card className="p-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">PM Templates</h1>
            <p className="text-muted-foreground">You need administrator permissions to access this page.</p>
          </div>
        </Card>
      )}
      {(!currentOrganization || !isAdmin) && null}
      <PageHeader
        title={template?.name || 'PM Template'}
        description={template?.description || undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'PM Templates', href: '/dashboard/pm-templates' },
          { label: template?.name || 'View' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>Back to Templates</Button>
            <Button onClick={handleApply}>
              <Wrench className="mr-2 h-4 w-4" />
              Apply to Equipment
            </Button>
            <Button variant="outline" onClick={handleClone} disabled={!template}>
              <Copy className="mr-2 h-4 w-4" />
              Clone Template
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      {isLoading && (
        <Card className="p-6">
          <div className="animate-pulse h-6 w-1/3 bg-muted rounded mb-4" />
          <div className="animate-pulse h-4 w-2/3 bg-muted rounded mb-2" />
          <div className="animate-pulse h-4 w-1/2 bg-muted rounded" />
        </Card>
      )}

      {!isLoading && template === null && (
        <Card className="p-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Template not found</h2>
            <p className="text-muted-foreground">The requested template does not exist or you do not have access.</p>
            <div className="pt-2">
              <Button variant="outline" onClick={handleBack}>Back to Templates</Button>
            </div>
          </div>
        </Card>
      )}

      {template && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TOC */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListTree className="h-4 w-4" />
                    Table of Contents
                  </div>
                  {expanded.length < sections.length ? (
                    <Button size="sm" variant="ghost" onClick={expandAll}>Expand all</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={collapseAll}>Collapse all</Button>
                  )}
                </div>
                <ScrollArea className="h-[50vh] pr-2">
                  <ul className="space-y-1 text-sm">
                    {sections.map((s) => (
                      <li key={s.name}>
                        <a href={`#section-${encodeURIComponent(s.name)}`} className="hover:underline">
                          {s.name} ({s.items.length})
                        </a>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex flex-wrap gap-2">
              {!isOrgTemplate && (
                <Badge variant="secondary"><Globe className="h-3 w-3 mr-1" />Global</Badge>
              )}
              {isOrgTemplate && (
                <Badge variant="secondary">Organization</Badge>
              )}
              {template.is_protected && (
                <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Protected</Badge>
              )}
              {!canEdit && isOrgTemplate && (
                <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Read-only</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <span>Created: {new Date(template.created_at).toLocaleString()}</span>
              <span className="mx-2">•</span>
              <span>Updated: {new Date(template.updated_at).toLocaleString()}</span>
              <span className="mx-2">•</span>
              <span>Sections: {sections.length}</span>
              <span className="mx-2">•</span>
              <span>Total items: {totalItems}</span>
            </div>

            <Accordion type="multiple" value={expanded} onValueChange={(v) => setExpanded(v as string[])}>
              {sections.map((section) => (
                <AccordionItem key={section.name} value={section.name} id={`section-${encodeURIComponent(section.name)}`}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full">
                      <div className="font-medium">{section.name}</div>
                      <div className="text-sm text-muted-foreground">{section.items.length} items</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {section.items.map((item, idx) => (
                        <div key={item.id} className="rounded border p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {idx + 1}. {item.title}
                            </div>
                            <Badge variant={item.required ? 'default' : 'outline'}>
                              {item.required ? 'Required' : 'Optional'}
                            </Badge>
                          </div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground mt-2">{item.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply}>
                <Wrench className="mr-2 h-4 w-4" />
                Apply to Equipment
              </Button>
              <Button variant="outline" onClick={handleClone} disabled={!template || !canCreateCustomTemplates} title={!canCreateCustomTemplates ? 'Custom PM templates require user licenses' : ''}>
                <Copy className="mr-2 h-4 w-4" />
                Clone Template
              </Button>
              {canEdit && (
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button variant="outline" onClick={onDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {template && (
        <TemplateAssignmentDialog
          templateId={template.id}
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </div>
  );
};

export default PMTemplateView;


