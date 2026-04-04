# Texas Regulatory Compliance Audit for SaaS: Deliverables, Questions, Evidence, and Developer Guide

## Executive Summary

A Texas regulatory compliance audit of a Software as a Service product spans four primary legal regimes: the **Texas Risk and Authorization Management Program (TX-RAMP)** for cybersecurity if serving state agencies, the **Texas Data Privacy and Security Act (TDPSA)** for consumer data privacy, the **Texas Data Breach Notification Law** (B&C Code §521.053) for incident response obligations, and the **Texas Comptroller's sales tax rules** for revenue and nexus. Each regime has distinct deliverables, audit questions, and evidentiary standards. This guide presents both auditor-facing instructions for requesting and verifying evidence, and developer-facing instructions for producing evidence that will pass scrutiny. Throughout, strikingly close but ultimately unsatisfactory examples are highlighted to expose common pitfalls.

***

## Part 1: The Four Regulatory Regimes — Overview

| Regime | Governing Authority | Applies To | Penalty |
|--------|---------------------|------------|---------|
| TX-RAMP | Texas DIR (Dept. of Information Resources) | SaaS serving TX state agencies | Contract disqualification |
| TDPSA | Texas Attorney General | SaaS processing TX residents' personal data (non-small-business) | Up to $7,500 per violation[1] |
| Data Breach Notification (§521.053) | Texas AG + DIR | Any SaaS holding sensitive TX resident data | Civil action, AG enforcement[2] |
| Sales Tax (Comptroller) | Texas Comptroller of Public Accounts | SaaS with $500K+ in TX annual revenue or physical presence | 5–10% penalty on unpaid tax[3] |

***

## Part 2: TX-RAMP Compliance Audit

### What TX-RAMP Is and Who It Applies To

TX-RAMP is managed by the Texas Department of Information Resources and provides a standardized security assessment, authorization, and continuous monitoring framework for cloud computing services — including SaaS — that process the data of Texas state agencies. Texas Government Code § 2054.0593 mandates the program. SaaS products fall squarely within its definition of "cloud computing services" per NIST SP 800-145.[4][5][6]

There are two certification levels:[7][8]
- **Level 1**: 117 NIST 800-53 controls; for public or non-confidential data in low-impact systems
- **Level 2**: 223 NIST 800-53 controls; for confidential or regulated data (PII, PHI) in moderate/high-impact systems; requires annual penetration testing and quarterly monitoring reports

Certifications are valid for three years with required continuous monitoring upkeep. A Fast Track process exists for vendors already holding SOC 2 Type 2, PCI DSS, HITRUST, FedRAMP, or StateRAMP certifications.[9][10][11]

***

### TX-RAMP: Audit Questions an Auditor Will Ask

**Access Control**
- Does the SaaS product implement role-based access controls (RBAC) with documented user roles?
- Is multi-factor authentication (MFA) enforced for all privileged and administrative accounts?
- How are access reviews conducted and how often?
- How are accounts for terminated employees or contractors deprovisioned?

**Vulnerability Management**
- What vulnerability scanning tools are used, how often are scans run, and who reviews results?
- For Level 2: Has an annual penetration test been conducted by a qualified third party?
- For high-severity vulnerabilities, what is the documented remediation or risk acceptance process?

**Incident Response**
- Does the organization have a documented Incident Response Plan (IRP)?
- At Level 2: Is DIR notified within 48 hours of a security incident?
- Have tabletop exercises or simulated breaches been conducted? When?

**Continuous Monitoring (Level 2)**
- Are quarterly monitoring reports submitted to DIR?
- What SIEM or EDR tools are deployed and what logs are retained, for how long?

**Documentation Completeness**
- Is the TX-RAMP Security Plan (Control Implementation Workbook) fully completed for every required control?
- Is the System Security Plan (SSP) current and accurate?

**Third-Party / Subservice Providers**
- Has the organization obtained and reviewed SOC 2 reports from all carved-out subservice organizations (e.g., AWS, Azure)?
- Do vendor contracts require them to maintain equivalent security standards?

