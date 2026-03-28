#!/usr/bin/env node
/**
 * TCG Academy — Restore script
 * Lists available backups and restores the one chosen by the user.
 *
 * Usage:
 *   node scripts/restore.js           — interactive list
 *   node scripts/restore.js <index>   — restore by index (1-based)
 */

const fs = require("fs")
const path = require("path")
const readline = require("readline")

const ROOT = path.resolve(__dirname, "..")
const BACKUP_DIR = path.join(ROOT, "backups")
const SOURCES = ["src", "public"]

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDirSync(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}

function doRestore(backupName) {
  const backupPath = path.join(BACKUP_DIR, backupName)
  if (!fs.existsSync(backupPath)) {
    console.error(`Error: No existe el backup "${backupName}"`)
    process.exit(1)
  }
  for (const src of SOURCES) {
    const srcPath = path.join(backupPath, src)
    if (!fs.existsSync(srcPath)) continue
    const destPath = path.join(ROOT, src)
    // Remove current and replace
    fs.rmSync(destPath, { recursive: true, force: true })
    copyDirSync(srcPath, destPath)
    console.log(`  ✓ ${src}/ restaurado`)
  }
  console.log(`\n✅ Restauracion completada desde: ${backupName}`)
}

if (!fs.existsSync(BACKUP_DIR)) {
  console.log("No hay backups disponibles todavia. Ejecuta: npm run backup")
  process.exit(0)
}

const backups = fs.readdirSync(BACKUP_DIR)
  .filter((d) => fs.statSync(path.join(BACKUP_DIR, d)).isDirectory())
  .sort()
  .reverse()

if (backups.length === 0) {
  console.log("No hay backups disponibles. Ejecuta: npm run backup")
  process.exit(0)
}

console.log("\n📦 Backups disponibles:\n")
backups.forEach((b, i) => console.log(`  [${i + 1}] ${b}`))
console.log("")

const argIndex = parseInt(process.argv[2])
if (!isNaN(argIndex) && argIndex >= 1 && argIndex <= backups.length) {
  doRestore(backups[argIndex - 1])
  process.exit(0)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question("¿Qué backup quieres restaurar? (numero): ", (answer) => {
  rl.close()
  const idx = parseInt(answer) - 1
  if (isNaN(idx) || idx < 0 || idx >= backups.length) {
    console.error("Numero invalido")
    process.exit(1)
  }
  doRestore(backups[idx])
})
