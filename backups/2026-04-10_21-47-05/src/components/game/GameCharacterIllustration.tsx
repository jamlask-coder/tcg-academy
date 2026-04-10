/**
 * Per-game character illustration shown on the right side of the hero section.
 * Each game gets a distinct SVG composition using its brand colors.
 * All illustrations are abstract / silhouette-based — no licensed artwork.
 */

interface Props {
  game: string;
  color: string;
}

export function GameCharacterIllustration({ game, color }: Props) {
  const c = color;

  switch (game) {
    // ─── Pokémon ──────────────────────────────────────────────────────────────
    case "pokemon":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <style>{`
            @keyframes pk-pulse{0%,100%{opacity:.5}50%{opacity:.95}}
            @keyframes pk-btn{0%,100%{opacity:0}45%,55%{opacity:.55}}
            @keyframes pk-spa{0%,100%{opacity:0}25%,45%{opacity:1}}
            @keyframes pk-spb{0%,100%{opacity:0}60%,80%{opacity:1}}
            @keyframes pk-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
            #pk-gg{animation:pk-pulse 3s ease-in-out infinite}
            #pk-bg{animation:pk-btn 3s ease-in-out infinite}
            #pk-sa{animation:pk-spa 3.5s ease-in-out infinite}
            #pk-sb{animation:pk-spb 3.5s ease-in-out infinite 1.75s}
            #pk-ball{animation:pk-float 3.8s ease-in-out infinite}
          `}</style>

          <defs>
            <radialGradient id="pk-gog" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.5" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
            <radialGradient
              id="pk-rg"
              cx="105"
              cy="118"
              r="130"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FF5555" />
              <stop offset="55%" stopColor="#CC1111" />
              <stop offset="100%" stopColor="#880000" />
            </radialGradient>
            <radialGradient
              id="pk-wg"
              cx="110"
              cy="155"
              r="140"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#C0C0C0" />
            </radialGradient>
            <radialGradient id="pk-btng" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.85" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient glow */}
          <circle id="pk-gg" cx="140" cy="172" r="130" fill="url(#pk-gog)" />

          {/* Shadow — stays fixed while ball floats */}
          <ellipse
            cx="140"
            cy="290"
            rx="72"
            ry="11"
            fill="black"
            fillOpacity="0.16"
          />

          {/* Floating ball */}
          <g id="pk-ball">
            {/* Bottom half — white/gray */}
            <path d="M 32 172 A 108 108 0 0 1 248 172 Z" fill="url(#pk-wg)" />
            {/* Top half — red */}
            <path d="M 32 172 A 108 108 0 0 0 248 172 Z" fill="url(#pk-rg)" />
            {/* Gloss sheen on red */}
            <ellipse
              cx="106"
              cy="116"
              rx="44"
              ry="25"
              fill="white"
              fillOpacity="0.22"
              transform="rotate(-28 106 116)"
            />
            {/* Outer ring */}
            <circle cx="140" cy="172" r="108" stroke="#1a1a1a" strokeWidth="5" />
            {/* Divider line */}
            <line
              x1="32"
              y1="172"
              x2="248"
              y2="172"
              stroke="#1a1a1a"
              strokeWidth="7"
            />
            {/* Button outer (black) */}
            <circle cx="140" cy="172" r="32" fill="#1a1a1a" />
            {/* Button white */}
            <circle cx="140" cy="172" r="22" fill="white" />
            {/* Button animated glow */}
            <circle id="pk-bg" cx="140" cy="172" r="22" fill="url(#pk-btng)" />
            {/* Button highlight */}
            <ellipse
              cx="132"
              cy="165"
              rx="8"
              ry="5"
              fill="white"
              fillOpacity="0.65"
            />
            {/* Button center dot */}
            <circle
              cx="140"
              cy="172"
              r="7"
              fill="#e0e0e0"
              stroke="#aaaaaa"
              strokeWidth="1.5"
            />
          </g>

          {/* Spark group A */}
          <g id="pk-sa">
            <path
              d="M30 108 L24 124 L34 124 L26 142"
              stroke={c}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M252 215 L258 199 L248 199 L256 181"
              stroke={c}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="58" cy="70" r="3.5" fill={c} fillOpacity="0.8" />
            <circle cx="224" cy="268" r="2.5" fill={c} fillOpacity="0.7" />
          </g>

          {/* Spark group B */}
          <g id="pk-sb">
            <path
              d="M244 100 L250 116 L240 116 L248 134"
              stroke={c}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M34 232 L28 216 L38 216 L30 198"
              stroke={c}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="220" cy="66" r="3" fill={c} fillOpacity="0.75" />
            <circle cx="52" cy="274" r="2.5" fill={c} fillOpacity="0.65" />
          </g>

          {/* Corner accent dots */}
          {(
            [
              [265, 158, 3],
              [16, 184, 2.5],
              [140, 38, 2.8],
              [140, 302, 2.5],
            ] as [number, number, number][]
          ).map(([x, y, r], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill={c}
              fillOpacity={0.45 - i * 0.06}
            />
          ))}
        </svg>
      );

    // ─── Magic: The Gathering ─────────────────────────────────────────────────
    case "magic":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="mg-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="160" r="130" fill="url(#mg-glow)" />
          {/* Planeswalker symbol — stylized pentagon */}
          <polygon
            points="140,40 225,105 194,205 86,205 55,105"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.5"
            fill={c}
            fillOpacity="0.06"
          />
          <polygon
            points="140,62 208,118 183,196 97,196 72,118"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.25"
            fill="none"
          />
          {/* Center orb */}
          <circle
            cx="140"
            cy="145"
            r="28"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.6"
            fill={c}
            fillOpacity="0.12"
          />
          <circle cx="140" cy="145" r="14" fill={c} fillOpacity="0.35" />
          {/* Mana crystals — 5 color dots */}
          {[
            [140, 80, "#f59e0b"],
            [198, 118, "#3b82f6"],
            [176, 188, "#1d1d1d"],
            [104, 188, "#16a34a"],
            [82, 118, "#dc2626"],
          ].map(([x, y, fill], i) => (
            <circle
              key={i}
              cx={x as number}
              cy={y as number}
              r="9"
              fill={fill as string}
              fillOpacity="0.5"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          ))}
          {/* Sparkle particles */}
          {[
            [38, 80],
            [248, 80],
            [260, 220],
            [20, 240],
            [140, 290],
            [200, 30],
          ].map(([x, y], i) => (
            <g key={i} opacity={0.5 - i * 0.05}>
              <line
                x1={x - 8}
                y1={y}
                x2={x + 8}
                y2={y}
                stroke={c}
                strokeWidth="1.5"
              />
              <line
                x1={x}
                y1={y - 8}
                x2={x}
                y2={y + 8}
                stroke={c}
                strokeWidth="1.5"
              />
              <line
                x1={x - 5}
                y1={y - 5}
                x2={x + 5}
                y2={y + 5}
                stroke={c}
                strokeWidth="1"
                strokeOpacity="0.5"
              />
              <line
                x1={x + 5}
                y1={y - 5}
                x2={x - 5}
                y2={y + 5}
                stroke={c}
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            </g>
          ))}
          {/* Staff silhouette */}
          <line
            x1="68"
            y1="290"
            x2="110"
            y2="80"
            stroke={c}
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.3"
          />
          <circle cx="110" cy="80" r="8" fill={c} fillOpacity="0.4" />
          <circle cx="110" cy="80" r="4" fill={c} fillOpacity="0.7" />
        </svg>
      );

    // ─── Yu-Gi-Oh! ────────────────────────────────────────────────────────────
    case "yugioh":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="yg-glow" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.4" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="145" r="130" fill="url(#yg-glow)" />
          {/* Pyramid */}
          <path
            d="M140 60 L248 258 L32 258 Z"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.45"
            fill={c}
            fillOpacity="0.06"
          />
          <path
            d="M140 82 L228 252 L52 252 Z"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.2"
            fill="none"
          />
          {/* Horizontal layers */}
          <line
            x1="80"
            y1="180"
            x2="200"
            y2="180"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          <line
            x1="100"
            y1="220"
            x2="180"
            y2="220"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.15"
          />
          {/* Millennium Eye */}
          <ellipse
            cx="140"
            cy="150"
            rx="32"
            ry="20"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.65"
            fill={c}
            fillOpacity="0.1"
          />
          <circle cx="140" cy="150" r="10" fill={c} fillOpacity="0.5" />
          <circle cx="140" cy="150" r="5" fill={c} fillOpacity="0.85" />
          {/* Eye rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 140 + Math.cos(rad) * 14;
            const y1 = 150 + Math.sin(rad) * 14;
            const x2 = 140 + Math.cos(rad) * (26 + (i % 2 === 0 ? 18 : 10));
            const y2 = 150 + Math.sin(rad) * (26 + (i % 2 === 0 ? 18 : 10));
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={c}
                strokeWidth={i % 2 === 0 ? "2" : "1.2"}
                strokeOpacity={i % 2 === 0 ? "0.6" : "0.35"}
              />
            );
          })}
          {/* Scarab/ankh detail */}
          <circle
            cx="140"
            cy="28"
            r="10"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.45"
            fill="none"
          />
          <line
            x1="140"
            y1="38"
            x2="140"
            y2="58"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.4"
          />
          <line
            x1="126"
            y1="48"
            x2="154"
            y2="48"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.4"
          />
          {/* Sand dots */}
          {[
            [40, 260],
            [80, 278],
            [120, 268],
            [160, 278],
            [200, 268],
            [240, 260],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill={c} fillOpacity="0.3" />
          ))}
        </svg>
      );

    // ─── One Piece ────────────────────────────────────────────────────────────
    case "one-piece":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="op-glow" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.3" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="140" cy="150" rx="130" ry="120" fill="url(#op-glow)" />
          {/* Straw hat brim */}
          <ellipse
            cx="140"
            cy="110"
            rx="105"
            ry="22"
            stroke={c}
            strokeWidth="3"
            strokeOpacity="0.5"
            fill={c}
            fillOpacity="0.1"
          />
          {/* Hat dome */}
          <path
            d="M60 108 Q90 48 140 42 Q190 48 220 108"
            stroke={c}
            strokeWidth="3"
            strokeOpacity="0.55"
            fill={c}
            fillOpacity="0.1"
          />
          {/* Hat band */}
          <ellipse
            cx="140"
            cy="102"
            rx="80"
            ry="8"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.35"
            fill="none"
          />
          {/* Skull */}
          <circle
            cx="140"
            cy="178"
            r="28"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.5"
            fill={c}
            fillOpacity="0.08"
          />
          {/* Eyes */}
          <circle cx="130" cy="174" r="7" fill={c} fillOpacity="0.5" />
          <circle cx="150" cy="174" r="7" fill={c} fillOpacity="0.5" />
          {/* Teeth */}
          <path
            d="M126 190 L130 196 L136 190 L140 196 L146 190 L152 196 L154 190"
            stroke={c}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.5"
            fill="none"
          />
          {/* Crossed bones */}
          <line
            x1="110"
            y1="212"
            x2="170"
            y2="245"
            stroke={c}
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />
          <line
            x1="170"
            y1="212"
            x2="110"
            y2="245"
            stroke={c}
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />
          {/* Ocean waves */}
          <path
            d="M20 270 Q50 258 80 270 Q110 282 140 270 Q170 258 200 270 Q230 282 260 270"
            stroke={c}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
            fill="none"
          />
          <path
            d="M20 288 Q50 276 80 288 Q110 300 140 288 Q170 276 200 288 Q230 300 260 288"
            stroke={c}
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.3"
            fill="none"
          />
          <path
            d="M20 305 Q55 294 90 305 Q125 316 160 305 Q195 294 230 305 Q248 310 260 305"
            stroke={c}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.2"
            fill="none"
          />
          {/* Stars */}
          {[
            [30, 50],
            [250, 40],
            [260, 170],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={c}
              fillOpacity={0.5 - i * 0.1}
            />
          ))}
        </svg>
      );

    // ─── Riftbound (League of Legends TCG) ────────────────────────────────────
    case "riftbound":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="rb-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="160" r="125" fill="url(#rb-glow)" />
          {/* Hexagonal grid */}
          {[
            [140, 80],
            [200, 115],
            [200, 185],
            [140, 220],
            [80, 185],
            [80, 115],
            [140, 150],
          ].map(([cx, cy], i) => {
            const r = i === 6 ? 40 : 34;
            const pts = Array.from({ length: 6 }, (_, k) => {
              const a = (Math.PI / 3) * k - Math.PI / 6;
              return `${(cx as number) + r * Math.cos(a)},${(cy as number) + r * Math.sin(a)}`;
            }).join(" ");
            return (
              <polygon
                key={i}
                points={pts}
                stroke={c}
                strokeWidth={i === 6 ? "2.5" : "1.5"}
                strokeOpacity={i === 6 ? "0.7" : "0.35"}
                fill={i === 6 ? c : "none"}
                fillOpacity={i === 6 ? "0.15" : "0"}
              />
            );
          })}
          {/* Central crystal */}
          <polygon
            points="140,118 158,148 140,178 122,148"
            fill={c}
            fillOpacity="0.4"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.8"
          />
          <line
            x1="140"
            y1="118"
            x2="140"
            y2="178"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
          />
          <line
            x1="122"
            y1="148"
            x2="158"
            y2="148"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
          />
          {/* Energy lines */}
          {[
            [0, 300],
            [120, 300],
            [240, 300],
          ].map(([x, _], i) => (
            <line
              key={i}
              x1={140}
              y1={148}
              x2={x + 70}
              y2={300}
              stroke={c}
              strokeWidth="1.5"
              strokeOpacity={0.25 - i * 0.04}
              strokeDasharray="4 6"
            />
          ))}
          {/* Corner hexagons */}
          {[
            [28, 28],
            [252, 28],
            [28, 285],
            [252, 285],
          ].map(([cx, cy], i) => {
            const pts = Array.from({ length: 6 }, (_, k) => {
              const a = (Math.PI / 3) * k - Math.PI / 6;
              return `${(cx as number) + 14 * Math.cos(a)},${(cy as number) + 14 * Math.sin(a)}`;
            }).join(" ");
            return (
              <polygon
                key={i}
                points={pts}
                stroke={c}
                strokeWidth="1"
                strokeOpacity="0.25"
                fill="none"
              />
            );
          })}
        </svg>
      );

    // ─── Disney Lorcana ───────────────────────────────────────────────────────
    case "lorcana":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="lo-glow" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor={c} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="140" r="125" fill="url(#lo-glow)" />
          {/* Ink drop / magic droplet */}
          <path
            d="M140 30 C170 60 195 100 195 138 C195 170 170 196 140 196 C110 196 85 170 85 138 C85 100 110 60 140 30Z"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.55"
            fill={c}
            fillOpacity="0.1"
          />
          <path
            d="M140 52 C162 76 180 108 180 138 C180 162 162 182 140 182 C118 182 100 162 100 138 C100 108 118 76 140 52Z"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.25"
            fill="none"
          />
          {/* Inner shine */}
          <ellipse
            cx="122"
            cy="100"
            rx="12"
            ry="18"
            fill="rgba(255,255,255,0.18)"
            transform="rotate(-20 122 100)"
          />
          {/* Castle silhouette */}
          <rect
            x="112"
            y="235"
            width="56"
            height="55"
            fill={c}
            fillOpacity="0.15"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <rect
            x="108"
            y="225"
            width="14"
            height="20"
            fill={c}
            fillOpacity="0.2"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <rect
            x="158"
            y="225"
            width="14"
            height="20"
            fill={c}
            fillOpacity="0.2"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <path d="M140 210 L150 225 L130 225 Z" fill={c} fillOpacity="0.3" />
          {/* Disney 4-pointed stars */}
          {[
            [38, 55],
            [242, 75],
            [256, 210],
            [22, 220],
            [60, 285],
            [220, 290],
            [140, 308],
          ].map(([x, y], i) => {
            const s = 6 - i * 0.4;
            return (
              <g key={i} opacity={0.55 - i * 0.05}>
                <line
                  x1={x - s}
                  y1={y}
                  x2={x + s}
                  y2={y}
                  stroke={c}
                  strokeWidth="2"
                />
                <line
                  x1={x}
                  y1={y - s}
                  x2={x}
                  y2={y + s}
                  stroke={c}
                  strokeWidth="2"
                />
                <line
                  x1={x - s * 0.6}
                  y1={y - s * 0.6}
                  x2={x + s * 0.6}
                  y2={y + s * 0.6}
                  stroke={c}
                  strokeWidth="1.2"
                />
                <line
                  x1={x + s * 0.6}
                  y1={y - s * 0.6}
                  x2={x - s * 0.6}
                  y2={y + s * 0.6}
                  stroke={c}
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </svg>
      );

    // ─── Dragon Ball Super CG ─────────────────────────────────────────────────
    case "dragon-ball":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="db-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.5" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="160" r="130" fill="url(#db-glow)" />
          {/* Dragon Ball orb */}
          <circle
            cx="140"
            cy="150"
            r="85"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.5"
            fill={c}
            fillOpacity="0.08"
          />
          <circle
            cx="140"
            cy="150"
            r="70"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.2"
            fill="none"
          />
          {/* Shine */}
          <ellipse
            cx="115"
            cy="118"
            rx="22"
            ry="14"
            fill="rgba(255,255,255,0.18)"
            transform="rotate(-30 115 118)"
          />
          {/* 4-star pattern */}
          {[
            [140, 150],
            [118, 132],
            [162, 132],
            [140, 172],
            [118, 172],
            [162, 172],
            [140, 130],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 0 ? 5.5 : 4}
              fill={c}
              fillOpacity={i === 0 ? "0.8" : "0.55"}
            />
          ))}
          {/* Aura energy rays — 12 rays */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const r1 = 88;
            const r2 = 108 + (i % 3 === 0 ? 22 : 10);
            return (
              <line
                key={i}
                x1={140 + r1 * Math.cos(angle)}
                y1={150 + r1 * Math.sin(angle)}
                x2={140 + r2 * Math.cos(angle)}
                y2={150 + r2 * Math.sin(angle)}
                stroke={c}
                strokeWidth={i % 3 === 0 ? "2.5" : "1.5"}
                strokeOpacity={i % 3 === 0 ? "0.65" : "0.35"}
                strokeLinecap="round"
              />
            );
          })}
          {/* Ground shadow / speed lines */}
          {[
            [-60, 280],
            [-30, 290],
            [0, 295],
            [30, 290],
            [60, 280],
          ].map(([ox, oy], i) => (
            <line
              key={i}
              x1={140 + (ox as number) - 20}
              y1={oy as number}
              x2={140 + (ox as number) + 20}
              y2={oy as number}
              stroke={c}
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity={0.25 - i * 0.02}
            />
          ))}
        </svg>
      );

    // ─── Naruto Mythos ────────────────────────────────────────────────────────
    case "naruto":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="nr-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="160" r="125" fill="url(#nr-glow)" />
          {/* Leaf village symbol — spiral */}
          <circle
            cx="140"
            cy="148"
            r="72"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.45"
            fill="none"
          />
          <circle
            cx="140"
            cy="148"
            r="58"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.2"
            fill="none"
          />
          {/* Spiral chakra */}
          <path
            d="M140 148 Q158 130 172 148 Q186 166 168 180 Q150 194 132 182 Q114 170 120 152 Q126 134 144 128 Q162 122 174 136 Q186 150 180 166"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.6"
            fill="none"
            strokeLinecap="round"
          />
          {/* Kunai weapons */}
          {[
            [60, 60, -45],
            [220, 60, 45],
            [60, 260, 45],
            [220, 260, -45],
          ].map(([x, y, rot], i) => (
            <g
              key={i}
              transform={`translate(${x},${y}) rotate(${rot})`}
              opacity={0.45 - i * 0.03}
            >
              <path d="M0-20 L4-5 L0 20 L-4-5 Z" fill={c} fillOpacity="0.6" />
              <rect
                x="-1.5"
                y="20"
                width="3"
                height="10"
                fill={c}
                fillOpacity="0.5"
                rx="1"
              />
            </g>
          ))}
          {/* Fire/chakra flames */}
          <path
            d="M110 232 Q120 210 130 228 Q140 210 150 228 Q160 210 170 232"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M120 248 Q130 230 140 248 Q150 230 160 248"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.35"
            fill="none"
            strokeLinecap="round"
          />
          {/* Small stars */}
          {[
            [30, 140],
            [250, 140],
            [140, 30],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill={c}
              fillOpacity={0.5 - i * 0.1}
            />
          ))}
        </svg>
      );

    // ─── Topps ────────────────────────────────────────────────────────────────
    case "topps":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="tp-glow" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.3" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="145" r="130" fill="url(#tp-glow)" />
          {/* Trophy cup */}
          <path
            d="M100 80 L180 80 L168 148 Q160 168 140 172 Q120 168 112 148 Z"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.55"
            fill={c}
            fillOpacity="0.1"
          />
          <rect
            x="128"
            y="172"
            width="24"
            height="36"
            fill={c}
            fillOpacity="0.15"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.45"
          />
          <rect
            x="110"
            y="208"
            width="60"
            height="10"
            rx="4"
            fill={c}
            fillOpacity="0.25"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.5"
          />
          {/* Handles */}
          <path
            d="M100 88 Q72 100 76 124 Q80 138 100 130"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.4"
            fill="none"
          />
          <path
            d="M180 88 Q208 100 204 124 Q200 138 180 130"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.4"
            fill="none"
          />
          {/* Football */}
          <ellipse
            cx="140"
            cy="262"
            rx="32"
            ry="22"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.5"
            fill={c}
            fillOpacity="0.1"
          />
          <line
            x1="140"
            y1="240"
            x2="140"
            y2="284"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <path
            d="M124 255 Q132 252 140 255 Q148 258 156 255"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.35"
            fill="none"
          />
          <path
            d="M124 268 Q132 265 140 268 Q148 271 156 268"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.3"
            fill="none"
          />
          {/* Stars */}
          {[
            [38, 30],
            [242, 30],
            [22, 190],
            [258, 195],
            [60, 298],
            [220, 298],
          ].map(([x, y], i) => {
            const s = 7 - i * 0.5;
            return (
              <polygon
                key={i}
                points={`${x},${y - s} ${x + s * 0.4},${y - s * 0.3} ${x + s},${y - s * 0.3} ${x + s * 0.6},${y + s * 0.2} ${x + s * 0.7},${y + s} ${x},${y + s * 0.6} ${x - s * 0.7},${y + s} ${x - s * 0.6},${y + s * 0.2} ${x - s},${y - s * 0.3} ${x - s * 0.4},${y - s * 0.3}`}
                fill={c}
                fillOpacity={0.5 - i * 0.05}
              />
            );
          })}
        </svg>
      );

    // ─── Panini ───────────────────────────────────────────────────────────────
    case "panini":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="pn-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="160" r="125" fill="url(#pn-glow)" />
          {/* Soccer ball */}
          <circle
            cx="140"
            cy="150"
            r="80"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.5"
            fill={c}
            fillOpacity="0.07"
          />
          {/* Pentagon patches */}
          {[
            [140, 150, 18],
            [140, 88, 14],
            [195, 118, 14],
            [195, 182, 14],
            [140, 212, 14],
            [85, 182, 14],
            [85, 118, 14],
          ].map(([cx, cy, r], i) => {
            const pts = Array.from({ length: 5 }, (_, k) => {
              const a = ((Math.PI * 2) / 5) * k - Math.PI / 2;
              return `${(cx as number) + (r as number) * Math.cos(a)},${(cy as number) + (r as number) * Math.sin(a)}`;
            }).join(" ");
            return (
              <polygon
                key={i}
                points={pts}
                fill={i === 0 ? c : "none"}
                fillOpacity={i === 0 ? "0.45" : "0"}
                stroke={c}
                strokeWidth={i === 0 ? "2" : "1.5"}
                strokeOpacity={i === 0 ? "0.65" : "0.35"}
              />
            );
          })}
          {/* Sticker border frame */}
          <rect
            x="30"
            y="240"
            width="220"
            height="60"
            rx="8"
            stroke={c}
            strokeWidth="2"
            strokeOpacity="0.35"
            strokeDasharray="6 4"
            fill="none"
          />
          <line
            x1="30"
            y1="258"
            x2="250"
            y2="258"
            stroke={c}
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          {/* Stars */}
          {[
            [30, 50],
            [250, 45],
            [25, 210],
            [255, 215],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill={c}
              fillOpacity={0.5 - i * 0.08}
            />
          ))}
        </svg>
      );

    // ─── Digimon ──────────────────────────────────────────────────────────────
    case "digimon":
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="dg-glow" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="140" cy="145" r="125" fill="url(#dg-glow)" />
          {/* Digivice shape */}
          <rect
            x="88"
            y="62"
            width="104"
            height="148"
            rx="16"
            stroke={c}
            strokeWidth="2.5"
            strokeOpacity="0.55"
            fill={c}
            fillOpacity="0.08"
          />
          <rect
            x="96"
            y="72"
            width="88"
            height="72"
            rx="8"
            stroke={c}
            strokeWidth="1.5"
            strokeOpacity="0.45"
            fill={c}
            fillOpacity="0.12"
          />
          {/* Screen details — digital pattern */}
          {[100, 110, 120, 130].map((y, i) => (
            <line
              key={i}
              x1="100"
              y1={y}
              x2={100 + (i % 2 === 0 ? 80 : 60)}
              y2={y}
              stroke={c}
              strokeWidth="1"
              strokeOpacity={0.2 + i * 0.05}
              strokeDasharray="4 3"
            />
          ))}
          {/* Screen glow */}
          <circle cx="140" cy="108" r="20" fill={c} fillOpacity="0.3" />
          <circle cx="140" cy="108" r="10" fill={c} fillOpacity="0.5" />
          {/* Buttons */}
          {[
            [112, 162],
            [140, 162],
            [168, 162],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="8"
              stroke={c}
              strokeWidth="1.5"
              strokeOpacity="0.45"
              fill={c}
              fillOpacity={i === 1 ? 0.3 : 0.1}
            />
          ))}
          {/* Digital circuit lines */}
          {[
            [22, 80, 72, 80],
            [258, 80, 208, 80],
            [22, 200, 72, 200],
            [258, 200, 208, 200],
          ].map(([x1, y1, x2, y2], i) => (
            <g key={i} opacity={0.3}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={c}
                strokeWidth="1.5"
              />
              <circle cx={x1 as number} cy={y1 as number} r="3" fill={c} />
            </g>
          ))}
          {/* Binary dots */}
          {[
            [40, 258],
            [60, 272],
            [80, 260],
            [100, 274],
            [120, 262],
            [160, 262],
            [180, 274],
            [200, 260],
            [220, 272],
            [240, 258],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill={c}
              fillOpacity={i % 2 === 0 ? 0.45 : 0.2}
            />
          ))}
          {/* Corner brackets */}
          {[
            [25, 30],
            [255, 30],
            [25, 295],
            [255, 295],
          ].map(([x, y], i) => {
            const flip = i % 2 === 1;
            const sx = flip ? -1 : 1;
            const sy = i >= 2 ? -1 : 1;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={y}
                  x2={x + sx * 18}
                  y2={y}
                  stroke={c}
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                />
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={y + sy * 18}
                  stroke={c}
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                />
              </g>
            );
          })}
        </svg>
      );

    // ─── Fallback ─────────────────────────────────────────────────────────────
    default:
      return (
        <svg
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ width: "100%", height: "100%" }}
        >
          <circle
            cx="140"
            cy="160"
            r="120"
            stroke={color}
            strokeWidth="2"
            strokeOpacity="0.3"
            fill={color}
            fillOpacity="0.06"
          />
          <circle
            cx="140"
            cy="160"
            r="80"
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.2"
            fill="none"
          />
          <circle cx="140" cy="160" r="40" fill={color} fillOpacity="0.15" />
        </svg>
      );
  }
}
