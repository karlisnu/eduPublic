# Week 1 Verification

This checklist records the evidence required to approve Step 0. MySQL is the supported database for this project.

## Local environment

Run these commands inside the Dev Container:

```bash
node --version
python3 --version
git --version
mysql -h db -u dev -pdev appdb -e "SELECT 1;"
```

The expected runtime is Node 22.x. Python is optional for the current Node.js path. The database command must return one row containing `1`.

The frontend can be started with:

```bash
cd frontend
npm run dev
```

It should be available at `http://localhost:5173`.

## Reproducibility

1. Clone the private repository using SSH.
2. Open the repository in VS Code.
3. Run **Dev Containers: Reopen in Container**.
4. Confirm that `.devcontainer/setup.sh` completes without manual dependency installation.
5. Run the commands above from a second partner account or machine.

The setup script installs frontend dependencies, waits for MySQL, and executes `SELECT 1` before reporting that the environment is ready. CI performs the same database check using the MySQL service container.

## GitHub controls

These controls must be configured in the repository settings because they cannot be enforced by a source file alone:

- Repository visibility is private.
- Both partners are collaborators with write access.
- Both partners have successfully cloned using SSH.
- `main` is protected: pull request required, one approval required, CI required, and direct pushes disabled.
- A GitHub Projects board exists with `Todo`, `In progress`, `In review`, and `Done` columns.
- An issue titled `Project Proposal` is open and uses the project proposal template.

Record the issue URL, project URL, and a screenshot or settings URL in the milestone review. Do not commit credentials, private keys, or screenshots containing secrets.

## Pair evidence

For every work session, update `docs/pair-log.md` with the date, driver, navigator, task, and result. Swap driver and navigator every 20 minutes. Both partners must contribute commits to frontend and backend work before the milestone review.