***

### TX-RAMP: Evidence — Satisfactory vs. Unsatisfactory

#### Control: Role-Based Access Controls

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Screenshot of IAM role configuration in AWS console with named roles, permissions, and a timestamp | ✅ Satisfactory | Verifiable, timestamped, shows actual configuration |
| A policy document titled "Access Control Policy v2.1" signed by CISO | ⚠️ Close but NOT Satisfactory | Policy alone does not prove implementation; a policy without screenshots, logs, or configuration exports is unverifiable |
| Spreadsheet listing all user roles, last reviewed 14 months ago | ❌ Not Satisfactory | Stale; fails to show current state and demonstrates no periodic review cadence |

> **Pitfall:** Submitting a well-written access control *policy* without any corresponding *evidence of implementation* is the most common TX-RAMP failure. An auditor cannot certify a policy — they must certify a control that is demonstrably operating.[12]

#### Control: Vulnerability Management

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Exported scan report from Tenable/Qualys with scan date, host list, finding severity, and a separate remediation ticket log | ✅ Satisfactory | Demonstrates the scan ran, findings were identified, and remediation was tracked |
| A written statement: "We conduct monthly vulnerability scans using our internal tools" | ⚠️ Close but NOT Satisfactory | Self-attestation without any scan output, export, or log is not verifiable by an auditor[13] |
| Scan report showing 3 critical vulnerabilities marked "noted" with no remediation plan or risk acceptance documentation | ❌ Not Satisfactory | TX-RAMP explicitly requires a remediation plan OR a risk mitigation description for high-severity findings[14] |

#### Control: Annual Penetration Test (Level 2 Only)

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Signed, dated penetration test report from a qualified third-party firm, including scope, methodology, findings, and remediation status | ✅ Satisfactory | Complete documentation chain from scoped engagement to remediated findings |
| Internal team's "security review" report with a checklist of items tested | ⚠️ Close but NOT Satisfactory | Level 2 requires an *independent* third-party test; internal self-assessments do not qualify[7] |

#### Control: Terminated Employee Account Deprovisioning

| Evidence Submitted | Verdict | Why |
|---|---|---|
| HR offboarding records cross-referenced with IAM audit logs showing account disabled same-day, with ticket system evidence | ✅ Satisfactory | Shows a complete, traceable process with timestamps |
| Access review spreadsheet showing no terminated employees currently have access | ⚠️ Close but NOT Satisfactory | A point-in-time snapshot does not demonstrate the *process* or that it operates continuously; any gap period is invisible |

***

### TX-RAMP: Auditor Instructions

1. **Request the TX-RAMP Security Plan / Control Implementation Workbook** and verify it is fully completed for every control at the applicable level (all required fields populated, no blanks).
2. **Cross-reference policy documents against technical evidence**: For every stated control, request at least one artifact showing that control is operational — logs, configuration exports, screenshots with visible timestamps, or third-party reports.
3. **Verify evidence dates**: Evidence should fall within the assessment window. Reject documentation older than 12 months for operational controls.
4. **For Level 2**: Confirm a penetration test report is from a named, qualified third-party firm. Ask for their methodology and scope statement; if scope excludes major attack surfaces, flag it.
5. **Review subservice SOC 2 reports**: Ask for the most recent SOC 2 Type 2 reports for all cloud infrastructure providers (AWS, Azure, GCP). Confirm the vendor reviewed the report — ask to see documented review notes.[15]
6. **Test continuous monitoring claims**: For Level 2, ask for the last four quarterly monitoring reports submitted to DIR. Gaps indicate a compliance lapse.
7. **Spot-check access reviews**: Request a user access roster and compare it against the most recent access review log. Select 5–10 users at random and verify their access is current and appropriate.

***

### TX-RAMP: Developer Instructions for Producing Satisfactory Evidence

