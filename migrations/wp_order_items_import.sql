-- Generado por scripts/migrate-wp-order-items.mjs (no editar a mano)
-- Fuente: wp_woocommerce_order_items + wp_woocommerce_order_itemmeta
-- Total: 41 líneas de producto en 33 pedidos
--
-- Idempotente: borra los items de los orders afectados y reinserta.
-- Solo toca order_items_legacy (carry-over WP). NO afecta order_items.

BEGIN;

-- Limpieza previa de los pedidos importados (re-ejecutable)
DELETE FROM order_items_legacy WHERE order_id IN (
  'TCG-260111-W03016',
  'TCG-260121-W03113',
  'TCG-260122-W03116',
  'TCG-260127-W03139',
  'TCG-260127-W03140',
  'TCG-260127-W03141',
  'TCG-260127-W03142',
  'TCG-260128-W03143',
  'TCG-260128-W03155',
  'TCG-260202-W03235',
  'TCG-260202-W03240',
  'TCG-260203-W03241',
  'TCG-260203-W03242',
  'TCG-260204-W03277',
  'TCG-260207-W03301',
  'TCG-260216-W03318',
  'TCG-260220-W03351',
  'TCG-260221-W03354',
  'TCG-260222-W03355',
  'TCG-260222-W03356',
  'TCG-260225-W03363',
  'TCG-260227-W03388',
  'TCG-260302-W03392',
  'TCG-260305-W03416',
  'TCG-260306-W03433',
  'TCG-260309-W03434',
  'TCG-260309-W03439',
  'TCG-260405-W03465',
  'TCG-260407-W03466',
  'TCG-260407-W03467',
  'TCG-260407-W03468',
  'TCG-260412-W03519',
  'TCG-260416-W03573'
);

INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260111-W03016', 2953, 'Barça Team Set 2025/26', 2, 78.51, 157.02, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260121-W03113', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260122-W03116', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260127-W03139', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260127-W03140', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260127-W03141', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260127-W03142', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260128-W03143', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260128-W03155', 3064, 'Blister Toploader', 1, 0.99, 0.99, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260202-W03235', 3216, 'Caja de Sobres Ruler of the Black Flame Japonés - Pokémon', 1, 94.95, 94.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260202-W03235', 3214, 'Caja de Sobres MegaBrave Japonés - Pokémon', 1, 94.95, 94.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260202-W03240', 3232, 'CAJA DE SET BOOSTER INGLÉS (RESERVA) - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 210.00, 210.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260203-W03241', 3232, 'CAJA DE SET BOOSTER INGLÉS (RESERVA) - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 210.00, 210.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260203-W03242', 3232, 'CAJA DE SET BOOSTER INGLÉS (RESERVA) - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 4, 210.00, 840.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260204-W03277', 3232, 'CAJA DE SET BOOSTER INGLÉS (RESERVA) - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 210.00, 210.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260207-W03301', 3232, 'CAJA DE SET BOOSTER INGLÉS - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 210.00, 210.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260216-W03318', 3232, 'CAJA DE SET BOOSTER INGLÉS - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 210.00, 210.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260220-W03351', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 58.45, 58.45, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260220-W03351', 3136, 'TORTUGAS NINJA CAJA TEAM UP INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 58.45, 58.45, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260221-W03354', 3232, 'CAJA DE SET BOOSTER INGLÉS - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 206.00, 206.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260222-W03355', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 54.95, 54.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260222-W03356', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 54.95, 54.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260225-W03363', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 54.95, 54.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260227-W03388', 3205, 'BUNDLE GIFT INGLÉS (RESERVA) - MAGIC THE GATHERING', 2, 99.95, 199.90, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260227-W03388', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 59.95, 59.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260302-W03392', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 3, 53.00, 159.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260305-W03416', 3310, 'Blister 3 Héroes Ascendentes Gastly Español - Pokémon', 1, 21.45, 21.45, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260305-W03416', 3308, 'Blister 3 Héroes Ascendentes Charmander Español - Pokémon', 1, 21.45, 21.45, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260306-W03433', 3305, 'Blister 2 Héroes Ascendentes Larry Español - Pokémon', 1, 16.95, 16.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260306-W03433', 3380, 'Caja White Flare Japonés - Pokémon', 1, 104.95, 104.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260306-W03433', 3382, 'Caja Glory of the Team Rocket Japonés - Pokémon', 1, 114.95, 114.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260309-W03434', 3125, 'TORTUGAS NINJA TURTLE POWER! COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 59.95, 59.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260309-W03439', 3232, 'CAJA DE SET BOOSTER INGLÉS - MAGIC THE GATHERING - EL SEÑOR DE LOS ANILLOS', 1, 210.00, 210.00, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260405-W03465', 3199, 'COMMANDER CASE INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 209.95, 209.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260407-W03466', 3201, 'CAJA COLLECTOR INGLÉS (RESERVA) - MAGIC THE GATHERING', 2, 319.95, 639.90, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260407-W03466', 3188, 'SILVERQUILL INFLUENCE COMMANDER DECK INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 54.95, 54.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260407-W03467', 3205, 'BUNDLE GIFT INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 99.95, 99.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260407-W03468', 3205, 'BUNDLE GIFT INGLÉS (RESERVA) - MAGIC THE GATHERING', 1, 96.95, 96.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260412-W03519', 3245, 'FINAL FANTASY CAJA DE SOBRES DE JUEGO INGLÉS - MAGIC THE GATHERING', 1, 164.95, 164.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260416-W03573', 3384, 'Caja Terastal Festival EX Japonés - Pokémon', 1, 129.95, 129.95, 21.00, 'wp');
INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES ('TCG-260416-W03573', 3495, 'Caja SUPER ELECTRIC BREAKER - Koreano - Pokémon', 1, 54.95, 54.95, 21.00, 'wp');

COMMIT;

-- Importados: 41 items