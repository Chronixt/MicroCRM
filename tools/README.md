# Tools Area

This directory is for operator/developer utilities that are not product runtime code.

Examples:
- backup inspection HTML tools
- export/import diagnostics
- one-off data audit scripts

## Branch Policy

- Tool files may be merged into `main`.
- Tool files must **not** be included in PRs whose base branch is:
  - `hairdresser-crm`
  - `tradie-crm`

CI enforces this policy via:
- `.github/workflows/block-tools-on-product-pr.yml`

