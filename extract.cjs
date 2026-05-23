const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync } = fs;
const { createGunzip } = require("zlib");
const { pipeline } = require("stream/promises");

const pkgs = [
  { tgz: "tmp_pkgs/jsdom2.tgz", name: "jsdom" },
  { tgz: "tmp_pkgs/vitest2.tgz", name: "vitest" },
  { tgz: "tmp_pkgs/rtl-react2.tgz", name: "@testing-library/react" },
  { tgz: "tmp_pkgs/rtl-dom2.tgz", name: "@testing-library/dom" },
  { tgz: "tmp_pkgs/rtl-jest-dom2.tgz", name: "@testing-library/jest-dom" },
];

(async () => {
  for (const pkg of pkgs) {
    const dir = path.join("node_modules", pkg.name);
    const tmpDir = dir + "_tmp";
    mkdirSync(tmpDir, { recursive: true });

    // gunzip
    const tarFile = pkg.tgz + ".tar";
    await pipeline(createReadStream(pkg.tgz), createGunzip(), createWriteStream(tarFile));
    console.log("Decompressed", pkg.name);

    // untar using npx tar (bundled with npm)
    try {
      execSync("npx tar xf \"" + tarFile + "\" -C \"" + tmpDir + "\"", { stdio: "pipe" });
    } catch (e) {
      console.log("npx tar failed, trying npm tar...");
      try {
        const tarBin = path.join("node_modules", "npm", "node_modules", "tar", "lib", "cli.js");
        if (existsSync(tarBin)) {
          execSync("node \"" + tarBin + "\" xf \"" + tarFile + "\" -C \"" + tmpDir + "\"", { stdio: "pipe" });
        } else {
          throw new Error("no tar binary found");
        }
      } catch (e2) {
        console.log("All extraction failed for", pkg.name, e2.message);
        continue;
      }
    }

    // Move package/ contents
    const innerPkg = path.join(tmpDir, "package");
    if (existsSync(innerPkg)) {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      renameSync(innerPkg, dir);
      rmSync(tmpDir, { recursive: true, force: true });
    } else {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      renameSync(tmpDir, dir);
    }
    unlinkSync(tarFile);
    console.log("Extracted", pkg.name);
  }
  console.log("All done!");
})();
