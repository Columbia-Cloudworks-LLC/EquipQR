# Accessibility Audit

## Overview

Perform comprehensive accessibility (a11y) audit of the current UI code to ensure compliance with WCAG guidelines and provide an inclusive user experience.

## Steps

1. **WCAG Compliance**
    - Check conformance to WCAG 2.1 guidelines (A, AA, AAA levels)
    - Verify proper semantic HTML structure
    - Ensure keyboard navigation support
    - Review color contrast and visual accessibility
2. **Screen Reader Support**
    - Validate ARIA labels and descriptions
    - Check heading hierarchy and structure
    - Ensure form labels and error messages are accessible
    - Review dynamic content announcements
3. **Interactive Elements**
    - Verify focus management and visible focus indicators
    - Check tab order and keyboard shortcuts
    - Ensure interactive elements are properly sized
    - Review modal and dialog accessibility
4. **Testing & Tools**
    - Suggest automated accessibility testing tools
    - Provide manual testing procedures
    - Create accessibility test cases
    - Recommend browser extensions and validators
5. **Remediation**
    - Provide specific code fixes for each issue
    - Include ARIA attributes and semantic improvements
    - Suggest alternative approaches for complex interactions
    - Create accessible component patterns

## MCP Tool Reference

### Automated Accessibility Testing

```typescript
// Navigate to the page being audited
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_navigate", arguments: { 
  url: "http://localhost:5173/equipment", position: "side" 
}})

// Capture accessibility tree (better than screenshots for a11y)
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_snapshot", arguments: {} })

// Test keyboard navigation - Tab through elements
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_press_key", arguments: { key: "Tab" } })
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_snapshot", arguments: {} }) // Verify focus is visible

// Test interactive elements
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_click", arguments: { element: "Button 'Submit'" } })
```

The `browser_snapshot` tool returns an accessibility tree, which is ideal for:

- Verifying ARIA labels exist
- Checking heading hierarchy  
- Validating interactive element roles
- Detecting missing alt text

## Accessibility Audit Checklist

- [ ] WCAG compliance verified
- [ ] Screen reader support validated
- [ ] Interactive elements accessible
- [ ] Testing tools recommended
- [ ] Remediation code provided with examples
