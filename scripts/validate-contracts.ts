#!/usr/bin/env tsx
import { validateAllFixtures } from "../src/shared/contracts/validator.js";

const results = validateAllFixtures();

let failed = 0;
for (const r of results) {
  if (r.valid) {
    console.log(`✓ ${r.contractId}`);
  } else {
    failed++;
    console.error(`✗ ${r.contractId}`);
    for (const e of r.errors) {
      console.error(`  - ${e}`);
    }
  }
}

if (results.length === 0) {
  console.error("No contract schemas found in contracts/");
  process.exit(1);
}

process.exit(failed > 0 ? 1 : 0);
