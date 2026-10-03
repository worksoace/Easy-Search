const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");

const gzip = promisify(zlib.gzip);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

const DATA_DIR = path.join(__dirname, "..", "app", "data");

async function compressDir(dirPath) {
  const entries = await readdir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      await compressDir(fullPath);
    } else if (s.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (ext === ".json" || ext === ".htm" || ext === ".html") {
        if (entry.endsWith(".gz")) continue;

        const content = fs.readFileSync(fullPath);
        const compressed = await gzip(content);
        fs.writeFileSync(fullPath + ".gz", compressed);

        // Remove the original uncompressed file
        await unlink(fullPath);
        console.log(`Compressed and removed: ${entry}`);
      }
    }
  }
}

async function run() {
  try {
    console.log(`Starting compression in ${DATA_DIR}...`);
    await compressDir(DATA_DIR);
    console.log("Compression completed successfully!");
  } catch (error) {
    console.error("Error during compression:", error);
    process.exit(1);
  }
}

run();
