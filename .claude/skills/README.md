# Project skills

Four skills cherry-picked from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
(MIT, v0.6.9, commit be4e44a, copied 2026-09-12). Only these four — not the plugin, its
slash commands, or its session hook — so they add no router and don't collide with
Superpowers or gstack.

- security-and-hardening   — threat model first, OWASP patterns, serverless rate limiting, secrets
- shipping-and-launch      — pre-launch checklist, rollout thresholds, rollback plan template
- documentation-and-adrs   — ADRs for decisions that currently live outside the repo
- ci-cd-and-automation     — quality-gate pipeline (see .github/workflows/ci.yml)

The `../references/` checklists they link to were copied alongside so the relative links resolve.
To refresh: re-copy `skills/<name>/SKILL.md` and `references/*.md` from the upstream repo.