1. **Implement a compliance calendar** — scheduled dates for quarterly access reviews, monthly vulnerability scans, annual pen tests, and Level 2 quarterly DIR monitoring reports.
2. **Use a GRC (Governance, Risk, and Compliance) platform** such as Vanta, Drata, or Secureframe to automatically collect, timestamp, and centralize evidence artifacts.[16]
3. **Every policy must have a paired procedure** describing *who does what*, *when*, *how*, and *with what tool*. The procedure must reference the specific tool generating the evidence artifact.
4. **Export, don't just screenshot**: Use API exports or automated log exports from tools like AWS CloudTrail, Azure Sentinel, or Okta — these carry native timestamps, user attribution, and are more credible than manual screenshots.[17]
5. **Document vulnerability remediation in a ticket system** (Jira, ServiceNow): open a ticket for every finding at high severity or above. Close it with a resolution note, date, and re-scan confirmation. This creates a traceable chain from discovery to remediation.
6. **For employee offboarding**, create an automated workflow (via Okta, Azure AD, or your ITSM): trigger deprovisioning within 24 hours of HR status change. Log the workflow output and retain it.
7. **Pre-fill the Control Implementation Workbook** using your GRC platform. Leave no field blank — if a control is not applicable, document why in the "Implementation Details" column rather than leaving it empty.[18]

***

## Part 3: TDPSA Compliance Audit

### What the TDPSA Requires

The Texas Data Privacy and Security Act (HB 4) became effective July 1, 2024, with universal opt-out mechanism provisions effective January 1, 2025. It applies to any for-profit entity that conducts business in Texas or serves Texas residents, processes or sells personal data, and is not classified as a small business under the U.S. SBA definition (fewer than 500 employees). Penalties can reach $7,500 per violation enforced exclusively by the Texas Attorney General, with a 30-day cure period before enforcement. There is no private right of action.[19][1][20][21]

Key obligations for SaaS controllers and processors:[22][23]
- Publish a compliant privacy policy
- Honor five consumer rights: access, know, correct, delete, opt-out
- Respond to consumer rights requests (DSARs) within 45 days
- Conduct Data Protection Assessments (DPAs) for high-risk processing
- Honor Universal Opt-Out Mechanisms (UOOMs) like Global Privacy Control
- Sign compliant data processing agreements with sub-processors
- Maintain reasonable technical and organizational security measures

***

### TDPSA: Audit Questions an Auditor Will Ask

**Privacy Policy and Transparency**
- Does the privacy policy disclose all categories of personal data collected, the purpose for collection, third-party sharing, and how consumers exercise their rights?
- Does the policy accurately reflect the *actual* data collected — has it been validated against observed browser/application behavior?

**Consumer Rights (DSAR Process)**
- Does the platform provide at least two methods for consumers to submit a data subject access request (e.g., web form + email)?
- What is the process for verifying a consumer's identity before responding?
- Can the system locate, correct, export, and delete a specific consumer's data on demand?
- Are DSAR records retained for two years?
- Is there an appeals process for denied requests?

**Data Protection Assessments**
- Has a DPA been conducted for each of the following activities if performed: targeted advertising, sale of personal data, profiling with foreseeable risk, processing of sensitive data?
- Does each DPA weigh benefits against risks, consider deidentification, and document consumer expectations and context?

**Opt-Out and Consent**
- Does the platform honor Global Privacy Control (GPC) signals as a unified opt-out mechanism?
- Has explicit opt-in consent been obtained prior to processing any sensitive personal data?

**Processor Contracts**
- Do all data processing agreements with vendors cover: purpose limitation, confidentiality obligations, deletion upon contract termination, audit rights, sub-processor restrictions, and breach notification duties?

***

### TDPSA: Evidence — Satisfactory vs. Unsatisfactory

#### Requirement: Privacy Policy Accuracy

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Privacy policy + automated scan output (e.g., from Feroot or Cookiebot) showing every tracker/cookie observed is documented in the policy | ✅ Satisfactory | Directly cross-validates stated vs. actual data collection behavior[24] |
| A legally reviewed privacy policy that lists general data categories | ⚠️ Close but NOT Satisfactory | Legal review does not verify technical accuracy; if the app loads 12 ad trackers and the policy lists only "analytics data," the policy is non-compliant regardless of quality of its prose |
| A privacy policy template with company name inserted and generic categories ("we may collect information you provide to us") | ❌ Not Satisfactory | Vague/boilerplate language is explicitly identified by Texas regulators as insufficient[25] |

