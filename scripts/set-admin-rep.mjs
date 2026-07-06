#!/usr/bin/env node
/**
 * One-off: set reputation for admin profile(s).
 *
 *   node scripts/set-admin-rep.mjs 200
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvLocal();

const targetRep = Number(process.argv[2] ?? "200");
if (!Number.isFinite(targetRep) || targetRep < 0 || targetRep > 500) {
  console.error("Usage: node scripts/set-admin-rep.mjs <0-500>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: admins, error: fetchError } = await supabase
  .from("profiles")
  .select("id, username, reputation_score, party_host_unlocked, is_admin")
  .eq("is_admin", true);

if (fetchError) {
  console.error("Failed to load admins:", fetchError.message);
  process.exit(1);
}

if (!admins?.length) {
  console.error("No profile with is_admin = true found.");
  process.exit(1);
}

for (const admin of admins) {
  const partyHostUnlocked = targetRep >= 125 || admin.party_host_unlocked;
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      reputation_score: targetRep,
      party_host_unlocked: partyHostUnlocked,
    })
    .eq("id", admin.id);

  if (updateError) {
    console.error(`Failed to update ${admin.username ?? admin.id}:`, updateError.message);
    process.exit(1);
  }

  console.log(
    `Updated ${admin.username ?? admin.id}: ${admin.reputation_score} → ${targetRep}` +
      (partyHostUnlocked ? " (party host unlocked)" : "")
  );
}
