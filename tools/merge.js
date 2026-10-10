/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

// Resolve paths relative to this script directory (tools/)
const ROOT_DIR = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.resolve(ROOT_DIR, "supabase", "schema");
const OUTPUT_FILE = path.resolve(ROOT_DIR, "supabase", "schema.sql");

/**
 * Recursively scans a directory and collects all `.sql` files in natural alphanumeric order.
 * @param {string} dir
 * @returns {string[]} Sorted array of absolute file paths
 */
function getSqlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Natural alphanumeric sort (orders 00_, 01_, 02_ correctly)
  entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getSqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".sql")) {
      results.push(fullPath);
    }
  }

  return results;
}

function runMerge() {
  console.log("\n========================================================");
  console.log("  ⚡ Forex Pulse - SQL Schema Migration Merger");
  console.log("========================================================\n");

  if (!fs.existsSync(SCHEMA_DIR)) {
    console.error(`[ERROR] Schema directory not found at: ${SCHEMA_DIR}`);
    process.exit(1);
  }

  console.log(`[1/3] Scanning schema folder: ${path.relative(ROOT_DIR, SCHEMA_DIR)}`);
  const sqlFiles = getSqlFiles(SCHEMA_DIR);

  if (sqlFiles.length === 0) {
    console.warn("[WARN] No .sql files discovered in schema directory.");
    return;
  }

  console.log(`[2/3] Found ${sqlFiles.length} modular SQL files in dependency order:\n`);

  let mergedContent = "";

  // Master Banner Header
  mergedContent += `-- ============================================================================\n`;
  mergedContent += `-- FOREX PULSE - CONSOLIDATED DATABASE SCHEMA & MIGRATIONS\n`;
  mergedContent += `-- Auto-generated via: tools/merge.js\n`;
  mergedContent += `-- Generated at:       ${new Date().toISOString()}\n`;
  mergedContent += `-- Total Scripts:      ${sqlFiles.length}\n`;
  mergedContent += `-- ============================================================================\n\n`;

  sqlFiles.forEach((filePath, idx) => {
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
    console.log(`  [${String(idx + 1).padStart(2, "0")}/${sqlFiles.length}] ${relativePath}`);

    const fileContent = fs.readFileSync(filePath, "utf-8").trim();

    mergedContent += `-- ============================================================================\n`;
    mergedContent += `-- SECTION [${idx + 1}]: ${relativePath}\n`;
    mergedContent += `-- ============================================================================\n\n`;
    mergedContent += fileContent;
    mergedContent += "\n\n";
  });

  console.log(`\n[3/3] Writing consolidated script...`);
  
  // Ensure destination directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, mergedContent.trim() + "\n", "utf-8");

  const lineCount = mergedContent.split("\n").length;
  const sizeKb = (Buffer.byteLength(mergedContent, "utf-8") / 1024).toFixed(2);

  console.log("\n========================================================");
  console.log("  ✅ Merge Completed Successfully!");
  console.log(`  📁 Output:      ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  console.log(`  📄 Total Lines: ${lineCount}`);
  console.log(`  📦 File Size:   ${sizeKb} KB`);
  console.log("========================================================\n");
}

runMerge();