#### Requirement: Data Protection Assessment (DPA)

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Written DPA document for targeted advertising that identifies specific data types used, processing purposes, risks to consumers (re-identification, profiling), safeguards employed (data minimization, opt-out link), and a benefits-vs-risks balancing analysis | ✅ Satisfactory | Meets all required elements under §541.105[23] |
| "We reviewed our targeted advertising activities internally and determined they are compliant" — a one-paragraph internal memo | ⚠️ Close but NOT Satisfactory | This is a conclusion, not an assessment. A DPA must *document* the weighting of benefits vs. risks and the safeguards applied; a memo asserting compliance without methodology is not a DPA[26] |
| DPA that covers only future processing activities, not processing that began before the TDPSA effective date (July 1, 2024) | ❌ Not Satisfactory | DPAs are required for processing activities initiated *after* July 1, 2024; however, any new processing after that date must be assessed, and a gap analysis must demonstrate what predates vs. postdates the law[27] |

> **Pitfall:** The most common TDPSA audit failure is conducting targeted advertising or selling user data without *any* documented DPA. The Attorney General does not need internal system access to discover this — the website's observable behavior (ad pixels, GPC non-compliance) is itself evidence.[24]

#### Requirement: DSAR Response Process

| Evidence Submitted | Verdict | Why |
|---|---|---|
| DSAR ticketing system export showing: request received date, identity verification step, fulfillment date (within 45 days), and type of response (access, delete, etc.) | ✅ Satisfactory | Demonstrates a repeatable, documented process with timestamps[28] |
| Email thread showing a consumer asked to delete their data and the company replied "done" with no verification step or record | ⚠️ Close but NOT Satisfactory | Response was given, but absence of verification, process, and record retention means there is no evidence the *correct* consumer's data was deleted and the record will not exist for the required 2-year retention period[19] |
| "We respond to all requests personally on a case-by-case basis with no formal system" | ❌ Not Satisfactory | TDPSA requires a repeatable, documented process with an appeals mechanism; ad-hoc responses cannot demonstrate consistent 45-day compliance[28] |

#### Requirement: Universal Opt-Out Mechanism (UOOM) / Global Privacy Control

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Screenshot or automated test log showing GPC signal detection code is implemented, with a before/after comparison of cookie behavior when GPC is enabled in browser | ✅ Satisfactory | Directly demonstrates that GPC signals are honored in practice[29] |
| Privacy policy statement: "We honor opt-out requests including via browser settings" | ⚠️ Close but NOT Satisfactory | Stating intent is not evidence of technical implementation; the GPC requirement is a *technical* obligation requiring code-level implementation, effective January 1, 2025[29] |

#### Requirement: Processor Contracts

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Executed DPA with each sub-processor (AWS, Stripe, analytics vendors) containing all required clauses: purpose, duration, confidentiality, deletion, audit rights, breach notification, sub-processor approval | ✅ Satisfactory | Complete contractual chain evidenced[22] |
| Terms of Service agreement with an analytics vendor that includes a vague "we take security seriously" clause | ⚠️ Close but NOT Satisfactory | A general ToS is not a Data Processing Agreement; without a specific DPA containing all required TDPSA elements, the relationship is uncontrolled and the controller bears full liability[30] |

***

### TDPSA: Auditor Instructions

