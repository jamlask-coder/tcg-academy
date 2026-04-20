# setHighlights — Top cards por set

Sistema responsable de resolver las cartas más destacadas de cada producto
(booster box, ETB, etc.) para mostrarlas como highlights en la UI.

## Arquitectura

```
product (LocalProduct)
       │
       ▼
  resolveHighlights(product, lang)      ◀── punto de entrada único (index.ts)
       │
       ▼
  adapter por game (Record<string, SetAdapter>)
       │
       ├─► resolveSetId(product)   → ResolveResult | null
       │       · S1 hardcoded-map (regex sobre name/description/tags)
       │       · S2 product-setcode (tag 3-4 letras validado contra API)
       │       · S3 fuzzy-sets-en  (nombre de set en inglés)
       │       · S4 fuzzy-sets-localized (threshold más laxo)
       │
       ▼
  cache hit? (highlightCache) ──► HighlightCard[]
       │
       ▼ miss
  fetchTopCards(setId, lang, product)
       │   · Scryfall (magic)
       │   · pokemontcg.io (pokemon)
       │   · YGOPRODeck (yugioh)
       │   · datos locales curados (one-piece, dragon-ball, digimon, naruto, riftbound)
       │   · noop (topps/panini/cyberpunk → cromos sin cotización)
       │
       ▼
  HighlightsResult { cards, provenance, resolved, strategyTried, errors, tookMs }
```

## Checklist para añadir un juego

1. Crear `adapters/<game>.ts` implementando `SetAdapter`.
2. Si usa API externa, centralizar fetch en `fetcher.ts`.
3. Si usa datos locales, crear `data/<game>TopCards.ts`.
4. Registrar el adapter en `index.ts` → `ADAPTERS[<gameKey>]`.
5. Añadir reglas de matching a `setMaps.ts` si hace falta.
6. Añadir caso a `__tests__/architecture.test.ts` para confirmar `isGameSupported(<gameKey>) === true`.

## Diagnóstico

- **Runtime browser**: `/admin/herramientas/highlights` — escaneo live sobre todo el catálogo.
- **Runtime tests**: `npm run test:unit` — verifica arquitectura (sin red).
- **Telemetría en vivo**: `globalThis.__TCGA_HIGHLIGHTS_LOG__` (últimos resultados).
- **Error log**: cualquier fallo termina en `/admin/errores` vía `errorReporter`.

## Principios

- **No romper la UI**: si un adapter falla, devolver `[]`, nunca lanzar.
- **Observabilidad obligatoria**: todo resultado se registra en telemetría.
- **Determinismo offline**: hardcoded-maps deben funcionar sin red (tests los validan).
- **Cache siempre**: `highlightCache` evita refetch dentro de la sesión.
