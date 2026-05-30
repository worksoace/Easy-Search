const fs = require("fs/promises");
const path = require("path");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const primaryIcon = path.join(rootDir, "appicon.png");
  const lightIcon = path.join(rootDir, "appiconlight.png");
  const sourceIcon = await fs
    .access(primaryIcon)
    .then(() => primaryIcon)
    .catch(() => lightIcon);
  const buildOutputDir = path.join(rootDir, "build");
  const appAssetsDir = path.join(rootDir, "app", "assets");
  const buildOutputIcon = path.join(buildOutputDir, "icon.ico");
  const appOutputIcon = path.join(appAssetsDir, "icon.ico");

  await fs.mkdir(buildOutputDir, { recursive: true });
  await fs.mkdir(appAssetsDir, { recursive: true });
  const iconBuffer = await pngToIco(sourceIcon);
  await fs.writeFile(buildOutputIcon, iconBuffer);
  await fs.writeFile(appOutputIcon, iconBuffer);

  console.log(`Created ${buildOutputIcon}`);
  console.log(`Created ${appOutputIcon}`);
}

main().catch((error) => {
  console.error("Unable to build icon:", error);
  process.exit(1);
});