1. **Request the Privacy Policy and validate it technically**: Use a cookie/tracker scanning tool (e.g., Cookiebot, Feroot, OneTrust Scanner) to observe what data the application *actually* collects. Compare against what the policy discloses. Any discrepancy is a finding.[24]
2. **Test the DSAR submission channels**: Submit a test consumer rights request (access and delete) through each offered channel. Verify that identity verification is requested, the response arrives within 45 days, and an appeals mechanism is communicated upon any denial.
3. **Review the DSAR log or ticketing system**: Request a sample of the last 12 months of DSAR submissions with response dates. Verify none exceeded 45 days (or 90 days with proper extension notice). Verify records are kept for 2 years.[19]
4. **Audit DPA inventory**: For every high-risk processing activity (targeted ads, data sale, sensitive data, profiling), a DPA must exist and be dated after July 1, 2024. Read each DPA for the required balancing analysis — not just a statement of compliance.[23]
5. **Test GPC/UOOM compliance**: Use a browser with Global Privacy Control enabled (Firefox with Privacy Badger, or Brave browser). Load the application and inspect the cookies/trackers set. If tracking cookies are set despite a GPC signal, this is a direct violation.[29]
6. **Review sub-processor agreements**: Request a list of all sub-processors (cloud hosts, payment processors, analytics, CRM tools). For each, request the executed DPA. Verify each DPA contains the required contractual elements under TDPSA §541.104.[22]
7. **Request evidence of sensitive data consent mechanisms**: If the application processes health, biometric, geolocation, or other sensitive data, verify that an explicit opt-in consent prompt exists and that consent logs are retained.[26]

***

### TDPSA: Developer Instructions for Producing Satisfactory Evidence

1. **Conduct a data inventory *before* writing your privacy policy**: Map every data category collected, every vendor that receives it, and every purpose. Use your actual application code and network requests as the source of truth — not assumptions.[31]
2. **Run a cookie/tracker audit** using an automated tool (Cookiebot, Termly, OneTrust) before submission. Produce an automated scan report and compare it against your privacy policy. Resolve discrepancies before the audit, not after.
3. **Build a DSAR intake system** (even a simple one): Use a web form connected to a ticketing system (Zendesk, Jira, or a custom form). Every submission must auto-generate a timestamped ticket. Build a response SLA alert for day 40 (5-day buffer before the 45-day deadline).
4. **Document your DPAs in a formal template** that explicitly addresses each required element under §541.105: the processing activity name, the data types involved, the risks enumerated, the safeguards implemented, and a documented benefits vs. risks conclusion.[23]
5. **Implement GPC detection in code**: Add a check for the `Sec-GPC: 1` HTTP header and the `navigator.globalPrivacyControl === true` JavaScript property. When detected, suppress ad trackers, analytics that share data, and any sale of data. Log the detection event. Retain logs.
6. **Execute written DPAs with all sub-processors**: Do not rely on vendors' public Terms of Service. Request their standard DPA (major vendors like AWS, Stripe, Google have published DPA templates). Execute and retain them. Build a renewal calendar.
7. **Retain DSAR records for 2 years**: Even after a consumer's data has been deleted, retain the *record of the deletion request* and the minimum information necessary to ensure compliance (request date, type, response date, disposition).[19]

***

## Part 4: Texas Data Breach Notification Audit

### Applicable Law

Texas Business & Commerce Code §521.053 imposes mandatory notification obligations upon any entity conducting business in Texas that holds computerized sensitive personal information. Key timelines following a 2023 amendment:[2][32]

- **60 days** from discovery: notify all affected Texas residents
- **30 days** from determination of breach: notify the Texas AG if 250+ residents are affected
- **Immediately** upon discovery: third-party processors must notify the data owner
- **48 hours**: state agencies must notify DIR of security incidents (amended 2023)[33]

"Sensitive personal information" includes name plus SSN, driver's license number, financial account numbers, or health/insurance information.[2]

***

### Data Breach: Audit Questions

- Does the organization have a documented Incident Response Plan (IRP) that specifies Texas-specific breach notification obligations?
- Is there a breach determination process that establishes when the 60-day and 30-day clocks begin?
- Who is responsible for making the AG notification? Is the OAG portal access set up?
- How are affected individuals identified and notified?
- Does the organization maintain records of breach discovery date, investigation, notification content, delivery method, and dates?
- If the SaaS is a processor (not the data owner): does the IRP include immediate notification to the controller?

***

### Data Breach: Evidence — Satisfactory vs. Unsatisfactory

