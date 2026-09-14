/**
 * electron-builder 25 does not apply a real ad-hoc signature when no
 * Developer ID cert is present (identity:null / auto-discovery off just skips
 * signing). On Apple Silicon, an unsigned .app is rejected by Gatekeeper as
 * "damaged and cannot be opened" — not the recoverable "unidentified developer"
 * dialog.
 *
 * Ad-hoc sign the outer .app here so unsigned CI/local builds get a proper
 * sealed-resources signature. Nested Electron frameworks keep their upstream
 * signatures; with hardenedRuntime:false that is fine. When CSC_LINK is set,
 * electron-builder's later sign step overwrites this with Developer ID.
 *
 * Do not use codesign --deep: it fails when FinderInfo / iCloud fileprovider
 * xattrs are present on nested bundles (common under ~/Documents).
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  execFileSync("xattr", ["-cr", appPath], { stdio: "inherit" });
  execFileSync(
    "codesign",
    ["--force", "--sign", "-", "--timestamp=none", appPath],
    { stdio: "inherit" }
  );
};
