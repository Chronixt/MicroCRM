# Agent Workflow Rules (MicroCRM)

These rules are mandatory for any coding agent working in this repository.

## Branching Policy

1. Never commit directly on these branches:
   - `main`
   - `hairdresser-crm`
   - `tradie-crm`
2. Always create/use a temporary working branch for implementation.
3. Preferred temp branch naming:
   - `work/<short-topic>-<yyyymmdd>`
   - `fix/<short-topic>-<yyyymmdd>`
   - `chore/<short-topic>-<yyyymmdd>`

## Required Delivery Flow

1. Build and commit changes on a temp working branch.
2. Open PR: temp branch -> `main`.
3. After `main` is updated, propagate via product PRs:
   - `main` -> `hairdresser-crm`
   - `main` -> `tradie-crm`
4. Do not skip the `main` integration step unless explicitly instructed by repository owner.

## Pre-Commit Guard

Before any commit, agents must verify current branch:

- If current branch is `main`, `hairdresser-crm`, or `tradie-crm`, stop and create a temp working branch first.

## If a Commit Was Made on the Wrong Branch

1. Create a temp branch from the intended integration base.
2. Cherry-pick the commit(s) onto the temp branch.
3. Keep/revert/reset wrong-branch commits only after owner confirmation.
4. Proceed with normal PR flow (temp -> `main` first).

## Notes Migration Safety Workflow

For typed-note migration and similar high-risk changes:

1. Rehearsal order:
   - `hairdresser_sandbox_admin`
   - `hairdresser`
   - `tradie`
   - production
2. Require validation scripts + parity gates before production.

