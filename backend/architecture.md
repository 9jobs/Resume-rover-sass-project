# ATS Resume Maker extension
Existing Node authentication and saved data remain authoritative. The new Python backend uses validated profile data and an extensible ontology, with deterministic JD extraction, role classification, date calculations, explainable scoring and a conservative tailoring pass. Unknown requirements become questions. No unverified term becomes a fact. Existing local PDF/DOCX rendering remains available; application highlights never enter exports.

Modules: models.py → ontology/aliases.json → pipeline.py → API/CLI bridge → existing review screen.
Python API is loopback-only and requires an internal bearer token. The Node bridge derives user identity from the existing authenticated session. No migration of the protected engine or existing database is performed.
