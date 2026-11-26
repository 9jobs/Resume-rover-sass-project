# ATS Resume Maker backend — staged implementation

Local integration runs through the existing authenticated Node server on port 3211. It invokes the isolated Python backend with request data over stdin. No resume/JD data or keys are logged. Current functionality: role-neutral schema, placeholder validation, ontology matching, role-family detection, conservative category scores, date interval merging, missing-fact and metric questions, source-preserving bullet ranking, and a fact guard.

Setup (PowerShell, existing workspace):
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python -m pytest backend/tests -q
npm start

Optional standalone FastAPI:
Set ATS_INTERNAL_TOKEN to a fresh local random secret.
backend/.venv/Scripts/python -m uvicorn backend.api:app --host 127.0.0.1 --port 8877
All data endpoints require Bearer ATS_INTERNAL_TOKEN and X-ATS-User from a trusted internal bridge. Never expose this service publicly. SQLite storage is separate from existing SaaS data; ATS_DATABASE_URL can select PostgreSQL with a separately installed driver. Existing SaaS sessions remain the authority for the integrated route.

Ontology extension:
backend/.venv/Scripts/python -m backend.ontology_cli TERM ALIAS --confirm-equivalent

Scoring: keyword/context evidence, title/date alignment, role relevance, source metrics, populated sections and short bullets are scored locally. Qualification equivalence and formatting/re-extraction points are withheld pending verification. No score is an employer ATS result. No personal name, gender, age or nationality is used as a scoring input.

Known unfinished work:
- spaCy en_core_web_md and sentence embedding models are not installed or used.
- No live LLM rewriting or provider SDK implementations; UnconfiguredClient fails explicitly.
- No validated automatic summary writing, five-pass rewriting loop or confirmed-gap answer workflow.
- Full profile onboarding, all template/region presets, version comparison, LinkedIn suggestions and complete data deletion across the existing SaaS are not implemented by this extension.
- The existing frontend is retained, not migrated to React/Vite/TypeScript/Tailwind.
- Optional Docker configuration is supplied but has not been built/tested.
- The standalone API stores profiles only; it does not yet implement every requested resume/import/export/version endpoint.
- The stage is not a production-ready universal ATS product. Additional integration, security, retention, real export-scoring and model validation remain required.

Existing local PDF/DOCX exports continue through the established renderers. Green edit marks are preview-only and never included in downloads.
