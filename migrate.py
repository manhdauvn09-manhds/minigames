"""
migrate.py — Run from PowerShell to create/update MySQL tables.

Usage:
  python migrate.py                          # reads DATABASE_URL from .env
  python migrate.py "mysql://user:pass@host:3306/db"  # explicit URL

Requires: pymysql (already installed)
"""
import sys, os, re

try:
    import pymysql
except ImportError:
    print("ERROR: pymysql not installed. Run:  pip install pymysql")
    sys.exit(1)


def load_env(path):
    """Parse .env file into dict (simple key=value, ignores comments)."""
    env = {}
    if not os.path.exists(path):
        return env
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)", line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return env


def parse_mysql_url(url):
    """Parse mysql://user:pass@host:port/db into connection kwargs."""
    m = re.match(
        r"mysql(?:\+pymysql)?://([^:]+):([^@]*)@([^:/]+)(?::(\d+))?/(.+)", url
    )
    if not m:
        print(f"ERROR: Cannot parse DATABASE_URL: {url[:40]}...")
        sys.exit(1)
    from urllib.parse import unquote
    return dict(
        host=m.group(3),
        port=int(m.group(4) or 3306),
        user=unquote(m.group(1)),
        password=unquote(m.group(2)),
        database=m.group(5).split("?")[0],
    )


MIGRATIONS = [
    # ── Site-wide visitor sessions ──
    """
    CREATE TABLE IF NOT EXISTS visitor_sessions (
      session_id   VARCHAR(36)      NOT NULL PRIMARY KEY,
      last_active  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_last_active (last_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # ── Site-wide counters ──
    """
    CREATE TABLE IF NOT EXISTS site_counters (
      counter_key   VARCHAR(32)      NOT NULL PRIMARY KEY,
      counter_value BIGINT UNSIGNED  NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    """
    INSERT IGNORE INTO site_counters (counter_key, counter_value)
    VALUES ('total_visitors', 0), ('total_pageviews', 0)
    """,

    # ── Per-game visitor sessions ──
    """
    CREATE TABLE IF NOT EXISTS game_visitor_sessions (
      session_id   VARCHAR(36)      NOT NULL,
      game_id      VARCHAR(32)      NOT NULL,
      last_active  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, game_id),
      INDEX idx_game_active (game_id, last_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # ── Per-game counters ──
    """
    CREATE TABLE IF NOT EXISTS game_counters (
      game_id       VARCHAR(32)      NOT NULL,
      counter_key   VARCHAR(32)      NOT NULL,
      counter_value BIGINT UNSIGNED  NOT NULL DEFAULT 0,
      PRIMARY KEY (game_id, counter_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
]


def main():
    # Get DATABASE_URL
    if len(sys.argv) > 1:
        db_url = sys.argv[1]
    else:
        env = load_env(os.path.join(os.path.dirname(__file__), ".env"))
        db_url = env.get("DATABASE_URL", "")

    if not db_url:
        print("ERROR: No DATABASE_URL found.")
        print("Usage:  python migrate.py")
        print('   or:  python migrate.py "mysql://user:pass@host:3306/db"')
        sys.exit(1)

    kwargs = parse_mysql_url(db_url)
    ssl_env = load_env(os.path.join(os.path.dirname(__file__), ".env")).get("MYSQL_SSL", "false")
    if ssl_env.lower() == "true":
        kwargs["ssl"] = {"ssl": True}

    print(f"Connecting to {kwargs['host']}:{kwargs['port']}/{kwargs['database']} ...")

    conn = pymysql.connect(**kwargs, connect_timeout=10, autocommit=True)
    cursor = conn.cursor()

    ok = 0
    for i, sql in enumerate(MIGRATIONS, 1):
        try:
            cursor.execute(sql.strip())
            affected = cursor.rowcount
            label = sql.strip().split("\n")[0].strip()[:60]
            print(f"  [{i}/{len(MIGRATIONS)}] OK  ({affected} rows)  {label}")
            ok += 1
        except Exception as e:
            print(f"  [{i}/{len(MIGRATIONS)}] FAIL  {e}")

    cursor.close()
    conn.close()

    print(f"\nDone: {ok}/{len(MIGRATIONS)} migrations succeeded.")
    if ok == len(MIGRATIONS):
        print("All tables ready!")
    else:
        print("Some migrations failed — check errors above.")


if __name__ == "__main__":
    main()
