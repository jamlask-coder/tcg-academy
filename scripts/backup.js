#!/usr/bin/env node
/**
 * TCG Academy — Backup script
 * Copies src/ and public/ to backups/<timestamp>/
 * Keeps max 20 backups, deletes the oldest when exceeded.
 *
 * Usage:
 *   node scripts/backup.js          — manual one-shot backup
 *   node scripts/backup.js --auto   — runs every 15 minutes until Ctrl+C
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const BACKUP_DIR = path.join(ROOT, "backups")
const SOURCES = ["src", "public"]
const MAX_BACKUPS = 20
const INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

function pad(n) {
  return String(n).padStart(2, "0")
}

function getTimestamp() {
  const d = new Date()
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  )
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function doBackup() {
  const timestamp = getTimestamp()
  const dest = path.join(BACKUP_DIR, timestamp)
  fs.mkdirSync(dest, { recursive: true })

  let fileCount = 0
  for (const src of SOURCES) {
    const srcPath = path.join(ROOT, src)
    copyDirSync(srcPath, path.join(dest, src))
    // Count files
    function countFiles(dir) {
      if (!fs.existsSync(dir)) return
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) countFiles(path.join(dir, e.name))
        else fileCount++
      }
    }
    countFiles(path.join(dest, src))
  }

  console.log(`✓ Backup creado: backups/${timestamp}/ (${fileCount} archivos)`)

  // Prune old backups
  const existing = fs.readdirSync(BACKUP_DIR)
    .filter((d) => fs.statSync(path.join(BACKUP_DIR, d)).isDirectory())
    .sort()

  while (existing.length > MAX_BACKUPS) {
    const oldest = existing.shift()
    const oldPath = path.join(BACKUP_DIR, oldest)
    fs.rmSync(oldPath, { recursive: true, force: true })
    console.log(`  🗑  Backup antiguo eliminado: ${oldest}`)
  }
}

const isAuto = process.argv.includes("--auto")

if (isAuto) {
  console.log(`🔄 Backup automático activo — cada ${INTERVAL_MS / 60000} minutos. Ctrl+C para detener.\n`)
  doBackup()
  setInterval(doBackup, INTERVAL_MS)
} else {
  doBackup()
}
