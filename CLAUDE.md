@AGENTS.md

## Visual Quality Gate

Before marking ANY visual change as complete, run the visual test suite:

```
npm run build && npm run test:visual
```

Tests live in `tests/visual/`. They verify:
- No horizontal overflow at 320px, 768px, 1024px, 1440px
- All navbar logos visible and not clipped
- Mega-menu Y position stays fixed when switching games (no jump)
- All main routes load without console errors
- Cart badge increments correctly
- ProductCard responsive layout

To check only overflow across all routes (fast diagnostic):
```
npm run build && npx serve out -p 3000 -s &
npm run test:overflow
```
