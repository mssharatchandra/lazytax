# Private-data security protocol

Status: Build Week MVP. This document describes the controls implemented for local private review; it is not a certification of compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act), tax-professional obligations, or any other law.

## Two deliberately separate data modes

| Mode | Intended use | Input and output boundary |
| --- | --- | --- |
| `synthetic_demo` | Public demos, judging, tests, and evaluation | Uses a synthetic-only schema and rejects common direct identifiers such as PAN, Aadhaar, email, mobile, IFSC, and bank-account patterns. Outputs retain synthetic source labels for an inspectable demo. |
| `local_private` | A user-authorized, read-only review of their tax facts | Uses a separate private schema, requires `local_private_processing_consent: true`, and returns masked identifiers plus the literal guarantees `local_only`, `persistence: none`, `network: none`, and `identifiers: masked`. |

The engine rejects a request that mixes the two modes. The canonical Build Week and judge workflow remains synthetic.

## Authorized private-review flow

1. The user must explicitly name the documents to be reviewed and authorize those documents for the current tax task. Authorization is narrow: it does not extend to a directory, account, inbox, portal, or later request.
2. The Codex/ChatGPT host reads only those named files and extracts the minimum structured facts needed by the tool: tax period, document kind, one taxpayer reference, tax category, whole-rupee amount, and source-row identifiers. It must omit unrelated personal fields.
3. The host calls `lazytax_normalize_private_tax_facts` with those structured facts and explicit consent. The MCP server does not open paths or discover files, so the host is responsible for preserving the named-file boundary; the server independently requires the consent flag but cannot verify filesystem selection.
4. The engine checks one taxpayer and one supported FY/AY, detects document-ID collisions, deduplicates byte-equivalent repeated documents, and rejects duplicate evidence identifiers.
5. Before returning, the engine replaces the taxpayer, document, evidence, and line identifiers with HMAC-derived pseudonyms. The HMAC key is random, process-local, never persisted or sent, and changes across server restarts.
6. Reconciliation and the Tax Proof Pack operate on the masked, source-linked dataset. They preserve lineage to pseudonymous evidence IDs without returning names, raw document IDs, PANs, source labels, locators, notes, or contact details.

The private tool is read-only and performs no filing, portal login, tax payment, or credential collection. Its contract requires the agent to refuse passwords, OTPs, portal credentials, Aadhaar, signatures, addresses, and contact details and to tell the user not to provide them. The current private-input schema does not scan every free-text field for secret patterns; callers must enforce this refusal before constructing the request.

## Runtime and decision gates

- **No MCP network:** the local stdio MCP implementation makes no network calls during private normalization.
- **No MCP persistence:** private inputs, outputs, and the HMAC key are not written to disk or a database by the MCP server. They live only in process memory for the active session.
- **No MCP payload logging:** the server intentionally emits no taxpayer-data logs or analytics. Host, operating-system, dependency, or infrastructure diagnostics are outside this guarantee and must be assessed before production use.
- **Data minimization:** strict schemas reject extra object fields; private outputs replace human-readable evidence metadata with fixed labels and masked tokens and omit notes.
- **Mixed-taxpayer gate:** all documents in a request must share one taxpayer reference. Mixed FY/AY requests are also rejected.
- **Deduplication and collision gate:** identical repeats are processed once with a warning; different documents sharing an ID, duplicate evidence IDs, duplicate source IDs, and duplicate line IDs are rejected.
- **Unsupported-tax-fact gate:** unsupported or derived fixture records are not silently treated as taxable income. Supported private credit facts such as employer TDS and foreign tax withheld retain masked evidence lineage; unsupported taxpayer profiles and unresolved reconciliation conflicts fail closed rather than being guessed.
- **Output integrity:** downstream reconciliation and proof generation validate mode metadata, masked private evidence shape, unique IDs, source bindings, and calculation/proof hashes.

## Codex and ChatGPT data-control caveat

“Local MCP” describes the LazyTax tool process, not the entire Codex or ChatGPT environment. Files, prompts, extracted facts, and tool arguments may still be processed or retained by the host product according to the user’s plan, workspace settings, administrator controls, and current OpenAI terms. Before using real tax documents, the operator must verify the applicable data controls, training settings, retention period, region, and enterprise/API contractual terms. Use only the bundled synthetic fixtures when those guarantees are unknown or unsuitable.

## Production gaps before real-user launch

The MVP is privacy-conscious but not yet a production compliance program. A real-user launch requires, at minimum:

- encryption at rest and in transit across every host and service boundary, managed key rotation, secrets management, encrypted backups, and recovery testing;
- authenticated users and clients, OAuth where integrations require it, tenant isolation, least-privilege authorization, session expiry, and revocation;
- tamper-evident security and consent audit records that exclude raw tax payloads, with access monitoring and incident response;
- a documented retention/deletion schedule, user export/correction/deletion workflows, backup deletion, and data-subject request operations;
- DPDP notices and valid consent flows covering purpose limitation, data minimization, withdrawal, grievance handling, breach response, children’s-data exclusions, cross-border processing, and the duties of the Data Fiduciary/Data Processor;
- signed processor/data-protection contracts, a subprocessor register, vendor security reviews, data-location mapping, and contractually aligned OpenAI/hosting retention controls; and
- independent legal review, threat modelling, penetration testing, dependency and supply-chain controls, and evidence that every claimed safeguard works in the deployed environment.

Until those gaps are closed and reviewed by qualified counsel and security professionals, private mode should be treated as a local prototype for user-authorized verification—not as a compliant filing service or a repository for production taxpayer data.
