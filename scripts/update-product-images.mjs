import { readFileSync, writeFileSync } from 'fs';

// Map of actual slug (from products.ts) -> image path
const imageMap = {
  // Magic — sealed products (already updated but included for safety)
  'magic-bloomburrow-bundle': '/images/products/magic-bloomburrow-bundle.jpg',
  'magic-commander-deck-bloomburrow-peace-offering': '/images/products/magic-commander-deck-bloomburrow-peace-offering.jpg',
  'magic-commander-deck-bloomburrow-squirreled-away': '/images/products/magic-commander-deck-bloomburrow-squirreled-away.jpg',
  'magic-commander-deck-duskmourn-endless-punishment': '/images/products/magic-commander-deck-duskmourn-endless-punishment.jpg',

  // Magic — single cards (actual slugs)
  'magic-snapcaster-mage-isd': '/images/products/magic-snapcaster-mage-isd.jpg',
  'magic-force-of-will-ema': '/images/products/magic-force-of-will-ema.jpg',
  'magic-tarmogoyf-mm2': '/images/products/magic-tarmogoyf-mm2.jpg',
  'magic-counterspell-mh2': '/images/products/magic-counterspell-mh2.jpg',
  'magic-dockside-extortionist-c19': '/images/products/magic-dockside-extortionist-c19.jpg',
  'magic-the-one-ring-ltr': '/images/products/magic-the-one-ring-ltr.jpg',

  // Pokemon — ETB / accessories
  'pokemon-temporal-forces-etb': '/images/products/pokemon-temporal-forces-etb.png',
  'pokemon-obsidian-flames-etb': '/images/products/pokemon-obsidian-flames-etb.png',
  'pokemon-151-binder-collection': '/images/products/pokemon-151-binder-collection.png',

  // One Piece — booster boxes (actual slugs)
  'one-piece-op08-two-legends-booster-box': '/images/products/one-piece-op08-two-legends-booster-box.webp',
  'one-piece-op10-royal-blood-booster-box': '/images/products/one-piece-op10-royal-blood-booster-box.webp',
  'one-piece-op07-500-years-future-booster-box': '/images/products/one-piece-op07-500-years-future-booster-box.webp',
  'one-piece-op06-wings-captain-booster-box': '/images/products/one-piece-op06-wings-captain-booster-box.webp',
  'one-piece-op04-kingdoms-intrigue-booster-box': '/images/products/one-piece-op04-kingdoms-intrigue-booster-box.webp',
  'one-piece-st21-starter-deck-hody-jones': '/images/products/one-piece-st21-starter-deck-hody-jones.webp',
  'one-piece-st20-three-brothers': '/images/products/one-piece-st20-three-brothers.webp',
  'one-piece-st17-starter-deck-blue-marines': '/images/products/one-piece-st17-starter-deck-blue-marines.webp',
  'one-piece-st18-starter-deck-yellow-emperors': '/images/products/one-piece-st18-starter-deck-yellow-emperors.webp',
  'one-piece-gear5-luffy-op05-secret-rare': '/images/products/one-piece-gear5-luffy-op05-secret-rare.png',
  'one-piece-shanks-red-haired-special-art-op01': '/images/products/one-piece-shanks-red-haired-special-art-op01.png',
  'one-piece-double-pack-vol8': '/images/products/one-piece-double-pack-vol8.webp',
  'one-piece-playmat-oficial-straw-hat-pirates': '/images/products/one-piece-playmat-oficial-straw-hat-pirates.webp',
  'one-piece-sleeves-oficiales-70-luffy': '/images/products/one-piece-sleeves-oficiales-70-luffy.webp',

  // Riftbound (actual slugs)
  'riftbound-jinx-secret-rare-foundations': '/images/products/riftbound-jinx-secret-rare-foundations.png',
  'riftbound-ekko-rare-alt-art': '/images/products/riftbound-ekko-rare-alt-art.png',
  'riftbound-playmat-oficial-lol-champions': '/images/products/riftbound-playmat-oficial-lol-champions.png',

  // Lorcana (actual slugs)
  'lorcana-archazi-cards-dice-booster-box': '/images/products/lorcana-archazi-cards-dice-booster-box.webp',
  'lorcana-shimmering-skies-booster-box': '/images/products/lorcana-shimmering-skies-booster-box.webp',
  'lorcana-ursulas-return-booster-box': '/images/products/lorcana-ursulas-return-booster-box.webp',
  'lorcana-into-inklands-booster-box': '/images/products/lorcana-into-inklands-booster-box.webp',
  'lorcana-rise-floodborn-booster-box': '/images/products/lorcana-rise-floodborn-booster-box.webp',
  'lorcana-first-chapter-booster-box': '/images/products/lorcana-first-chapter-booster-box.webp',
  'lorcana-starter-deck-moana-maui': '/images/products/lorcana-starter-deck-moana-maui.webp',
  'lorcana-illumineers-trove-into-inklands': '/images/products/lorcana-illumineers-trove-into-inklands.webp',
  'lorcana-gift-set-sorcerer-mickey': '/images/products/lorcana-gift-set-sorcerer-mickey.webp',
  'lorcana-starter-deck-steel-ruby': '/images/products/lorcana-starter-deck-steel-ruby.webp',
  'lorcana-playmat-oficial-inklands': '/images/products/lorcana-playmat-oficial-inklands.webp',
  'lorcana-elsa-spirit-of-winter-enchanted': '/images/products/lorcana-elsa-spirit-of-winter-enchanted.png',
  'lorcana-mickey-brave-little-tailor-enchanted': '/images/products/lorcana-mickey-brave-little-tailor-enchanted.png',
  'lorcana-simba-future-king-enchanted': '/images/products/lorcana-simba-future-king-enchanted.png',
  'lorcana-stitch-rock-star-enchanted': '/images/products/lorcana-stitch-rock-star-enchanted.png',

  // Dragon Ball FW (actual slugs)
  'dragonball-fs04-starter-deck-son-goku': '/images/products/dragonball-fs04-starter-deck-son-goku.png',
  'dragonball-fs05-starter-deck-vegeta': '/images/products/dragonball-fs05-starter-deck-vegeta.png',
  'dragonball-frieza-scr-fb01': '/images/products/dragonball-frieza-scr-fb01.png',
  'dbs-fs06-starter-deck-frieza': '/images/products/dbs-fs06-starter-deck-frieza.png',
  'dbs-fs07-starter-deck-broly': '/images/products/dbs-fs07-starter-deck-broly.png',
  'dbs-goku-ultra-instinct-scr-fb03': '/images/products/dbs-goku-ultra-instinct-scr-fb03.png',
  'dbs-playmat-oficial-fb04': '/images/products/dbs-playmat-oficial-fb04.png',
  'dbs-sleeves-goku-vegeta-65': '/images/products/dbs-sleeves-goku-vegeta-65.png',

  // YuGiOh
  'yugioh-tin-pharaohs-gods-2024': '/images/products/yugioh-tin-pharaohs-gods-2024.jpg',
  'yugioh-tin-ancient-battles-2024': '/images/products/yugioh-tin-ancient-battles-2024.jpg',

  // Naruto (actual slugs)
  'naruto-konoha-shido-booster-pack': '/images/products/naruto-konoha-shido-booster-pack.png',
  'naruto-starter-pack-naruto-uzumaki': '/images/products/naruto-starter-pack-naruto-uzumaki.png',
  'naruto-starter-pack-sasuke-uchiha': '/images/products/naruto-starter-pack-sasuke-uchiha.png',
  'naruto-starter-pack-kakashi': '/images/products/naruto-starter-pack-kakashi.png',
  'naruto-mythos-gift-set-vol1': '/images/products/naruto-mythos-gift-set-vol1.png',
  'naruto-itachi-uchiha-special-art-rare': '/images/products/naruto-itachi-uchiha-special-art-rare.png',
  'naruto-mythos-playmat-oficial': '/images/products/naruto-mythos-playmat-oficial.png',
  'naruto-mythos-sleeves-oficiales-60': '/images/products/naruto-mythos-sleeves-oficiales-60.png',

  // Digimon (actual slugs)
  'digimon-bt18-booster-box': '/images/products/digimon-bt18-booster-box.png',
  'digimon-starter-deck-st16': '/images/products/digimon-starter-deck-st16.png',
  'digimon-starter-deck-st17': '/images/products/digimon-starter-deck-st17.png',
};

let content = readFileSync('src/data/products.ts', 'utf8');
let updatedCount = 0;

for (const [slug, imagePath] of Object.entries(imageMap)) {
  const slugPattern = `slug: "${slug}"`;
  const slugIdx = content.indexOf(slugPattern);
  if (slugIdx === -1) {
    console.log('NOT FOUND: ' + slug);
    continue;
  }

  // Find 'images: []' after this slug (within next 2000 chars)
  const afterSlug = content.slice(slugIdx, slugIdx + 2000);
  const emptyImagesIdx = afterSlug.indexOf('images: [],');
  if (emptyImagesIdx === -1) {
    // Already has an image
    console.log('Already has image: ' + slug);
    continue;
  }

  const absoluteIdx = slugIdx + emptyImagesIdx;
  const replacement = `images: ["${imagePath}"],`;
  content = content.slice(0, absoluteIdx) + replacement + content.slice(absoluteIdx + 'images: [],'.length);
  updatedCount++;
  console.log('Updated: ' + slug + ' -> ' + imagePath);
}

writeFileSync('src/data/products.ts', content);
console.log('\nTotal updated: ' + updatedCount);
