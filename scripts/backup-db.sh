#!/usr/bin/env bash
#
# Dumps the SAM Supabase database to ./backup/.
#
# Postgres has no single ".db" file to copy the way SQLite does, so a backup is
# a dump. This writes two of them:
#
#   *.dump       custom format, the real backup — restore with pg_restore
#   *.data.sql   data only, plain SQL — readable, for eyeballing what was saved
#
# Usage:
#   export SAM_DB_URL='postgresql://postgres:<password>@<host>:5432/postgres'
#   ./scripts/backup-db.sh
#
# SAM_DB_URL is the connection string from Supabase -> Settings -> Database.
# It carries the database password, NOT the anon or service-role key. If the
# password contains characters like @ : / ? # they must be percent-encoded.
#
# Restore the whole database from a dump:
#   pg_restore -d "$SAM_DB_URL" --clean --if-exists backup/sam-<stamp>.dump

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="$repo_root/backup"
stamp="$(date +%Y%m%d-%H%M%S)"

if [[ -z "${SAM_DB_URL:-}" ]]; then
  cat >&2 <<'EOF'
error: SAM_DB_URL is not set.

Get it from Supabase -> Settings -> Database -> Connection string (URI),
then:

  export SAM_DB_URL='postgresql://postgres:<password>@<host>:5432/postgres'

Note this needs the database password, not the anon or service-role key.
EOF
  exit 1
fi

for tool in pg_dump pg_restore; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: $tool not found. Install the postgresql-client package." >&2
    exit 1
  fi
done

mkdir -p "$backup_dir"

dump_file="$backup_dir/sam-$stamp.dump"
data_file="$backup_dir/sam-$stamp.data.sql"

echo "Dumping schema + data -> $dump_file"
pg_dump --format=custom --schema=public --file="$dump_file" "$SAM_DB_URL"

# Deliberately not `supabase db dump`: that wrapper runs pg_dump inside a Docker
# container to pin the server version, so it fails outright when Docker is not
# installed. Plain pg_dump needs nothing beyond postgresql-client.
echo "Dumping data only     -> $data_file"
pg_dump --data-only --column-inserts --schema=public --file="$data_file" "$SAM_DB_URL"

# A dump of an unreachable or empty database is the failure worth catching here,
# so confirm the archive actually lists the planner tables before declaring
# success.
echo
echo "Verifying $dump_file:"
tables="$(pg_restore --list "$dump_file" | grep -c 'TABLE DATA' || true)"
pg_restore --list "$dump_file" | grep 'TABLE DATA' | sed 's/.*TABLE DATA/  /' || true

if [[ "$tables" -eq 0 ]]; then
  echo "error: the dump contains no table data — check SAM_DB_URL." >&2
  exit 1
fi

echo
echo "OK: $tables table(s) captured."
ls -lh "$dump_file" "$data_file"
