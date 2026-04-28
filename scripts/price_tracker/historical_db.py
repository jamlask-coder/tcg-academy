"""
Histórico de precios — DuckDB local + sync a Supabase.

DuckDB embebido: queries analíticas (avg 7d, max 30d, drop %) en milisegundos
sobre miles de snapshots sin necesidad de servidor. Cuando madure, lo mismo
se replica en la tabla Supabase `price_history`.

Esquema:
    snapshots(card_id TEXT, source TEXT, price_eur DOUBLE, currency TEXT,
              snapshot_ts TIMESTAMP, raw JSON)

Uso:
    db = HistoricalDB("data/price_history.duckdb")
    db.insert(card_id="sv1-25", source="cardmarket", price_eur=12.5)
    df = db.history(card_id="sv1-25", days=90)  # polars DataFrame
    df = db.top_movers(days=7, limit=20)
"""
from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
import duckdb
import polars as pl


class HistoricalDB:
    def __init__(self, path: str = "data/price_history.duckdb") -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.conn = duckdb.connect(path)
        self._init_schema()

    def _init_schema(self) -> None:
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS snapshots (
                card_id      TEXT NOT NULL,
                source       TEXT NOT NULL,
                price_eur    DOUBLE,
                currency     TEXT DEFAULT 'EUR',
                snapshot_ts  TIMESTAMP NOT NULL,
                raw          JSON,
                PRIMARY KEY (card_id, source, snapshot_ts)
            );
            CREATE INDEX IF NOT EXISTS idx_snap_card ON snapshots(card_id);
            CREATE INDEX IF NOT EXISTS idx_snap_ts ON snapshots(snapshot_ts);
            """
        )

    def insert(
        self,
        card_id: str,
        source: str,
        price_eur: float | None,
        currency: str = "EUR",
        snapshot_ts: datetime | None = None,
        raw: dict | None = None,
    ) -> None:
        ts = snapshot_ts or datetime.now(timezone.utc)
        self.conn.execute(
            """
            INSERT OR REPLACE INTO snapshots
                (card_id, source, price_eur, currency, snapshot_ts, raw)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [card_id, source, price_eur, currency, ts, raw],
        )

    def history(self, card_id: str, days: int = 90) -> pl.DataFrame:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        rows = self.conn.execute(
            """
            SELECT card_id, source, price_eur, snapshot_ts
              FROM snapshots
             WHERE card_id = ? AND snapshot_ts >= ?
             ORDER BY snapshot_ts ASC
            """,
            [card_id, cutoff],
        ).fetchall()
        return pl.DataFrame(
            rows, schema=["card_id", "source", "price_eur", "snapshot_ts"], orient="row"
        )

    def top_movers(self, days: int = 7, limit: int = 20) -> pl.DataFrame:
        """Cartas con mayor variación % en N días."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        rows = self.conn.execute(
            """
            WITH ranked AS (
                SELECT card_id,
                       price_eur,
                       snapshot_ts,
                       FIRST_VALUE(price_eur) OVER w_first AS first_price,
                       LAST_VALUE(price_eur)  OVER w_last  AS last_price
                  FROM snapshots
                 WHERE snapshot_ts >= ?
                   AND source = 'cardmarket'
                WINDOW w_first AS (PARTITION BY card_id ORDER BY snapshot_ts
                                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
                       w_last  AS (PARTITION BY card_id ORDER BY snapshot_ts
                                   ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)
            )
            SELECT card_id,
                   MIN(first_price) AS price_start,
                   MAX(last_price)  AS price_end,
                   ((MAX(last_price) - MIN(first_price)) / MIN(first_price)) * 100 AS pct_change
              FROM ranked
             WHERE first_price IS NOT NULL AND first_price > 0
             GROUP BY card_id
             ORDER BY ABS(pct_change) DESC
             LIMIT ?
            """,
            [cutoff, limit],
        ).fetchall()
        return pl.DataFrame(
            rows, schema=["card_id", "price_start", "price_end", "pct_change"], orient="row"
        )

    def push_to_supabase(self, since_ts: datetime | None = None) -> int:
        """Sube snapshots nuevos a la tabla `price_history` de Supabase."""
        from supabase import create_client

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados")
        client = create_client(url, key)

        cutoff = since_ts or (datetime.now(timezone.utc) - timedelta(days=2))
        rows = self.conn.execute(
            """
            SELECT card_id, snapshot_ts, price_eur
              FROM snapshots
             WHERE snapshot_ts >= ? AND price_eur IS NOT NULL
            """,
            [cutoff],
        ).fetchall()
        if not rows:
            return 0
        payload = [
            {
                "card_id": r[0],
                "date": r[1].date().isoformat(),
                "price_eur": r[2],
            }
            for r in rows
        ]
        # `price_history` tiene PK (card_id, date) → upsert idempotente.
        client.table("price_history").upsert(payload).execute()
        return len(payload)


if __name__ == "__main__":
    db = HistoricalDB()
    db.insert("test-card-001", "cardmarket", 12.50)
    print("OK insert. Snapshots totales:",
          db.conn.execute("SELECT count(*) FROM snapshots").fetchone()[0])
