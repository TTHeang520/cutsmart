# Contributing to CutSmart

CutSmart is a small personal project. Keep changes focused, protect real user data,
and use pull requests so another contributor can review the result before release.

## Development flow

1. Start from an up-to-date `main` and create a short-lived branch.
2. Make one focused change and include tests when backend behaviour changes.
3. Never commit local databases, uploads, backups, `.env` files or real account data.
4. Run the checks below before opening a pull request.
5. Describe the user-visible result, verification performed and any deployment step.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Pull requests target `main`. Do not rewrite shared branch history after review has
started unless the team has agreed to it.

## Security and privacy

Use synthetic data in tests and screenshots. Do not post passwords, session cookies,
CSRF tokens, private backups, user emails, weights, food photos or hosting credentials
in commits, issues or pull requests. If a report contains private data, contact the
repository owner privately instead of opening a public issue.
