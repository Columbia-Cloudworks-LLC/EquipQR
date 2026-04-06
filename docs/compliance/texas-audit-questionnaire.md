# Texas Audit Questionnaire and Pass-Fail Matrix (EquipQR)

## Scope

- **Jurisdiction:** Texas
- **System in scope:** EquipQR (multi-tenant SaaS for fleet and equipment operations)
- **Regulatory regimes covered (pack order):**
  1. TX-RAMP
  2. TDPSA
  3. Texas Data Breach Notification
  4. Texas Sales Tax (SaaS)
- **Applicability assumptions:**
  - TX-RAMP controls apply when EquipQR serves Texas state agencies; Level 2 adds additional obligations.
  - TDPSA controls apply when EquipQR conducts business in Texas or targets Texas residents and processes personal data in scope.
  - Texas breach-notification controls apply when EquipQR holds computerized sensitive personal information for Texas residents and a qualifying breach occurs.
  - Texas sales-tax controls apply when EquipQR has Texas nexus or other taxable presence conditions.

## Audit Questions

### TX-RAMP

#### Access Control

1. Does the SaaS implement documented role-based access controls for all relevant user types?
2. Is multi-factor authentication enforced for privileged and administrative accounts?
3. Are access reviews performed on a defined cadence?
4. Is terminated user deprovisioning executed within defined timelines?

#### Vulnerability Management

5. Are vulnerability scans executed on a defined cadence with accountable review?
6. For Level 2, is there a current annual penetration test from an independent qualified third party?
7. Are high-severity vulnerabilities either remediated or formally risk-accepted with traceable records?

#### Incident Response

8. Is there a documented incident response plan that is currently in force?
9. For Level 2/state-agency context, is DIR notification timing embedded and followed?
10. Have incident response exercises been performed within the current cycle?

#### Continuous Monitoring (Level 2)

11. Are quarterly monitoring submissions complete and current?
12. Are security telemetry controls and log retention defined and operating?

#### Documentation Completeness

13. Is the TX-RAMP control workbook fully completed for the applicable level?
14. Is the system security plan current and accurate to deployed reality?

#### Third-Party and Subservice Controls

15. Are current SOC 2 reports collected and reviewed for carved-out subservice providers?
16. Do vendor agreements enforce equivalent security expectations?

### TDPSA

#### Privacy Policy and Transparency

1. Does the privacy policy disclose categories, purposes, sharing, and rights mechanisms in a way that matches real system behavior?
2. Is policy content validated against observed application and tracker behavior?

#### Consumer Rights and DSAR Operations

3. Are at least two consumer request channels available?
4. Is identity verification required before rights fulfillment?
5. Can the system execute access, correction, deletion, and portability workflows reliably?
6. Are request records retained for the required retention period?
7. Is an appeals process defined for denied requests?

#### Data Protection Assessments

8. Is a documented DPA present for each applicable high-risk processing activity?
9. Do DPAs explicitly document risks, safeguards, and benefits-vs-risks balancing?

#### Opt-Out and Consent Controls

10. Are universal opt-out signals (including GPC where applicable) technically honored?
11. Is explicit opt-in used before sensitive data processing where required?

#### Processor Contract Controls

12. Are executed processor agreements in place with required privacy and security clauses?

### Texas Data Breach Notification

1. Does the incident response plan include Texas-specific breach notification requirements and timelines?
2. Is there a defined process to determine when statutory notification clocks begin?
3. Is responsibility assigned for attorney general reporting where thresholds are met?
4. Are procedures defined for notifying affected individuals within required windows?
5. If acting as a processor, is immediate controller notification built into workflow?
6. Are breach lifecycle records maintained from discovery through notification completion?

### Texas Sales Tax (SaaS)

1. Is Texas nexus assessed on a rolling basis with a defined threshold-monitoring process?
2. Is registration completed when tax collection obligations are triggered?
3. Are sales-tax returns filed at required frequency and reconciled to ledger data?
4. Are exemption or resale certificates complete, signed, and collected on time?
5. Are destination-based rates correctly applied to taxable transactions?
6. Are required records retained for the auditable period?

## Pass-Fail Matrix