| Evidence Submitted | Verdict | Why |
|---|---|---|
| IRP with Texas-specific section; documented tabletop exercise in the past 12 months; log of breach notification sent to AG via OAG portal for a prior incident (if applicable) | ✅ Satisfactory | Demonstrates active, practiced, legally compliant process |
| Generic "Incident Response Plan" without Texas notification timelines or AG portal steps | ⚠️ Close but NOT Satisfactory | An IRP that does not specify the 30-day AG notification requirement and the OAG portal process leaves staff without actionable instructions[2][32] |
| "We follow industry best practices for breach response" | ❌ Not Satisfactory | No documentation of any Texas-specific obligation |

> **Pitfall:** Many SaaS companies inherit a generic IRP from a compliance template and never add Texas-specific deadlines. The most critical gap is the 30-day AG notification requirement (shortened from 60 days in 2023), which differs from the individual notification deadline and requires a *separate, concurrent* submission.[32]

***

### Data Breach: Developer/Operator Instructions

1. **Add a Texas-specific annex to your IRP** that explicitly lists: (a) the 60-day individual notification deadline, (b) the 30-day AG notification deadline when 250+ residents are affected, (c) the URL and form for the OAG breach reporting portal, and (d) the 48-hour DIR reporting obligation for state agency contexts.
2. **Pre-register on the OAG breach reporting portal** (texasattorneygeneral.gov) so credentials are available immediately during an incident. Document the portal URL and login in your IRP.
3. **Build a "breach clock" tracker**: upon discovery of any suspected breach, create a dated ticket that starts the 30-day and 60-day countdown. Assign an owner.
4. **Retain breach documentation**: discovery date, investigation log, determination date, number of affected residents, notification content, delivery method, delivery date, and AG notification submission confirmation.

***

## Part 5: Texas Sales Tax Compliance Audit (SaaS)

### Applicable Law

Texas classifies SaaS as a taxable **data processing service** at 6.25% state rate (plus up to 2% local, maximum 8.25%). A 20% exemption applies to many digital goods and services. Economic nexus is established when annual Texas revenue exceeds $500,000 — this threshold counts *all* revenue types, including tax-exempt and non-taxable transactions. Physical nexus triggers at any in-state presence. The Comptroller may audit the prior 42 months.[34][35][36][37][38]

As of May 2025, Texas amended Tax Code §111.0041 to require "sufficient" (not "contemporaneous") documentation — a meaningful evidentiary standard change that broadened the types of acceptable records.[39]

***

### Sales Tax: Audit Questions

- Has the company determined whether it has economic nexus (>$500K Texas revenue in prior 12 months)?
- Is the company registered for a Texas Sales and Use Tax Permit?
- Are sales tax returns filed at the correct frequency (monthly if >$500/month liability)?
- For each exempt or non-taxed transaction: is there a completed and signed exemption or resale certificate on file?
- Are invoices, general ledgers, and bank statements reconciled to filed sales tax returns?
- Has the correct local tax rate been applied based on the customer's location?

***

### Sales Tax: Evidence — Satisfactory vs. Unsatisfactory

| Evidence Submitted | Verdict | Why |
|---|---|---|
| Texas Sales and Use Tax Permit; monthly sales tax returns reconciled to general ledger; signed exemption certificates for all exempt customers | ✅ Satisfactory | Complete documentation chain from revenue to filed return with exemption support[40] |
| Nexus analysis concluding "we may be approaching the threshold" with no registration or filed returns | ⚠️ Close but NOT Satisfactory | Awareness of a potential obligation is not compliance; registration must occur and tax must be collected once the $500K threshold is crossed[3] |
| Exemption certificates collected *after* the audit notice was received | ⚠️ Close but NOT Satisfactory | While Texas law allows retroactive collection of certificates in some circumstances, the Comptroller's office scrutinizes post-audit collection closely, and the practical protection is weaker[39] |
| Verbal claim that "our customers told us they were exempt" with no written certificate | ❌ Not Satisfactory | Texas considers the taxpayer guilty (taxable) until proven innocent (exempt); only a completed, signed exemption or resale certificate transfers liability to the buyer[34] |

