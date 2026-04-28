-- Generado por scripts/migrate-wp-users.mjs (no editar a mano)
-- Fuente: u357847309_0zFd1.sql
-- Total: 33 usuarios
-- Re-ejecutable: ON CONFLICT actualiza, NO duplica.
--
-- Tras correr este script, los usuarios podrán hacer login con su contraseña
-- de WordPress. El primer login válido re-hashea automáticamente al formato
-- bcrypt nativo (ver verifyPassword + isLegacyWpHash en src/lib/auth.ts).

BEGIN;

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('doalwebs@gmail.com', NULL, '$wp$2y$10$WnsHzkeB9A3Z1yaRapmNTOO44vznHCyxUTde4QtQmZU53l9eAkJ4y', 'doalwebs@gmail.com', '', '', 'cliente'::user_role, NULL, NULL, '2025-01-25 16:34:35'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('salvabertomeu2001@gmail.com', 'adminSalva', '$wp$2y$10$l/1IKapfI7KSYFQ9vkdrc.D1X66eO88YdP0rmtZGKJY0ORyCz.bOq', 'Salvador', 'Bertomeu', '', 'admin'::user_role, NULL, NULL, '2026-01-15 16:17:37'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('elermous@gmail.com', 'adminAdri', '$wp$2y$10$aA.kjOfKDa9pXVNZ/PnP2uCq4vW9wk1OLtn1/.UWiRB69vQqumrUy', 'Adrian', 'Font', '', 'admin'::user_role, NULL, NULL, '2026-01-18 17:07:47'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('truenazos@gmail.com', 'salvabd2001', '$wp$2y$10$5/ghCVsrHMbr6oIZarQiJ.H2e2kCsQCDsSVdUHgBB/zwsHIqZIeru', 'Salvadorm', 'Bertomeu', '653050379', 'cliente'::user_role, NULL, NULL, '2026-01-21 19:16:48'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('fran_puchu@hotmail.com', 'puxu7', '$wp$2y$10$z3af6sLNkoCmjT109wQj5ezl1MHPX0HWYfP1oxSBjlnjrd6uEdHae', 'francisco', 'boronat devesa', '', 'admin'::user_role, NULL, NULL, '2026-01-22 18:16:42'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('hristovkris85@gmail.com', 'Krispeto05', '$wp$2y$10$0xjqqnJnrkQERA7ubk7uIeFg9rIJtzq.Bsull/nww3TgjRo89NvJa', 'Krispeto05', '', '', 'cliente'::user_role, NULL, NULL, '2026-01-30 17:33:10'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('888mattman@gmail.com', 'kristach', '$wp$2y$10$Za2LyFNTbSl.VQfz1f5KhuXR.Wvygy9.TW2AqcD7GZRtFR764/2hq', 'kristach', '', '', 'cliente'::user_role, NULL, NULL, '2026-01-31 13:05:07'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('cumplimiento03060@gmail.com', NULL, '$wp$2y$10$1Ju1xzl7tmH14tsiySOtL.sAIc68cRmOfs0IBJuWnGTSNnp0bB7E.', 'prueba', 'pruebas prueba', '+34666555444', 'cliente'::user_role, NULL, NULL, '2026-02-02 17:48:33'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('josecarlosanguis@gmail.com', 'erenian', '$wp$2y$10$ZnRjxOO5c5VaD9ZdeJpGU.n751B9hWiu96BtzIHCoJ4aOq.NqySeq', 'erenian', '', '687588017', 'cliente'::user_role, NULL, NULL, '2026-02-02 21:19:43'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('paualcon333@gmail.com', 'paualcon', '$wp$2y$10$4UwifspimLrscn6pVIqZ/uH1pgB2BJn67SjktktJNwsmt3oy7NvCG', 'paualcon', '', '655459448', 'cliente'::user_role, NULL, NULL, '2026-02-03 07:29:08'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('reliquiatcg@gmail.com', 'ReliquiaTCG', '$wp$2y$10$4N68DffxFk61KuiZiG0dDOpTBWTc5rptK15s8SZOSTPBd6MXDfwdS', 'jorge', 'Pérez Ligero', '650888983', 'cliente'::user_role, NULL, NULL, '2026-02-03 11:25:34'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('isvalla@gmail.com', 'isvalla', '$wp$2y$10$hLm8NpR0gbcturm7CyLLYOBDwKra8pnDJPSvNI7beJmAVVGA25J6O', 'isvalla', '', '658961999', 'cliente'::user_role, NULL, NULL, '2026-02-04 14:38:33'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('azka2019@gmail.com', 'Azka32', '$wp$2y$10$Qtj2cqxpOmjtn4sXj1kjUOidQWKW3gkrnWoNPLgI8yGWxtWyQeIhC', 'oier', 'azcarraga gonzalez', '663919750', 'cliente'::user_role, NULL, NULL, '2026-02-07 11:13:01'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('polterreo@gmail.com', 'iseksifull', '$wp$2y$10$NTRVPe.H0jzzjs.svSLmHu0BY8iU0Wx.1G7z626FiPxj0QiKXvWkm', 'Pol', 'Terreo Tudo', '+34627372296', 'cliente'::user_role, NULL, NULL, '2026-02-16 00:18:08'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('jmrodri79@gmail.com', 'jmrodri', '$wp$2y$10$W6u1hbvQHQhVQ/xDTReSvuM5AXhraj5HfgvfLWDtLz2XbG0cqa3Tq', 'jmrodri', '', '', 'cliente'::user_role, NULL, NULL, '2026-02-19 15:42:26'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('ser-valles@hotmail.com', 'Riovhah', '$wp$2y$10$4ry6y2MZ7cbIzD2v1LmrE.mgFXZeNeX3BxDxztdKB7GhWwoK.SsTy', 'Riovhah', '', '+34650793345', 'cliente'::user_role, NULL, NULL, '2026-02-20 08:54:57'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('decosa.castro@gmail.com', 'Decosa91', '$wp$2y$10$MO/KZlTW0RUe0gTYL63DfexZ1sfA4fMaSADDXFI3ebsSUCvxY9Z1u', 'Decosa91', '', '685983734', 'cliente'::user_role, NULL, NULL, '2026-02-21 12:34:16'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('emunozto@gmail.com', 'Emunozto', '$wp$2y$10$yfdkxoMC19n9QP2N66Inw.zXphL2.sXEL3LQR2GMAIxDoJbR2MRqa', 'Ernesto', 'M', '698352891', 'cliente'::user_role, NULL, NULL, '2026-02-22 10:08:04'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('jesaut88@gmail.com', 'jesaut88', '$wp$2y$10$jPRQKmahdITm0665i7v7SuxoyWT9sXgvZO61nr75AfUuXNv1AWbwO', 'Jesaut', 'Andrés Rodríguez', '+34674915168', 'cliente'::user_role, NULL, NULL, '2026-02-22 11:01:09'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('gerophoxtcg@gmail.com', NULL, '$wp$2y$10$WwQGXp7ZBXqj8TOGvjlAhOYElrGFFM1XoFkD22pwAU52ag27cvMju', 'gerophoxtcg@gmail.com', '', '', 'cliente'::user_role, NULL, NULL, '2026-02-24 17:27:26'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('jose.rib.sal@gmail.com', 'Pepdelhorta', '$wp$2y$10$k24L4e3/2aETE8EJ/SAZ9.WOcABpXcPa8NR70QAKfv7R.x7T/OPFa', 'Pepdelhorta', '', '+34699979595', 'cliente'::user_role, NULL, NULL, '2026-02-25 09:54:24'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('scorpio96blo@gmail.com', 'kuro96', '$wp$2y$10$eGRX2PpO6RN8DwD3l.V3FOF6VKq53TaxDjw4JNC/2HQT30AOJnthW', 'kuro96', '', '675301863', 'cliente'::user_role, NULL, NULL, '2026-02-27 07:19:43'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('daniocampor8@yahoo.es', 'daniocampor8', '$wp$2y$10$88Gz9EOkQCKZCRa8R/BJT.1DLZIEHcy.wofmWtjGVYz81U9AU3VOy', 'Evaristo', 'Daniel Rodriguez Ocampo', '+34657146070', 'cliente'::user_role, NULL, NULL, '2026-03-05 14:36:22'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('juantxu6@gmail.com', 'King91', '$wp$2y$10$/4orxSTzBdqvb8OWzxdqQewSNCdaE2Ep9Z28h3Ceohsuwjh5QNugi', 'King91', '', '605863330', 'cliente'::user_role, NULL, NULL, '2026-03-06 13:37:33'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('alejandrogrillegarcia@gmail.com', 'Butifarraturca', '$wp$2y$10$Ga.UhkNkol2oLPvgfLgYk.f5xutYGE01FjIJJwEuh4wylqJwJRgUC', 'Alejandro', 'Grille Garcia', '667035267', 'cliente'::user_role, NULL, NULL, '2026-03-09 13:36:38'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('breadyready123@gmail.com', 'Daniel', '$wp$2y$10$NOHZzqc0BQ9gqVuf6Tzthe/Ow1AoGmoGu6SSxO8/NgMWVyncPlhfu', 'Daniel', '', '', 'cliente'::user_role, NULL, NULL, '2026-03-30 21:14:30'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('info@jotacards.com', 'Jotacards', '$wp$2y$10$EExjI9e.CLeBzgYBWk506eIuh38Mq4Co7THHKpLHCwP1WO821kR2G', 'Jotacards', '', '+34650729387', 'cliente'::user_role, NULL, NULL, '2026-04-02 17:48:50'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('jaky.estocado12@gmail.com', 'luis', '$wp$2y$10$L.zUP0U6IECwgs/pG28Hwe0X6RMs5ZNYgOl/dzQm2vmYiPnVuJxfG', 'luis', '', '+34672771328', 'cliente'::user_role, NULL, NULL, '2026-04-05 12:48:53'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('juanmolins88@gmail.com', NULL, '$wp$2y$10$geLYcCK35fJh8vJcvnWtwuJDZHuSEDlnGnAGrMwlyhuIaUGJ5yTDq', 'Juan', 'Maria Asensio', '+34600463816', 'cliente'::user_role, NULL, NULL, '2026-04-07 15:23:35'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('luiscarlos.perez86@gmail.com', 'Luiskar23', '$wp$2y$10$W1qxc2MTpIM0YR5dkIyjCO9UPVY2IMJIU0JloaTSy3m8lS3KInk9.', 'Luis', 'Carlos Pérez Padilla', '678049096', 'cliente'::user_role, NULL, NULL, '2026-04-07 17:34:47'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('annezubeldia23@gmail.com', 'Annezu23', '$wp$2y$10$8vYH0wjPdRrOty9sbE/YP.TgSNc/SPDmzBtl7ITXAd4rkYWg8B0.G', 'Anne', 'Zubeldia Aristondo', '679976246', 'cliente'::user_role, NULL, NULL, '2026-04-07 22:22:01'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('adrian89gm@gmail.com', 'AdriGM', '$wp$2y$10$d024FwBbMj5dwZUxKLvOy.YlNbw/XMlzzozBqgl54Ld/U3ZqUdCJC', 'AdriGM', '', '617579379', 'cliente'::user_role, NULL, NULL, '2026-04-12 12:24:42'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role, tax_id, tax_id_type, created_at)
VALUES ('kokoloko1990@gmail.com', 'pablo', '$wp$2y$10$yQZznMtrNDKgBzY6QRXKneUxkypoeELEBSUtiG9N0RplZ0uELgDT2', 'Pablo', 'Vazquez', '629012695', 'cliente'::user_role, NULL, NULL, '2026-04-16 09:46:01'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name    = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name     = COALESCE(NULLIF(EXCLUDED.last_name, ''),  users.last_name),
  phone         = COALESCE(NULLIF(EXCLUDED.phone, ''),      users.phone),
  role          = EXCLUDED.role,
  tax_id        = COALESCE(EXCLUDED.tax_id, users.tax_id),
  tax_id_type   = COALESCE(EXCLUDED.tax_id_type, users.tax_id_type);

WITH u AS (SELECT id FROM users WHERE email = 'truenazos@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Salvadorm Bertomeu', 'Partida Salamnca 1L', NULL, '03710', 'Calpe', 'A', 'ES', '653050379', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'cumplimiento03060@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'prueba pruebas prueba', 'prueba, 72 b', NULL, '28020', 'madrid', 'M', 'ES', '+34666555444', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'josecarlosanguis@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Jose Carlos Anguis Raya', 'Calle San Antón, 57', NULL, '23440', 'Baeza', 'J', 'ES', '687588017', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'paualcon333@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Pau Alcón Sanchis', 'C/L''Alguer 6, porta 7, pis 4', NULL, '46022', 'València', 'V', 'ES', '655459448', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'reliquiatcg@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'jorge Pérez Ligero', 'Marqués de la Valdavia 3, Escalera Izquierda, 1A', NULL, '28012', 'Madrid', 'M', 'ES', '650888983', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'isvalla@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Ignacio Sanchez Valladolid', 'Paseo habana 74. Torre Este 6A', NULL, '28036', 'Madrid', 'M', 'ES', '658961999', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'azka2019@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'oier azcarraga gonzalez', 'Unda torre 4B 4C', NULL, '48200', 'Durango', 'BI', 'ES', '663919750', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'polterreo@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Pol Terreo Tudo', 'Lesseps 11, 5o3a', NULL, '08023', 'Barcelona', 'B', 'ES', '+34627372296', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'ser-valles@hotmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Sergio Valles Carrio', 'C/ paradis n°4 piso 3 puerta 24', NULL, '03730', 'Javea', 'A', 'ES', '+34650793345', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'decosa.castro@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Carlos Manuel Decosa Castro', 'Calle Orense, 28', NULL, '21110', 'Aljaraque', 'H', 'ES', '685983734', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'emunozto@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Ernesto M', 'Partida Bitla 3', NULL, '03793', 'Castell de Castells', 'A', 'ES', '698352891', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'jesaut88@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Jesaut Andrés Rodríguez', 'C/los Almendros 26 ed pasarela piso 2 puerta c', NULL, '03710', 'Calpe', 'A', 'ES', '+34674915168', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'jose.rib.sal@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Pepe Ribes', 'Avenida Lepanto 1', NULL, '03730', 'Jávea', 'A', 'ES', '+34699979595', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'scorpio96blo@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Matias Figueroa Gamboa', 'Calle Juan XXIII N20 LOCAL (INFORSERVICE)', NULL, '12580', 'Benicarlo', 'CS', 'ES', '675301863', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'daniocampor8@yahoo.es')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Evaristo Daniel Rodriguez Ocampo', 'Calle benarabe n2 local R3 reformas', NULL, '12005', 'Castellon', 'CS', 'ES', '+34657146070', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'juantxu6@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Juan Carlos Sánchez Garcés', 'Calle Goya 16, 1°D', NULL, '18100', 'Armilla', 'GR', 'ES', '605863330', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'alejandrogrillegarcia@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Alejandro Grille Garcia', 'Calle Pintores 15', NULL, '11520', 'Rota', 'CA', 'ES', '667035267', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'info@jotacards.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Jose Joaquin Gil Lucas', 'Calle Santander, 5', NULL, '03160', 'ALMORADÍ', 'A', 'ES', '+34650729387', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'jaky.estocado12@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Luis Terrades', 'Plz Archiduque Carlos 10, Piso 4 puerta 19', NULL, '03700', 'DÉNIA', 'A', 'ES', '+34672771328', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'juanmolins88@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Juan Maria Asensio', 'Carrer de Miquel Tort 7, Piso Atico puerta 4', NULL, '08750', 'Molins de Rei', 'B', 'ES', '+34600463816', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'luiscarlos.perez86@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Luis Carlos Pérez Padilla', 'C. Cuadro, 8 3A', NULL, '13500', 'Puertollano', 'CR', 'ES', '678049096', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'annezubeldia23@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Anne Zubeldia Aristondo', 'Avn De Navarra 39, 1D', NULL, '20200', 'Beasain', 'SS', 'ES', '679976246', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'adrian89gm@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Adrian Gonzalez Martinez', 'Calle Ciudad Rodrigo 71', NULL, '45280', 'Olías del Rey', 'TO', 'ES', '617579379', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);

WITH u AS (SELECT id FROM users WHERE email = 'kokoloko1990@gmail.com')
INSERT INTO addresses (user_id, label, recipient, street, floor, postal_code, city, province, country, phone, is_default)
SELECT u.id, 'Casa', 'Pablo Vazquez', 'Avenida de los Rosales 115, 3°D', NULL, '28935', 'Mostoles', 'M', 'ES', '629012695', TRUE
FROM u
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id);


COMMIT;
