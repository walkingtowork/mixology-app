---
description: How to write, test and ship a Django migration here without taking production down. Use whenever a change adds or edits a migration, including ones that come from a new third-party app.
---

# Safe migration

**Why this needs care:** Railway's start command is
`python manage.py migrate && gunicorn backend.wsgi --workers 3`. A migration that fails does
not log a warning and carry on. gunicorn never starts, and the app is down until a fix is
deployed. A merge to `main` deploys straight to production, and CI does not block it. CI
also runs on **SQLite**, while production is **Postgres 18**, so a migration can pass CI and
still fail on deploy.

## 1. Classify the migration

Read the generated file (`python manage.py makemigrations`, then open it) and decide which
kind it is.

**Additive: safe in one deploy.** New tables (including a new third-party app's own
migrations, such as `django-axes`), a nullable column, a column with a default, a new
index on a small table, `AlterField` that only changes `choices`, `help_text` or
`verbose_name`.

**Risky: phase it or rehearse it.** Anything that makes existing rows satisfy a new rule,
or that old code still running would trip over:

- `NOT NULL` on a column that existing rows leave empty
- a new unique constraint where existing data may already clash (case-insensitive ones
  especially)
- any `RunPython` or `RunSQL` that changes data
- renaming or removing a field or model that deployed code still reads
- changing a column's type

## 2. Phase the risky ones across separate deploys

The ownership migrations are the reference. Read `cocktails/migrations/0010` to `0013`:

1. **Add**: the new column is nullable (`0010`). Deploy.
2. **Backfill**: a data migration fills it in (`0011`). If code was writing new rows
   without the value in the meantime, run the backfill again just before enforcing it
   (`0012`).
3. **Enforce**: `NOT NULL` and constraints (`0013`). When you swap one constraint for
   another, add the new one **before** dropping the old one, so there is no moment with
   neither in place.

For removals, go the other way: deploy code that stops using the field first, then drop it
in a later deploy.

**Keep each data change and each schema change in separate migrations.** In Postgres, a
migration's operations share one transaction, and Postgres refuses to `ALTER` a table in
the transaction that just updated its rows ("pending trigger events"). SQLite does not
care, so CI will not catch it.

## 3. Writing data migrations

- Use `apps.get_model('app', 'Model')`, never an import from `models.py`. The real model
  changes later, and the migration must keep working against the schema it was written for.
- **An empty database must succeed.** CI and fresh checkouts have no rows and no users.
  Return early when there is nothing to do (`0011_backfill_owner` does this).
- **Fail loudly instead of skipping.** If the data cannot be fixed automatically, raise
  `RuntimeError` with a message that says what to fix and how to rerun. A skipped step is
  recorded as applied and leaves the problem for a later migration to trip over. Railway
  shows the message in the deploy log, which is the only clue you get. See `0011` and
  `accounts/migrations/0002_prepare_user_identities.py`.
- **Check the data before a constraint goes on.** A preparing migration that finds clashes
  and explains them beats a bare `IntegrityError` (`accounts` `0002` before `0003`).
- Look users up by **username**, never by id (ids differ between databases) and never by
  email (this repository is public). Allow an environment override, as
  `BACKFILL_OWNER_USERNAME` does.
- Use `migrations.RunPython.noop` for the reverse, with a comment explaining why that is
  safe.
- Update with `queryset.update()` rather than calling `save()` in a loop, unless `save()`
  logic is genuinely needed. Historical models do not have custom `save()` methods anyway.

## 4. Test it

- `python manage.py makemigrations --check --dry-run` must report no changes. CI runs this.
- For a data migration, add a `TransactionTestCase` that runs the real migration with
  `MigrationExecutor` against rows created at the old schema. Cover: existing rows end up
  right, rows already correct are left alone, an empty database succeeds, and the
  failure case raises with its message. See `OwnerBackfillMigrationTests` in
  `cocktails/tests.py`. Its `tearDown` flushes the database and migrates forward again, so
  later tests still see the full schema.
- `python manage.py test` from `backend/`.

## 5. Rehearse risky migrations on Postgres

For anything in the risky list, run it against a restored production dump before merging.
The local setup:

- Docker container `mixology-pg18` on `127.0.0.1:5433`, password `localonly`. Start it with
  `docker start mixology-pg18` (start Docker Desktop first if needed). Port 5432 belongs to
  another project. Leave it alone.
- The `mixology` database is a pristine restore. Make a scratch copy with
  `create database <name> template mixology` and migrate the copy.
- `psql`, `pg_dump` and `pg_restore` are in `/opt/homebrew/opt/libpq/bin`, not on `PATH`.
- `backend/venv` is Python 3.9 and cannot install `psycopg2-binary`. Make a throwaway
  Python 3.12 venv in the scratchpad (`/opt/homebrew/bin/python3.12 -m venv ...`, then
  `pip install -r backend/requirements.txt`) and run
  `DATABASE_URL=postgres://postgres:localonly@127.0.0.1:5433/<copy> python manage.py migrate`.
- Also force the failure case on a copy, such as a clashing row, and confirm it stops with
  your message and leaves nothing half-applied.

If the restore is old, ask the user for a fresh dump instead of assuming.

Never point anything at the real dev database (`backend/db.sqlite3`) or at production to
try a migration.

## 6. Shipping

Put these checkboxes in the PR description (see the PR handoff format):

- [ ] **Before merging:** take a fresh production dump. Backups are manual, and this Railway
  plan has none:
  `pg_dump "<DATABASE_PUBLIC_URL>" -Fc -f ~/mixology-$(date +%F).dump`, then
  `pg_restore -l <file> | grep -c "TABLE DATA"` should give roughly 18. Use the
  `*.proxy.rlwy.net` host from the Postgres service's Variables tab.
- [ ] **After deploy:** confirm Railway shows the deployment as active (gunicorn booted),
  and check something only the new schema makes possible.
- [ ] Phased change: say which phase this PR is, and that the next phase waits for this one
  to be live.

A Django fixture (`dumpdata`) is **not** a rollback. It is tied to the schema and cannot be
loaded back across a migration that changed it. The rollback is restoring the dump.
