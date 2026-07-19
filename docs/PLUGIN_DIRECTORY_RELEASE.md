# OpenAI Plugins Directory release plan

## Current status

The repository contains a real locally installable app-plus-skill plugin, but it
is not yet public-directory ready. The local MCP server uses stdio and bundled
synthetic fixtures. Public app submissions require a public production MCP URL;
alternatively, LazyTax can first submit the verification skill as a skills-only
plugin while the hosted MCP is being hardened.

OpenAI's current publication flow is: create a draft in the
[plugin submission portal](https://platform.openai.com/plugins), submit it for
review, and publish after approval. Approved plugins appear in the Plugins
Directory in both ChatGPT and Codex. See the official
[submission guide](https://learn.chatgpt.com/docs/submit-plugins).

## Recommended two-step release

### Release A — skills-only

Submit the final `verify-tax-return` skill with the synthetic workflow. This is
the fastest public path because it does not require a production MCP server.
The skill must remain useful without claiming live filing or broad tax coverage.

### Release B — app plus skills

Submit a new MCP-backed plugin after the hosted service is production ready.
Required before submission:

- Verified individual or business identity matching the public publisher.
- Apps Management write permission in the publishing organization.
- Public HTTPS MCP URL on a controlled domain.
- Domain verification token at `/.well-known/openai-apps-challenge`.
- OAuth/reviewer access with demo credentials that require no MFA, email, SMS,
  or private network.
- Exact content security policy and exact network domains.
- Accurate input/output schemas and `readOnlyHint`, `openWorldHint`, and
  `destructiveHint` values for every tool.
- Public website, support, privacy policy, and terms URLs.
- Production logo, listing copy, country availability, starter prompts, and
  release notes.
- Exactly five positive and three negative reviewer test cases.

Do not point the submission at an already published ChatGPT app. The portal
scans the MCP server directly as a new plugin submission.

## LazyTax review cases

### Positive

1. Normalize the three bundled synthetic documents.
2. Identify and explain the deliberate salary discrepancy.
3. Reconcile after an explicit synthetic confirmation.
4. Compare regimes using only the deterministic engine.
5. Generate a proof pack only after final user approval.

### Negative

1. Reject real PAN/Aadhaar or real taxpayer documents in the public demo mode.
2. Refuse an unsupported NRI/business/foreign-asset/crypto case instead of guessing.
3. Refuse proof-pack generation before conflicts and approval are complete.

## Publication blockers in this repository

- No public production MCP endpoint or authentication flow.
- No live website/support/privacy/terms URLs.
- Publisher identity and domain verification are not evidenced.
- The current app only supports synthetic data and one narrow profile.
- No reviewer demo account is necessary yet, but one will be required for an
  authenticated hosted case API.

## Release gate

Run the local validator, bundle/install smoke test, MCP contract/security tests,
the eight reviewer cases, privacy payload tests, dependency/SBOM scans, and a
clean-machine installation before uploading the exact reviewed skill tree and
submitting the production MCP URL.

