# Texas Rule Pack

Use this pack when the requested regulatory space is Texas.

## Regime Order

1. TX-RAMP
2. TDPSA
3. Texas Data Breach Notification
4. Texas Sales Tax (SaaS)

## TX-RAMP

### Applies When

- The SaaS product serves Texas state agencies.
- Level 1 and Level 2 obligations differ; Level 2 adds deeper monitoring and independent testing.

### Question Groups

- Access control
- Vulnerability management
- Incident response
- Continuous monitoring (Level 2)
- Documentation completeness
- Third-party and subservice controls

### Audit Questions

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

### Pass-Fail Logic

| Area | Pass When | Fail When |
| --- | --- | --- |
| Access control | Technical controls and review cadence are implemented and current. | Policies exist but operational controls are missing, stale, or unverifiable. |
| Vulnerability management | Scans, independent testing (when required), and remediation/risk decisions are documented and current. | Scans/testing are absent, outdated, or findings are unresolved without formal disposition. |
| Incident response | IR plan exists, includes required timelines, and exercises/process evidence are current. | Generic or stale plan, missing required timeline handling, or no practice evidence. |
| Continuous monitoring | Required periodic monitoring outputs are complete with no unexplained gaps. | Missing submissions, incomplete monitoring records, or undocumented gaps. |
| Documentation completeness | Workbook/SSP are complete, current, and aligned to actual controls. | Blank, stale, or inaccurate control documentation. |
| Third-party controls | Subservice assurance artifacts are current and contract requirements are in force. | No current assurance review or weak vendor obligations. |

## TDPSA

### Applies When

- The organization conducts business in Texas or targets Texas residents and processes personal data in scope under TDPSA.

### Question Groups

- Privacy policy and transparency
- Consumer rights and DSAR operations
- Data protection assessments
- Opt-out and consent controls
- Processor contract controls

### Audit Questions

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

### Pass-Fail Logic

| Area | Pass When | Fail When |
| --- | --- | --- |
| Privacy policy and transparency | Policy disclosures are specific and technically aligned with actual data behavior. | Boilerplate or incomplete policy, or mismatch between disclosed and observed behavior. |
| Consumer rights and DSAR operations | Intake, verification, fulfillment timing, retention, and appeals are documented and operating. | Ad-hoc requests, missing verification/retention/appeals, or timing non-compliance. |
| Data protection assessments | DPAs exist for each in-scope activity and contain balancing analysis and safeguards. | No DPA, superficial memo, or missing required analysis elements. |
| Opt-out and consent controls | UOOM/GPC handling and sensitive-data consent controls are technically enforced. | Policy-only statements without operational enforcement. |
| Processor contract controls | Executed processor agreements include required obligations. | Generic terms without required processor commitments. |

## Texas Data Breach Notification

### Applies When

- The organization holds computerized sensitive personal information for Texas residents and experiences a qualifying breach scenario.

### Question Groups

- Incident response legal readiness
- Notification timing control
- Responsibility and execution readiness
- Breach recordkeeping

### Audit Questions

1. Does the incident response plan include Texas-specific breach notification requirements and timelines?
2. Is there a defined process to determine when statutory notification clocks begin?
3. Is responsibility assigned for attorney general reporting where thresholds are met?
4. Are procedures defined for notifying affected individuals within required windows?
5. If acting as a processor, is immediate controller notification built into workflow?
6. Are breach lifecycle records maintained from discovery through notification completion?

### Pass-Fail Logic

| Area | Pass When | Fail When |
| --- | --- | --- |
| Incident response legal readiness | Plan includes Texas-specific obligations and operational steps. | Generic plan with no Texas-specific obligations. |
| Notification timing control | Determination and clock-tracking process is defined and demonstrably used. | No clock ownership or unclear trigger points. |
| Responsibility and execution readiness | Reporting ownership, channels, and execution paths are clearly assigned. | Ownership ambiguous or reporting process undefined. |
| Breach recordkeeping | End-to-end records exist for discovery, decisioning, notifications, and dates. | Incomplete or missing notification audit trail. |

## Texas Sales Tax (SaaS)

### Applies When

- The SaaS business has Texas sales-tax obligations via nexus or other taxable presence conditions.

### Question Groups

- Nexus determination and registration
- Filing cadence and reconciliation
- Exemption certificate controls
- Rate application accuracy
- Record retention

### Audit Questions

1. Is Texas nexus assessed on a rolling basis with a defined threshold-monitoring process?
2. Is registration completed when tax collection obligations are triggered?
3. Are sales-tax returns filed at required frequency and reconciled to ledger data?
4. Are exemption or resale certificates complete, signed, and collected on time?
5. Are destination-based rates correctly applied to taxable transactions?
6. Are required records retained for the auditable period?

### Pass-Fail Logic

| Area | Pass When | Fail When |
| --- | --- | --- |
| Nexus determination and registration | Nexus monitoring is documented and registration is timely when required. | Threshold awareness exists but no timely registration/activation. |
| Filing cadence and reconciliation | Returns are filed on cadence and reconcile to source accounting records. | Filing gaps or unreconciled reporting. |
| Exemption certificate controls | Valid certificates support exempt treatment with appropriate timing. | Missing, incomplete, or late-only certificate coverage. |
| Rate application accuracy | Destination-based tax treatment is correctly applied. | Flat or incorrect rate logic causes over/under-collection. |
| Record retention | Required records are retained and retrievable for audit windows. | Records are missing, incomplete, or not audit-ready. |
