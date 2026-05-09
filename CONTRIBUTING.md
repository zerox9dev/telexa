# Contributing to Telexa

Thanks for your interest. Telexa is a small, focused tool — contributions that keep it simple and self-hostable are most welcome.

## What's welcome

- Bug fixes
- Docker / deployment improvements
- New AI provider integrations (compatible with the OpenAI client interface)
- UI improvements that fit the existing design system (shadcn/ui, Tailwind v4)
- Documentation fixes

## What's out of scope

- Multi-user / multi-tenant support — this is intentionally single-user
- Cloud-hosted version or SaaS features
- Dependencies that can't run self-hosted

## Getting started

1. Fork the repo and clone your fork
2. Follow the [Development](README.md#development) setup in the README
3. Create a branch: `git checkout -b fix/your-fix` or `feat/your-feature`

## Making changes

- **Backend** — FastAPI + SQLAlchemy async. All routes under `/api`, all responses `{ "data": ..., "error": null }`. New DB columns need an Alembic migration in `backend/alembic/versions/`.
- **Frontend** — Use shadcn/ui primitives from `@/components/ui/*`. Lucide icons. No new UI libraries without discussion.
- **No `.env` with real credentials** in commits.

## Submitting a PR

- Keep PRs focused — one thing per PR
- Describe what changed and why in the PR description
- If it's a UI change, include a screenshot

## Reporting bugs

Open a GitHub issue with:
- What you did
- What you expected
- What happened (error message, screenshot)
- Docker version / OS if relevant
