const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const file = path.join(__dirname, "..", "app", "data", "bible-versions.json.gz");

try {
  console.log(`Reading ${file}...`);
  const compressed = fs.readFileSync(file);
  const jsonText = zlib.gunzipSync(compressed).toString("utf8");
  const data = JSON.parse(jsonText);

  // Check if NKJV is already added
  const nkjvExists = data.versions.some(v => v.code === "nkjv");
  if (nkjvExists) {
    console.log("NKJV is already present in bible-versions.json.gz.");
    process.exit(0);
  }

  // Add NKJV
  console.log("Adding NKJV version entry...");
  data.versions.push({
    code: "nkjv",
    label: "New King James Version",
    shortLabel: "NKJV",
    notes: "New King James Version (NKJV) translation for offline study.",
    source: "nkjv.json.gz (local)",
    publicDomain: false
  });

  const updatedJsonText = JSON.stringify(data, null, 2);
  const updatedCompressed = zlib.gzipSync(Buffer.from(updatedJsonText, "utf8"));
  fs.writeFileSync(file, updatedCompressed);
  console.log("Successfully updated bible-versions.json.gz!");
} catch (error) {
  console.error("Failed to add NKJV:", error);
  process.exit(1);
}
