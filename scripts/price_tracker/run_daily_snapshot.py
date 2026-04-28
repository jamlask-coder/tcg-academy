"""
Snapshot diario — barre catálogo TCG Academy y persiste precios competencia.

Pipeline:
  1. Lee productos activos desde Supabase (tabla `products`).
  2. Para cada producto con `external_id`, consulta:
        - Cardmarket (si game ∈ {magic,yugioh,pokemon,lorcana} + credentials)
        - pokemontcg.io (Pokemon EN, fallback)
        - Scryfall (Magic, free)
  3. Persiste en DuckDB local + push a Supabase `price_history`.
  4. Imprime resumen Rich con top movers y errores.

Uso:
    PY=/c/Users/jamla/AppData/Local/Programs/Python/Python312/python.exe
    $PY scripts/price_tracker/run_daily_snapshot.py
    $PY scripts/price_tracker/run_daily_snapshot.py --limit 50  # smoke test
"""
from __future__ import annotations
import argparse
import os
import time
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv(dotenv_path=".env.local")

from cardmarket import CardmarketClient  # noqa: E402
from historical_db import HistoricalDB  # noqa: E402

console = Console()


def fetch_products(limit: Optional[int] = None) -> list[dict]:
    """Lee productos del proyecto desde Supabase."""
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        console.print("[red]SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados.[/red]")
        return []
    client = create_client(url, key)
    q = client.table("products").select("id,name,game,external_id").is_("deleted_at", "null")
    if limit:
        q = q.limit(limit)
    res = q.execute()
    return [r for r in res.data if r.get("external_id")]


def quote_pokemontcg(external_id: str) -> Optional[float]:
    """Trend EUR vía pokemontcg.io (alimentado por Cardmarket)."""
    import requests

    api_key = os.getenv("POKEMON_TCG_API_KEY")
    headers = {"X-Api-Key": api_key} if api_key else {}
    try:
        r = requests.get(
            f"https://api.pokemontcg.io/v2/cards/{external_id}",
            headers=headers,
            timeout=10,
        )
        if r.status_code != 200:
            return None
        cm = r.json().get("data", {}).get("cardmarket", {}).get("prices", {})
        return cm.get("trendPrice")
    except Exception:
        return None


def quote_scryfall(external_id: str) -> Optional[float]:
    """Trend EUR Magic vía Scryfall."""
    try:
        import scrython

        c = scrython.cards.Id(id=external_id)
        eur = c.prices("eur")
        return float(eur) if eur else None
    except Exception:
        return None


def main(limit: Optional[int] = None) -> None:
    console.rule("[bold cyan]TCG Academy — Daily Price Snapshot[/bold cyan]")
    products = fetch_products(limit)
    if not products:
        console.print("[yellow]Sin productos para procesar.[/yellow]")
        return

    cm = CardmarketClient(public_only=True)  # cambiar a False si hay OAuth
    db = HistoricalDB()

    ok, failed = 0, 0
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Card")
    table.add_column("Game")
    table.add_column("Source")
    table.add_column("EUR", justify="right")

    for p in products:
        ext = p["external_id"]
        game = (p.get("game") or "").lower()
        price: Optional[float] = None
        source = "—"

        if game == "pokemon":
            price = quote_pokemontcg(ext)
            source = "pokemontcg.io"
        elif game == "magic":
            price = quote_scryfall(ext)
            source = "scryfall"

        if price is not None:
            db.insert(card_id=ext, source=source, price_eur=price)
            table.add_row(p["name"][:40], game, source, f"{price:.2f}")
            ok += 1
        else:
            failed += 1

        time.sleep(0.05)  # cortesía con APIs públicas

    console.print(table)
    console.print(f"\n[green]OK[/green]: {ok}   [red]FAILED[/red]: {failed}")

    # Push a Supabase si hay credenciales
    if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        n = db.push_to_supabase()
        console.print(f"[cyan]Pushed {n} snapshots → Supabase price_history[/cyan]")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Solo procesar N productos (smoke test)")
    args = parser.parse_args()
    main(limit=args.limit)