| Regime | Area | Audit Question | Pass When | Fail When |
| --- | --- | --- | --- | --- |
| TX-RAMP | Access control | Does the SaaS implement documented role-based access controls for all relevant user types? | Technical controls and review cadence are implemented and current. | Policies exist but operational controls are missing, stale, or unverifiable. |
| TX-RAMP | Access control | Is multi-factor authentication enforced for privileged and administrative accounts? | Technical controls and review cadence are implemented and current. | Policies exist but operational controls are missing, stale, or unverifiable. |
| TX-RAMP | Access control | Are access reviews performed on a defined cadence? | Technical controls and review cadence are implemented and current. | Policies exist but operational controls are missing, stale, or unverifiable. |
| TX-RAMP | Access control | Is terminated user deprovisioning executed within defined timelines? | Technical controls and review cadence are implemented and current. | Policies exist but operational controls are missing, stale, or unverifiable. |
| TX-RAMP | Vulnerability management | Are vulnerability scans executed on a defined cadence with accountable review? | Scans, independent testing (when required), and remediation/risk decisions are documented and current. | Scans/testing are absent, outdated, or findings are unresolved without formal disposition. |
| TX-RAMP | Vulnerability management | For Level 2, is there a current annual penetration test from an independent qualified third party? | Scans, independent testing (when required), and remediation/risk decisions are documented and current. | Scans/testing are absent, outdated, or findings are unresolved without formal disposition. |
| TX-RAMP | Vulnerability management | Are high-severity vulnerabilities either remediated or formally risk-accepted with traceable records? | Scans, independent testing (when required), and remediation/risk decisions are documented and current. | Scans/testing are absent, outdated, or findings are unresolved without formal disposition. |
| TX-RAMP | Incident response | Is there a documented incident response plan that is currently in force? | IR plan exists, includes required timelines, and exercises/process evidence are current. | Generic or stale plan, missing required timeline handling, or no practice evidence. |
| TX-RAMP | Incident response | For Level 2/state-agency context, is DIR notification timing embedded and followed? | IR plan exists, includes required timelines, and exercises/process evidence are current. | Generic or stale plan, missing required timeline handling, or no practice evidence. |
| TX-RAMP | Incident response | Have incident response exercises been performed within the current cycle? | IR plan exists, includes required timelines, and exercises/process evidence are current. | Generic or stale plan, missing required timeline handling, or no practice evidence. |
| TX-RAMP | Continuous monitoring | Are quarterly monitoring submissions complete and current? | Required periodic monitoring outputs are complete with no unexplained gaps. | Missing submissions, incomplete monitoring records, or undocumented gaps. |
| TX-RAMP | Continuous monitoring | Are security telemetry controls and log retention defined and operating? | Required periodic monitoring outputs are complete with no unexplained gaps. | Missing submissions, incomplete monitoring records, or undocumented gaps. |
| TX-RAMP | Documentation completeness | Is the TX-RAMP control workbook fully completed for the applicable level? | Workbook/SSP are complete, current, and aligned to actual controls. | Blank, stale, or inaccurate control documentation. |
| TX-RAMP | Documentation completeness | Is the system security plan current and accurate to deployed reality? | Workbook/SSP are complete, current, and aligned to actual controls. | Blank, stale, or inaccurate control documentation. |
| TX-RAMP | Third-party controls | Are current SOC 2 reports collected and reviewed for carved-out subservice providers? | Subservice assurance artifacts are current and contract requirements are in force. | No current assurance review or weak vendor obligations. |
| TX-RAMP | Third-party controls | Do vendor agreements enforce equivalent security expectations? | Subservice assurance artifacts are current and contract requirements are in force. | No current assurance review or weak vendor obligations. |
| TDPSA | Privacy policy and transparency | Does the privacy policy disclose categories, purposes, sharing, and rights mechanisms in a way that matches real system behavior? | Policy disclosures are specific and technically aligned with actual data behavior. | Boilerplate or incomplete policy, or mismatch between disclosed and observed behavior. |
| TDPSA | Privacy policy and transparency | Is policy content validated against observed application and tracker behavior? | Policy disclosures are specific and technically aligned with actual data behavior. | Boilerplate or incomplete policy, or mismatch between disclosed and observed behavior. |
| TDPSA | Consumer rights and DSAR operations | Are at least two consumer request channels available? | Intake, verification, fulfillment timing, retention, and appeals are documented and operating. | Ad-hoc requests, missing verification/retention/appeals, or timing non-compliance. |
| TDPSA | Consumer rights and DSAR operations | Is identity verification required before rights fulfillment? | Intake, verification, fulfillment timing, retention, and appeals are documented and operating. | Ad-hoc requests, missing verification/retention/appeals, or timing non-compliance. |
| TDPSA | Consumer rights and DSAR operations | Can the system execute access, correction, deletion, and portability workflows reliably? | Intake, verification, fulfillment timing, retention, and appeals are documented and operating. | Ad-hoc requests, missing verification/retention/appeals, or timing non-compliance. |
| TDPSA | Consumer rights and DSAR operations | Are request records retained for the required retention period? | Intake, verification, fulfillment timing, retention, and appeals are documented and operating. | Ad-hoc requests, missing verification/retention/appeals, or timing non-compliance. |
| TDPSA | Consumer rights and DSAR operations | Is an appeals process defined for denied requests? | Intake, verification, fulfillment timing, retention, and appeals are documented and operating. | Ad-hoc requests, missing verification/retention/appeals, or timing non-compliance. |
| TDPSA | Data protection assessments | Is a documented DPA present for each applicable high-risk processing activity? | DPAs exist for each in-scope activity and contain balancing analysis and safeguards. | No DPA, superficial memo, or missing required analysis elements. |
| TDPSA | Data protection assessments | Do DPAs explicitly document risks, safeguards, and benefits-vs-risks balancing? | DPAs exist for each in-scope activity and contain balancing analysis and safeguards. | No DPA, superficial memo, or missing required analysis elements. |
| TDPSA | Opt-out and consent controls | Are universal opt-out signals (including GPC where applicable) technically honored? | UOOM/GPC handling and sensitive-data consent controls are technically enforced. | Policy-only statements without operational enforcement. |
| TDPSA | Opt-out and consent controls | Is explicit opt-in used before sensitive data processing where required? | UOOM/GPC handling and sensitive-data consent controls are technically enforced. | Policy-only statements without operational enforcement. |
| TDPSA | Processor contract controls | Are executed processor agreements in place with required privacy and security clauses? | Executed processor agreements include required obligations. | Generic terms without required processor commitments. |
| Texas Data Breach Notification | Incident response legal readiness | Does the incident response plan include Texas-specific breach notification requirements and timelines? | Plan includes Texas-specific obligations and operational steps. | Generic plan with no Texas-specific obligations. |
| Texas Data Breach Notification | Notification timing control | Is there a defined process to determine when statutory notification clocks begin? | Determination and clock-tracking process is defined and demonstrably used. | No clock ownership or unclear trigger points. |
| Texas Data Breach Notification | Responsibility and execution readiness | Is responsibility assigned for attorney general reporting where thresholds are met? | Reporting ownership, channels, and execution paths are clearly assigned. | Ownership ambiguous or reporting process undefined. |
| Texas Data Breach Notification | Responsibility and execution readiness | Are procedures defined for notifying affected individuals within required windows? | Reporting ownership, channels, and execution paths are clearly assigned. | Ownership ambiguous or reporting process undefined. |
| Texas Data Breach Notification | Responsibility and execution readiness | If acting as a processor, is immediate controller notification built into workflow? | Reporting ownership, channels, and execution paths are clearly assigned. | Ownership ambiguous or reporting process undefined. |
| Texas Data Breach Notification | Breach recordkeeping | Are breach lifecycle records maintained from discovery through notification completion? | End-to-end records exist for discovery, decisioning, notifications, and dates. | Incomplete or missing notification audit trail. |
| Texas Sales Tax (SaaS) | Nexus determination and registration | Is Texas nexus assessed on a rolling basis with a defined threshold-monitoring process? | Nexus monitoring is documented and registration is timely when required. | Threshold awareness exists but no timely registration/activation. |
| Texas Sales Tax (SaaS) | Nexus determination and registration | Is registration completed when tax collection obligations are triggered? | Nexus monitoring is documented and registration is timely when required. | Threshold awareness exists but no timely registration/activation. |
| Texas Sales Tax (SaaS) | Filing cadence and reconciliation | Are sales-tax returns filed at required frequency and reconciled to ledger data? | Returns are filed on cadence and reconcile to source accounting records. | Filing gaps or unreconciled reporting. |
| Texas Sales Tax (SaaS) | Exemption certificate controls | Are exemption or resale certificates complete, signed, and collected on time? | Valid certificates support exempt treatment with appropriate timing. | Missing, incomplete, or late-only certificate coverage. |
| Texas Sales Tax (SaaS) | Rate application accuracy | Are destination-based rates correctly applied to taxable transactions? | Destination-based tax treatment is correctly applied. | Flat or incorrect rate logic causes over/under-collection. |
| Texas Sales Tax (SaaS) | Record retention | Are required records retained for the auditable period? | Required records are retained and retrievable for audit windows. | Records are missing, incomplete, or not audit-ready. |
