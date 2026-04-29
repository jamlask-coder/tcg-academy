-- Generado por scripts/migrate-wp-orders.mjs (no editar a mano)
-- Fuente: u357847309_0zFd1.sql (WP/WooCommerce HPOS)
-- Total: 33 pedidos heredados (carry-over SL anterior)
--
-- Re-ejecutable: ON CONFLICT (id) DO UPDATE.
-- NO se importan order_items (FK a products bloquea — productos WP
-- no existen en tabla products). Cabeceras suficientes para /admin/pedidos.
-- NO se emiten facturas: el adapter marca fiscalCarryOver=true.

BEGIN;

-- WP order 3016 (salvabertomeu2001@gmail.com) · 2026-01-11 11:40:38
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260111-W03016',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('salvabertomeu2001@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Salvador","lastName":"Bertomeu","email":"salvabertomeu2001@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"prueba","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  157.02,
  0.00,
  0,
  0.00,
  157.02,
  'transferencia'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3016',
  '2026-01-11 11:40:38'::timestamptz,
  '2026-01-22 18:11:01'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3113 (truenazos@gmail.com) · 2026-01-21 19:16:48
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260121-W03113',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '91M0340520974132X',
  '[Carry-over WP] WP id=3113 · Pago: PayPal · Tx: 91M0340520974132X',
  '2026-01-21 19:16:48'::timestamptz,
  '2026-01-22 18:10:11'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3116 (truenazos@gmail.com) · 2026-01-22 16:49:55
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260122-W03116',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '6H9826734D500343R',
  '[Carry-over WP] WP id=3116 · Pago: PayPal · Tx: 6H9826734D500343R · Nota cliente: LLAMAR PARA ABRIR LA PUERTA',
  '2026-01-22 16:49:55'::timestamptz,
  '2026-02-09 11:46:02'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3139 (truenazos@gmail.com) · 2026-01-27 18:03:35
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260127-W03139',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'cancelado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'tarjeta'::payment_method,
  'pendiente'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3139 · Pago: Pagar con Tarjeta',
  '2026-01-27 18:03:35'::timestamptz,
  '2026-01-27 18:27:16'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3140 (truenazos@gmail.com) · 2026-01-27 18:27:52
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260127-W03140',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'cancelado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'tarjeta'::payment_method,
  'pendiente'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3140 · Pago: Pagar con Tarjeta',
  '2026-01-27 18:27:52'::timestamptz,
  '2026-01-27 18:41:29'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3141 (truenazos@gmail.com) · 2026-01-27 18:56:24
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260127-W03141',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3141 · Pago: Tarjeta de Crédito/Débito',
  '2026-01-27 18:56:24'::timestamptz,
  '2026-02-09 11:47:12'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3142 (truenazos@gmail.com) · 2026-01-27 19:14:09
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260127-W03142',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'cancelado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'tarjeta'::payment_method,
  'pendiente'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3142 · Pago: Tarjeta de Crédito/Débito',
  '2026-01-27 19:14:09'::timestamptz,
  '2026-01-27 19:41:15'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3143 (truenazos@gmail.com) · 2026-01-28 16:31:11
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260128-W03143',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3143 · Pago: Tarjeta de Crédito/Débito',
  '2026-01-28 16:31:11'::timestamptz,
  '2026-01-28 17:38:00'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3155 (truenazos@gmail.com) · 2026-01-28 17:27:48
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260128-W03155',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('truenazos@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Salvadorm","lastName":"Bertomeu","email":"truenazos@gmail.com","phone":"653050379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Salamnca 1L","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  0.99,
  0.00,
  0,
  0.00,
  0.99,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '9S7176137E5467129',
  '[Carry-over WP] WP id=3155 · Pago: PayPal · Tx: 9S7176137E5467129',
  '2026-01-28 17:27:48'::timestamptz,
  '2026-02-09 11:45:15'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3235 (cumplimiento03060@gmail.com) · 2026-02-02 17:48:34
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260202-W03235',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('cumplimiento03060@gmail.com') LIMIT 1),
  'cancelado'::order_status,
  '{"userId":null,"firstName":"prueba","lastName":"pruebas prueba","email":"cumplimiento03060@gmail.com","phone":"+34666555444","taxId":"","taxIdType":null,"company":"prueba"}'::jsonb,
  '{"calle":"prueba","numero":"","piso":"72 b","cp":"28020","ciudad":"madrid","provincia":"M","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  189.90,
  0.00,
  0,
  0.00,
  189.90,
  'tarjeta'::payment_method,
  'pendiente'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3235 · Pago: Tarjeta de Crédito/Débito',
  '2026-02-02 17:48:34'::timestamptz,
  '2026-02-02 18:28:35'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3240 (josecarlosanguis@gmail.com) · 2026-02-02 21:21:43
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260202-W03240',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('josecarlosanguis@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Jose Carlos","lastName":"Anguis Raya","email":"josecarlosanguis@gmail.com","phone":"687588017","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle San Antón, 57","numero":"","piso":"","cp":"23440","ciudad":"Baeza","provincia":"J","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  210.00,
  0.00,
  0,
  0.00,
  210.00,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3240 · Pago: Tarjeta de Crédito/Débito',
  '2026-02-02 21:21:43'::timestamptz,
  '2026-02-06 18:39:01'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3241 (paualcon333@gmail.com) · 2026-02-03 07:36:01
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260203-W03241',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('paualcon333@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Pau","lastName":"Alcón Sanchis","email":"paualcon333@gmail.com","phone":"655459448","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"C/L''Alguer 6, porta 7, pis 4","numero":"","piso":"","cp":"46022","ciudad":"València","provincia":"V","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  210.00,
  0.00,
  0,
  0.00,
  210.00,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3241 · Pago: Tarjeta de Crédito/Débito',
  '2026-02-03 07:36:01'::timestamptz,
  '2026-02-06 18:38:40'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3242 (reliquiatcg@gmail.com) · 2026-02-03 11:25:35
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260203-W03242',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('reliquiatcg@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"jorge","lastName":"Pérez Ligero","email":"reliquiatcg@gmail.com","phone":"650888983","taxId":"","taxIdType":null,"company":"ReliquiaTCG"}'::jsonb,
  '{"calle":"Marqués de la Valdavia 3","numero":"","piso":"Escalera Izquierda, 1A","cp":"28012","ciudad":"Madrid","provincia":"M","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  840.00,
  0.00,
  0,
  0.00,
  840.00,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '7DY09090BF521911D',
  '[Carry-over WP] WP id=3242 · Pago: PayPal · Tx: 7DY09090BF521911D',
  '2026-02-03 11:25:35'::timestamptz,
  '2026-02-06 18:38:09'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3277 (isvalla@gmail.com) · 2026-02-04 15:34:50
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260204-W03277',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('isvalla@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Ignacio","lastName":"Sanchez Valladolid","email":"isvalla@gmail.com","phone":"658961999","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Paseo habana 74. Torre Este 6A","numero":"","piso":"","cp":"28036","ciudad":"Madrid","provincia":"M","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  210.00,
  0.00,
  0,
  0.00,
  210.00,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3277 · Pago: Tarjeta de Crédito/Débito',
  '2026-02-04 15:34:50'::timestamptz,
  '2026-02-06 18:35:16'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3301 (azka2019@gmail.com) · 2026-02-07 11:13:01
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260207-W03301',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('azka2019@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"oier","lastName":"azcarraga gonzalez","email":"azka2019@gmail.com","phone":"663919750","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Unda torre 4B 4C","numero":"","piso":"","cp":"48200","ciudad":"Durango","provincia":"BI","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  210.00,
  0.00,
  0,
  0.00,
  210.00,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3301 · Pago: Tarjeta de Crédito/Débito · Nota cliente: Hola buenas, soy el chico de cardmarket, \"Azka32\", así te cancelo ese pedido y por consiguiente, procedo a hacerlo por aquí, ya siento marearte.\r\nUn saludo y gracias!',
  '2026-02-07 11:13:01'::timestamptz,
  '2026-02-10 10:18:38'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3318 (polterreo@gmail.com) · 2026-02-16 00:18:09
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260216-W03318',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('polterreo@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Pol","lastName":"Terreo Tudo","email":"polterreo@gmail.com","phone":"+34627372296","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Lesseps 11","numero":"","piso":"5o3a","cp":"08023","ciudad":"Barcelona","provincia":"B","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  214.20,
  0.00,
  0,
  0.00,
  214.20,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '3J914626W90634413',
  '[Carry-over WP] WP id=3318 · Pago: PayPal · Tx: 3J914626W90634413',
  '2026-02-16 00:18:09'::timestamptz,
  '2026-02-18 10:01:59'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3351 (ser-valles@hotmail.com) · 2026-02-20 21:51:13
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260220-W03351',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('ser-valles@hotmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Sergio","lastName":"Valles Carrio","email":"ser-valles@hotmail.com","phone":"+34650793345","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"C/ Paradis n°4 piso 3 puerta 24","numero":"","piso":"","cp":"03730","ciudad":"Javea","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  119.29,
  2.48,
  0,
  0.00,
  123.28,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '7W028763C87894912',
  '[Carry-over WP] WP id=3351 · Pago: PayPal · Tx: 7W028763C87894912',
  '2026-02-20 21:51:13'::timestamptz,
  '2026-03-03 17:59:34'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3354 (decosa.castro@gmail.com) · 2026-02-21 12:40:07
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260221-W03354',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('decosa.castro@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Carlos Manuel","lastName":"Decosa Castro","email":"decosa.castro@gmail.com","phone":"685983734","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle Orense, 28","numero":"","piso":"","cp":"21110","ciudad":"Aljaraque","provincia":"H","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  206.00,
  3.31,
  0,
  0.00,
  206.00,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '2642138748203200A',
  '[Carry-over WP] WP id=3354 · Pago: Tarjetas de débito y crédito · Tx: 2642138748203200A',
  '2026-02-21 12:40:07'::timestamptz,
  '2026-02-23 10:21:24'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3355 (emunozto@gmail.com) · 2026-02-22 10:08:05
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260222-W03355',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('emunozto@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Ernesto","lastName":"M","email":"emunozto@gmail.com","phone":"698352891","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Partida Bitla 3","numero":"","piso":"","cp":"03793","ciudad":"Castell de Castells","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  54.95,
  4.13,
  0,
  0.00,
  54.95,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '3UM5062350504122B',
  '[Carry-over WP] WP id=3355 · Pago: Tarjetas de débito y crédito · Tx: 3UM5062350504122B · Nota cliente: Para recoger en tienda en Calpe.',
  '2026-02-22 10:08:05'::timestamptz,
  '2026-03-16 10:49:13'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3356 (JESAUT88@GMAIL.COM) · 2026-02-22 11:01:09
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260222-W03356',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('JESAUT88@GMAIL.COM') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Jesaut","lastName":"Andrés Rodríguez","email":"JESAUT88@GMAIL.COM","phone":"+34674915168","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"C/los Almendros 26 ed pasarela piso 2 puerta c","numero":"","piso":"","cp":"03710","ciudad":"Calpe","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  56.13,
  4.13,
  0,
  0.00,
  56.13,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '09S93001CR627560F',
  '[Carry-over WP] WP id=3356 · Pago: PayPal · Tx: 09S93001CR627560F',
  '2026-02-22 11:01:09'::timestamptz,
  '2026-03-02 11:57:05'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3363 (jose.rib.sal@gmail.com) · 2026-02-25 09:56:03
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260225-W03363',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('jose.rib.sal@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Pepe","lastName":"Ribes","email":"jose.rib.sal@gmail.com","phone":"+34699979595","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Avenida Lepanto 1","numero":"","piso":"","cp":"03730","ciudad":"Jávea","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  54.95,
  4.13,
  0,
  0.00,
  54.95,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '25P02933GT187025X',
  '[Carry-over WP] WP id=3363 · Pago: Tarjetas de débito y crédito · Tx: 25P02933GT187025X',
  '2026-02-25 09:56:03'::timestamptz,
  '2026-03-16 11:09:18'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3388 (scorpio96blo@gmail.com) · 2026-02-27 07:32:09
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260227-W03388',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('scorpio96blo@gmail.com') LIMIT 1),
  'cancelado'::order_status,
  '{"userId":null,"firstName":"Matias","lastName":"Figueroa Gamboa","email":"scorpio96blo@gmail.com","phone":"675301863","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle Juan XXIII N20 LOCAL (INFORSERVICE)","numero":"","piso":"","cp":"12580","ciudad":"Benicarlo","provincia":"CS","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  259.85,
  0.00,
  0,
  0.00,
  259.85,
  'paypal'::payment_method,
  'fallido'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3388 · Pago: Tarjetas de débito y crédito',
  '2026-02-27 07:32:09'::timestamptz,
  '2026-02-27 07:32:11'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3392 (decosa.castro@gmail.com) · 2026-03-02 12:24:42
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260302-W03392',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('decosa.castro@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Carlos Manuel","lastName":"Decosa Castro","email":"decosa.castro@gmail.com","phone":"685983734","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle Orense, 28","numero":"","piso":"","cp":"21110","ciudad":"Aljaraque","provincia":"H","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  159.00,
  17.23,
  0,
  0.00,
  159.00,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '5WV32266UG468773G',
  '[Carry-over WP] WP id=3392 · Pago: Tarjetas de débito y crédito · Tx: 5WV32266UG468773G',
  '2026-03-02 12:24:42'::timestamptz,
  '2026-03-03 18:00:30'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3416 (daniocampor8@yahoo.es) · 2026-03-05 14:36:22
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260305-W03416',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('daniocampor8@yahoo.es') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Evaristo Daniel","lastName":"Rodriguez Ocampo","email":"daniocampor8@yahoo.es","phone":"+34657146070","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle benarabe n2 local R3 reformas","numero":"","piso":"","cp":"12005","ciudad":"Castellon","provincia":"CS","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  42.90,
  2.48,
  0,
  0.00,
  46.89,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '3WB41135WL423502F',
  '[Carry-over WP] WP id=3416 · Pago: Tarjetas de débito y crédito · Tx: 3WB41135WL423502F',
  '2026-03-05 14:36:22'::timestamptz,
  '2026-04-08 08:53:13'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3433 (juantxu6@gmail.com) · 2026-03-06 13:52:12
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260306-W03433',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('juantxu6@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Juan Carlos","lastName":"Sánchez Garcés","email":"juantxu6@gmail.com","phone":"605863330","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle Goya 16, 1°D","numero":"","piso":"","cp":"18100","ciudad":"Armilla","provincia":"GR","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  236.85,
  9.92,
  0,
  0.00,
  236.85,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '18F7774954157250P',
  '[Carry-over WP] WP id=3433 · Pago: Tarjetas de débito y crédito · Tx: 18F7774954157250P',
  '2026-03-06 13:52:12'::timestamptz,
  '2026-04-08 08:52:41'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3434 (alejandrogrillegarcia@gmail.com) · 2026-03-09 13:36:39
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260309-W03434',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('alejandrogrillegarcia@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Alejandro","lastName":"Grille Garcia","email":"alejandrogrillegarcia@gmail.com","phone":"667035267","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle Pintores 15","numero":"","piso":"","cp":"11520","ciudad":"Rota","provincia":"CA","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  59.95,
  0.00,
  0,
  0.00,
  63.94,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '33482202G9818201W',
  '[Carry-over WP] WP id=3434 · Pago: Tarjetas de débito y crédito · Tx: 33482202G9818201W',
  '2026-03-09 13:36:39'::timestamptz,
  '2026-03-17 16:19:29'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3439 (polterreo@gmail.com) · 2026-03-09 22:41:36
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260309-W03439',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('polterreo@gmail.com') LIMIT 1),
  'enviado'::order_status,
  '{"userId":null,"firstName":"Pol","lastName":"Terreo Tudo","email":"polterreo@gmail.com","phone":"+34627372296","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Lesseps 11","numero":"","piso":"5o3a","cp":"08023","ciudad":"Barcelona","provincia":"B","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  214.20,
  0.00,
  0,
  0.00,
  214.20,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '66492181E1300740H',
  '[Carry-over WP] WP id=3439 · Pago: PayPal · Tx: 66492181E1300740H',
  '2026-03-09 22:41:36'::timestamptz,
  '2026-03-16 11:17:51'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3465 (jaky.estocado12@gmail.com) · 2026-04-05 12:54:12
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260405-W03465',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('jaky.estocado12@gmail.com') LIMIT 1),
  'confirmado'::order_status,
  '{"userId":null,"firstName":"Luis","lastName":"Terrades","email":"jaky.estocado12@gmail.com","phone":"+34672771328","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Plz Archiduque Carlos 10","numero":"","piso":"Piso 4 puerta 19","cp":"03700","ciudad":"DÉNIA","provincia":"A","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  209.95,
  0.00,
  0,
  0.00,
  209.95,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3465 · Pago: Tarjeta de Crédito/Débito',
  '2026-04-05 12:54:12'::timestamptz,
  '2026-04-05 12:56:11'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3466 (juanmolins88@gmail.com) · 2026-04-07 15:23:35
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260407-W03466',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('juanmolins88@gmail.com') LIMIT 1),
  'confirmado'::order_status,
  '{"userId":null,"firstName":"Juan","lastName":"Maria Asensio","email":"juanmolins88@gmail.com","phone":"+34600463816","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Carrer de Miquel Tort 7","numero":"","piso":"Piso Atico puerta 4","cp":"08750","ciudad":"Molins de Rei","provincia":"B","pais":"ES"}'::jsonb,
  'estandar',
  0.00,
  708.75,
  0.00,
  0,
  0.00,
  708.75,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '9TN96360GJ081641C',
  '[Carry-over WP] WP id=3466 · Pago: PayPal · Tx: 9TN96360GJ081641C',
  '2026-04-07 15:23:35'::timestamptz,
  '2026-04-07 15:23:39'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3467 (luiscarlos.perez86@gmail.com) · 2026-04-07 17:34:48
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260407-W03467',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('luiscarlos.perez86@gmail.com') LIMIT 1),
  'confirmado'::order_status,
  '{"userId":null,"firstName":"Luis Carlos","lastName":"Pérez Padilla","email":"luiscarlos.perez86@gmail.com","phone":"678049096","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"C. Cuadro, 8 3A","numero":"","piso":"","cp":"13500","ciudad":"Puertollano","provincia":"CR","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  101.95,
  0.00,
  0,
  0.00,
  105.94,
  'paypal'::payment_method,
  'cobrado'::payment_status,
  '7WW294074N3810224',
  '[Carry-over WP] WP id=3467 · Pago: PayPal · Tx: 7WW294074N3810224',
  '2026-04-07 17:34:48'::timestamptz,
  '2026-04-07 17:34:51'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3468 (annezubeldia23@gmail.com) · 2026-04-07 22:22:01
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260407-W03468',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('annezubeldia23@gmail.com') LIMIT 1),
  'confirmado'::order_status,
  '{"userId":null,"firstName":"Anne","lastName":"Zubeldia Aristondo","email":"annezubeldia23@gmail.com","phone":"679976246","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Avn De Navarra 39","numero":"","piso":"1D","cp":"20200","ciudad":"Beasain","provincia":"SS","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  96.95,
  2.48,
  0,
  0.00,
  100.94,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3468 · Pago: Tarjeta de Crédito/Débito',
  '2026-04-07 22:22:01'::timestamptz,
  '2026-04-07 22:24:32'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3519 (adrian89gm@gmail.com) · 2026-04-12 12:31:56
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260412-W03519',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('adrian89gm@gmail.com') LIMIT 1),
  'confirmado'::order_status,
  '{"userId":null,"firstName":"Adrian","lastName":"Gonzalez Martinez","email":"adrian89gm@gmail.com","phone":"617579379","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Calle Ciudad Rodrigo 71","numero":"","piso":"","cp":"45280","ciudad":"Olías del Rey","provincia":"TO","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  164.95,
  0.00,
  0,
  0.00,
  168.94,
  'tarjeta'::payment_method,
  'cobrado'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3519 · Pago: Tarjeta de Crédito/Débito',
  '2026-04-12 12:31:56'::timestamptz,
  '2026-04-12 12:32:33'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;

-- WP order 3573 (kokoloko1990@gmail.com) · 2026-04-16 09:46:01
INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  'TCG-260416-W03573',
  (SELECT id FROM users WHERE LOWER(email) = LOWER('kokoloko1990@gmail.com') LIMIT 1),
  'cancelado'::order_status,
  '{"userId":null,"firstName":"Pablo","lastName":"Vazquez","email":"kokoloko1990@gmail.com","phone":"629012695","taxId":"","taxIdType":null,"company":null}'::jsonb,
  '{"calle":"Avenida de los Rosales 115","numero":"","piso":"3°D","cp":"28935","ciudad":"Mostoles","provincia":"M","pais":"ES"}'::jsonb,
  'estandar',
  3.99,
  184.90,
  0.00,
  0,
  0.00,
  188.89,
  'tarjeta'::payment_method,
  'pendiente'::payment_status,
  NULL,
  '[Carry-over WP] WP id=3573 · Pago: Tarjeta de Crédito/Débito',
  '2026-04-16 09:46:01'::timestamptz,
  '2026-04-17 06:51:24'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;


COMMIT;

-- Importados: 33 pedidos
-- Saltados:   0 (refunds / sin dirección)