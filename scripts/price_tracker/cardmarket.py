"""
Cardmarket adapter — wrapper sobre mkmsdk con fallback a scraping público.

Uso:
    from cardmarket import CardmarketClient
    cm = CardmarketClient()
    # Buscar producto por nombre:
    hits = cm.find_products("Charizard ex SVP")
    # Detalle precio (trend / low / avg30):
    detail = cm.product_price(hits[0]["idProduct"])

Fallback sin credenciales:
    cm = CardmarketClient(public_only=True)
    hits = cm.scrape_search("Charizard ex SVP")  # parsea HTML público
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

GAME_IDS = {"magic": 1, "yugioh": 6, "pokemon": 8, "lorcana": 14}


@dataclass
class PriceQuote:
    product_id: int
    name: str
    expansion: str
    rarity: str
    trend_eur: Optional[float]
    avg30_eur: Optional[float]
    low_eur: Optional[float]
    available_items: int
    url: str


class CardmarketClient:
    def __init__(self, public_only: bool = False) -> None:
        self.public_only = public_only or not self._has_credentials()
        if not self.public_only:
            from mkmsdk.mkm import Mkm
            from mkmsdk.api_map import _API_MAP

            os.environ.setdefault("MKM_APP_TOKEN", os.environ["CARDMARKET_APP_TOKEN"])
            os.environ.setdefault("MKM_APP_SECRET", os.environ["CARDMARKET_APP_SECRET"])
            os.environ.setdefault("MKM_ACCESS_TOKEN", os.environ["CARDMARKET_ACCESS_TOKEN"])
            os.environ.setdefault(
                "MKM_ACCESS_TOKEN_SECRET",
                os.environ["CARDMARKET_ACCESS_TOKEN_SECRET"],
            )
            self.mkm = Mkm(_API_MAP["2.0"]["api"], _API_MAP["2.0"]["api_root"])

    @staticmethod
    def _has_credentials() -> bool:
        keys = [
            "CARDMARKET_APP_TOKEN",
            "CARDMARKET_APP_SECRET",
            "CARDMARKET_ACCESS_TOKEN",
            "CARDMARKET_ACCESS_TOKEN_SECRET",
        ]
        return all(os.getenv(k) for k in keys)

    # ── API oficial ──────────────────────────────────────────────────────────
    def find_products(self, query: str, game: str = "pokemon") -> list[dict]:
        """Búsqueda exacta por nombre. Devuelve lista cruda de productos MKM."""
        if self.public_only:
            return self.scrape_search(query, game)
        game_id = GAME_IDS.get(game.lower(), 8)
        resp = self.mkm.market_place.find_product(query, game=game_id)
        if resp.status_code != 200:
            return []
        return resp.json().get("product", [])

    def product_price(self, product_id: int) -> Optional[PriceQuote]:
        """Detalle con priceGuide (trend/avg/low)."""
        if self.public_only:
            return None
        resp = self.mkm.market_place.product(product_id)
        if resp.status_code != 200:
            return None
        prod = resp.json().get("product", {})
        guide = prod.get("priceGuide", {})
        return PriceQuote(
            product_id=prod.get("idProduct", 0),
            name=prod.get("enName", ""),
            expansion=prod.get("expansionName", ""),
            rarity=prod.get("rarity", ""),
            trend_eur=guide.get("TREND"),
            avg30_eur=guide.get("AVG30"),
            low_eur=guide.get("LOW"),
            available_items=prod.get("countArticles", 0),
            url=f"https://www.cardmarket.com{prod.get('website', '')}",
        )

    # ── Fallback público (sin OAuth) ─────────────────────────────────────────
    def scrape_search(self, query: str, game: str = "pokemon") -> list[dict]:
        """
        Scraping de la búsqueda pública. Devuelve estructura compatible con
        find_products() pero más limitada (sin priceGuide oficial).
        Usa scrapling con stealth para sortear protección anti-bot.
        """
        from scrapling.fetchers import StealthyFetcher

        slug = {"pokemon": "Pokemon", "magic": "Magic", "yugioh": "YuGiOh", "lorcana": "Lorcana"}.get(
            game.lower(), "Pokemon"
        )
        url = f"https://www.cardmarket.com/en/{slug}/Products/Search?searchString={query}"
        page = StealthyFetcher.fetch(url, headless=True)
        if page.status != 200:
            return []
        rows = page.css("div.table-body > div.row")[:10]
        out: list[dict] = []
        for r in rows:
            name_el = r.css_first("a")
            price_el = r.css_first("div.color-primary")
            if not name_el:
                continue
            href = name_el.attrib.get("href", "")
            price_text = price_el.text.clean() if price_el else None
            out.append(
                {
                    "enName": name_el.text.clean(),
                    "website": href,
                    "fromPriceText": price_text,
                }
            )
        return out


if __name__ == "__main__":
    # Smoke test rápido — pruebas sin escribir nada.
    cm = CardmarketClient(public_only=True)
    print("Cardmarket — modo:", "PUBLIC (scraping)" if cm.public_only else "OAUTH")
    hits = cm.scrape_search("Charizard ex 199 Obsidian Flames")
    for h in hits[:3]:
        print(" -", h.get("enName"), "→", h.get("fromPriceText"))
