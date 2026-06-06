import { useState, useMemo, useCallback } from 'react';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { LARGE_TEMPLATE_THRESHOLD } from '@/features/organization/components/checklistTemplateEditorUtils';

export function useChecklistSectionNavigation(sections: string[]) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [focusSectionMode, setFocusSectionMode] = useState(false);
  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  const visibleSections = useMemo(() => {
    if (focusSectionMode && focusedSection && sections.includes(focusedSection)) {
      return [focusedSection];
    }
    return sections;
  }, [sections, focusSectionMode, focusedSection]);

  const applyTemplateSectionState = useCallback((templateData: PMChecklistItem[]) => {
    const unique = Array.from(new Set(templateData.map((item) => item.section)));
    if (templateData.length >= LARGE_TEMPLATE_THRESHOLD && unique.length > 0) {
      setFocusSectionMode(true);
      setFocusedSection(unique[0]);
      setExpanded([unique[0]]);
    } else {
      setFocusSectionMode(false);
      setFocusedSection(null);
      setExpanded(unique);
    }
  }, []);

  const expandAll = useCallback(() => {
    setFocusSectionMode(false);
    setExpanded(sections);
  }, [sections]);

  const collapseAll = useCallback(() => {
    setExpanded([]);
  }, []);

  const enableFocusSectionMode = useCallback(() => {
    setFocusSectionMode(true);
    const target = focusedSection && sections.includes(focusedSection) ? focusedSection : sections[0];
    if (target) {
      setFocusedSection(target);
      setExpanded([target]);
    }
  }, [focusedSection, sections]);

  const handleTocSectionClick = useCallback(
    (sectionName: string) => {
      setFocusedSection(sectionName);
      if (focusSectionMode) {
        setExpanded([sectionName]);
      } else {
        setExpanded((prev) => Array.from(new Set([...prev, sectionName])));
      }
    },
    [focusSectionMode]
  );

  const handleAccordionChange = useCallback(
    (value: string[]) => {
      if (focusSectionMode && value.length > 1) {
        const newest = value.find((v) => !expanded.includes(v)) ?? value[value.length - 1];
        setExpanded(newest ? [newest] : []);
        setFocusedSection(newest ?? null);
      } else {
        setExpanded(value);
        if (value.length === 1) setFocusedSection(value[0]);
      }
    },
    [focusSectionMode, expanded]
  );

  const expandSection = useCallback(
    (sectionName: string) => {
      setExpanded((prev) =>
        focusSectionMode ? [sectionName] : Array.from(new Set([...prev, sectionName]))
      );
      setFocusedSection(sectionName);
    },
    [focusSectionMode]
  );

  const renameSectionInNavigation = useCallback((original: string, newName: string) => {
    setExpanded((prev) =>
      prev.includes(original) ? [...prev.filter((s) => s !== original), newName] : prev
    );
    setFocusedSection((current) => (current === original ? newName : current));
  }, []);

  const removeSectionFromNavigation = useCallback((sectionName: string) => {
    setExpanded((prev) => prev.filter((s) => s !== sectionName));
    setFocusedSection((current) => (current === sectionName ? null : current));
  }, []);

  return {
    expanded,
    setExpanded,
    focusSectionMode,
    setFocusSectionMode,
    focusedSection,
    setFocusedSection,
    visibleSections,
    applyTemplateSectionState,
    expandAll,
    collapseAll,
    enableFocusSectionMode,
    handleTocSectionClick,
    handleAccordionChange,
    expandSection,
    renameSectionInNavigation,
    removeSectionFromNavigation,
  };
}
