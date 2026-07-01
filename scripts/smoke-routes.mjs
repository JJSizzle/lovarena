#!/usr/bin/env node

const base = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const routes = [
  "/",
  "/login",
  "/chat",
  "/friends",
  "/party",
  "/settings",
  "/contact",
  "/api/health",
  "/api/stats/online",
];

let failed = 0;

for (const route of routes) {
  const url = `${base.replace(/\/$/, "")}${route}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? "OK" : "FAIL"} ${res.status} ${route}`);
    if (!ok) failed += 1;
  } catch (err) {
    console.log(`FAIL --- ${route} (${err instanceof Error ? err.message : err})`);
    failed += 1;
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} route(s) failed against ${base}`);
} else {
  console.log(`\nAll ${routes.length} routes OK against ${base}`);
}
