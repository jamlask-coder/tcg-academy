# Price Tracker — TCG Academy

Stack Python para tracking profesional de precios competencia y Cardmarket.
Diseñado para correr en local (cron) y empujar snapshots a Supabase, donde la web los lee.

## Stack instalado

| Paquete | Para qué |
|---|---|
| `scrapling[fetchers]` | Scraping con anti-bot (curl_cffi + patchright stealth) |
| `mkmsdk` | API oficial Cardmarket OAuth1.0a — precios trend, sells, articles |
| `scrython` | API Scryfall — histórico Magic free |
| `pokemontcgsdk` | API pokemontcg.io — precios Cardmarket de Pokemon EN |
| `duckdb` | BD analítica embebida — queries rápidas histórico precios |
| `polars` | DataFrames 5-30× más rápidos que pandas |
| `pandas` | Compat con scripts viejos / exports Excel |
| `apscheduler` | Cron en proceso (24/7 si se despliega como service) |
| `imagehash` | pHash/dHash para match de cartas vía imagen |
| `pdfplumber` | Leer facturas proveedor en PDF para auto-import |
| `supabase` | Push snapshots a BD prod desde el script |

## Comandos rápidos

```bash
# Activar Python 3.12 instalado por winget:
PY="/c/Users/jamla/AppData/Local/Programs/Python/Python312/python.exe"

# Snapshot diario competencia (Cardmarket + 4 tiendas):
$PY scripts/price_tracker/run_daily_snapshot.py

# Histórico de una carta concreta:
$PY scripts/price_tracker/query_history.py --card "Charizard ex" --days 90

# Análisis comparativa:
$PY scripts/price_tracker/analyze_competitors.py --export reports/competition.xlsx
```

## Variables de entorno

`.env.local` (raíz del proyecto):
```
CARDMARKET_APP_TOKEN=...
CARDMARKET_APP_SECRET=...
CARDMARKET_ACCESS_TOKEN=...
CARDMARKET_ACCESS_TOKEN_SECRET=...
CARDMARKET_GAME=1   # 1=Magic, 6=YGO, 8=Pokemon, 14=Lorcana
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
POKEMON_TCG_API_KEY=...   # opcional (rate limit)
```

## Cómo conseguir credenciales Cardmarket

1. Cuenta merchant en cardmarket.com (gratis para nivel 1).
2. Settings → API → Create new App. Te dan `appToken` + `appSecret`.
3. Authorize → te dan `accessToken` + `accessTokenSecret`.
4. Doc oficial: https://api.cardmarket.com/ws/documentation

Sin credenciales, los scripts usan fallback a pokemontcg.io (sólo Pokemon EN) +
scraping HTML público vía scrapling.
