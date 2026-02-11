#!/usr/bin/env bun
import path from "path"
import { $ } from "bun"
import { RUST_TARGET } from "./utils"

if (!RUST_TARGET) throw new Error("RUST_TARGET not set")

const key = Bun.env.TAURI_SIGNING_PRIVATE_KEY
const password = Bun.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
if (!key) throw new Error("TAURI_SIGNING_PRIVATE_KEY not set")

// signpath action outputs to workspace root
const signed = path.resolve("../../signed-windows-installer")
const bundle = path.resolve(`src-tauri/target/${RUST_TARGET}/release/bundle/nsis`)

const files = await Array.fromAsync(new Bun.Glob("*.exe").scan({ cwd: signed, absolute: true }))
if (files.length === 0) throw new Error(`No signed executables found in ${signed}`)

for (const src of files) {
  const name = path.basename(src)
  const dest = path.join(bundle, name)

  await Bun.write(dest, Bun.file(src))
  console.log(`Restored ${name}`)

  await Bun.file(`${dest}.sig`)
    .delete()
    .catch(() => {})

  console.log(`Re-signing ${name} for Tauri updater...`)
  await $`bunx tauri signer sign -k ${key} -p ${password ?? ""} ${dest}`
}

console.log("Signature files after re-signing:")
const sigs = await Array.fromAsync(new Bun.Glob("*.sig").scan({ cwd: bundle }))
for (const sig of sigs) console.log(`  - ${sig}`)