> **Pitfall:** Many SaaS companies correctly identify that their service may qualify for the 20% digital exemption, but fail to apply the *local* tax at the correct destination-based rate, creating a systematic underpayment on every transaction. Auditors routinely catch this.[38]

***

### Sales Tax: Developer/Operator Instructions

1. **Monitor your trailing 12-month Texas revenue on a rolling basis**: Build a report or dashboard that alerts you when you approach $400K (giving you time to register before the $500K threshold is crossed).[36]
2. **Register for a Texas Sales and Use Tax Permit** at the Texas Comptroller's eSystems portal *before* you are required to collect tax. Registration is free.
3. **Collect exemption/resale certificates *before* or *at* the time of the first transaction**: Certificates collected proactively provide full liability protection. Establish a certificate collection step in your onboarding flow for B2B customers who claim exemption.
4. **Apply destination-based local tax rates**: Use a tax calculation API (Avalara, TaxJar, Vertex) to determine the correct combined rate for each customer's location rather than a flat rate.
5. **Retain all records for at least 4 years** (covering the Comptroller's 42-month audit window with buffer): invoices, exemption certificates, general ledgers, bank statements, and filed returns.[34]
6. **At audit time**, produce a clean reconciliation that traces from your GL revenue lines to each line of your filed sales tax returns. The Comptroller's auditor will test this reconciliation.[40]

***

## Part 6: Cross-Cutting Audit Pitfalls — The "Close But Not Satisfactory" Pattern

The following table consolidates the most commonly submitted evidence that appears compliant but fails on closer inspection:

| What Was Submitted | Why It Looks Satisfactory | Why It Actually Fails | Correct Evidence |
|---|---|---|---|
| Access control *policy* document | Well-written, board-approved, comprehensive | Policies prove intent, not implementation; no operational evidence[12] | Policy *plus* IAM configuration export with timestamps |
| Internal pen test report from your own security team | Detailed findings, professional format | Level 2 TX-RAMP requires *independent* third-party testing[7] | Signed report from a named external firm with methodology |
| Privacy policy with generic data categories | Attorney-reviewed, published on website | Technical scan shows undisclosed trackers are active[24] | Policy aligned with automated scanner output |
| One-paragraph memo asserting DPA was conducted | Signed by CISO, on company letterhead | A DPA must document the weighing analysis — a conclusion is not an assessment[26] | Full DPA document with risk/benefit matrix per §541.105 |
| Vulnerability scan report showing open critical issues with no remediation docs | Proves scans are conducted | TX-RAMP requires remediation plans OR risk acceptance for high-severity findings[14] | Scan report + linked remediation tickets with closure dates |
| DSAR email thread with resolution | Responsive to consumer, in writing | No verification step, no 2-year record retention, no appeals process documented[28] | Ticketing system export with all required fields |
| GPC opt-out text in privacy policy | Policy states UOOMs are respected | GPC compliance is a *technical* requirement — code must detect the header and suppress tracking[29] | Code implementation + browser test log |
| Exemption certificates collected after audit notice | Certificates are signed and complete | Post-audit collection is permissible under amended law but viewed skeptically[39] | Pre-transaction certificates with transaction dates predating collection |
| Generic IRP without Texas deadlines | Covers most breach scenarios | Missing the 30-day AG notification requirement and OAG portal process[32] | IRP with Texas-specific annex and OAG portal credentials |
| SOC 2 reports obtained but not reviewed | Demonstrates vendor diligence | Auditors look for documented review notes showing relevant findings were evaluated[15] | SOC 2 reports + internal review memo noting relevant exceptions |

***

## Part 7: Audit Deliverables Summary

### For Auditors — Required Deliverables to Collect

**TX-RAMP Audit Package:**
- TX-RAMP Security Plan (Control Implementation Workbook) — fully completed[18]
- System Security Plan (SSP)
- Evidence artifacts for each control (logs, configuration exports, screenshots with timestamps)
- Penetration test report (Level 2) from qualified independent firm
- Last 4 quarterly monitoring reports (Level 2)
- Subservice organization SOC 2 reports with review documentation[15]
- Vulnerability scan reports + remediation tracking logs[14]
- User access roster and access review records (quarterly for Level 2)
- Incident response plan and tabletop exercise records

**TDPSA Audit Package:**
- Published privacy policy + automated tracker scan report[24]
- DSAR intake process documentation + sample ticketing records[28]
- DSAR log covering past 2 years (request date, type, response date)[19]
- Data Protection Assessments for all covered activities[23]
- GPC/UOOM technical implementation evidence (code + browser test)[29]
- Executed DPAs with all sub-processors[22]
- Consent mechanism records for sensitive data processing[26]
- Consumer rights appeals process documentation[28]

**Data Breach Audit Package:**
- Incident Response Plan with Texas-specific notification section[2]
- Tabletop exercise records (last 12 months)
- OAG portal registration confirmation
- Breach notification records for any past incidents

**Sales Tax Audit Package:**
- Texas Sales and Use Tax Permit[40]
- Filed sales tax returns for audit period (42 months)[34]
- General ledger reconciliation to returns
- Exemption/resale certificates for all non-taxed customers[34]
- Nexus analysis documentation (trailing 12-month Texas revenue by month)[36]
- Customer invoices with local tax rate applied[38]

### For Developers — Compliance Infrastructure Checklist

**Continuous:**
- GRC platform collecting evidence automatically (Vanta, Drata, Secureframe)[16]
- Automated access reviews (minimum quarterly)
- Monthly vulnerability scans with automated ticket creation for findings
- Rolling 12-month Texas revenue tracker for nexus monitoring[36]

**Annual:**
- Third-party penetration test (required for TX-RAMP Level 2)[7]
- Privacy policy review + fresh automated scanner comparison
- Sub-processor DPA review and renewal

**Event-Driven:**
- DSAR received → ticketing system entry, 45-day clock started[41]
- Breach discovered → 30-day AG clock started, 60-day individual clock started[32]
- Employee termination → automated deprovisioning workflow triggered
- New high-risk processing activity → DPA required before launch[27]

***

## Conclusion

Texas imposes a layered and demanding compliance environment for SaaS companies. TX-RAMP governs security posture for state agency relationships; the TDPSA governs consumer data privacy; breach notification law governs incident response timelines; and the Comptroller governs sales tax obligations. The dominant failure pattern across all four regimes is the same: **documented intent without operational evidence**. A policy is not proof; an assertion is not an assessment; a verbal claim is not a certificate. Auditors must always request the artifact that shows the control is working, not just the document that says it should work. Developers must build compliance infrastructure — ticketing systems, automated evidence collection, GRC platforms, and programmatic tax calculation — that generates admissible artifacts as a byproduct of normal operations, rather than scrambling to recreate evidence at audit time.[42][17]



Here's your comprehensive Texas SaaS regulatory compliance audit guide. It covers all four major regulatory regimes in depth, with dual perspectives for auditors and developers.

**The guide covers:**

- **TX-RAMP** (cybersecurity for state agency SaaS) — Level 1 vs. Level 2 control differences, the Security Plan workbook, pen testing requirements, and continuous monitoring obligations
- **TDPSA** (consumer data privacy) — Data Protection Assessments, DSAR process requirements, GPC/UOOM technical compliance, and processor contract obligations
- **Texas Data Breach Notification** — the 30-day AG deadline (shortened from 60 days in 2023), the OAG portal, and the 48-hour DIR reporting requirement for state agency contexts
- **Texas Sales Tax** — the $500K nexus threshold, SaaS taxation as a data processing service, exemption certificates, and the 2025 "sufficient" documentation standard change

**The most important theme throughout:** The dominant audit failure pattern across every regime is *documented intent without operational evidence* — a written policy with no implementation artifact, a memo asserting a DPA was done with no actual assessment document, a privacy policy statement about GPC without code that enforces it. Each section includes a "Close But NOT Satisfactory" table of near-miss examples to help you recognize and avoid those traps before an auditor does.