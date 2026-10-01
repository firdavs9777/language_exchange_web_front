import fs from "fs";
import path from "path";

/**
 * The two files iOS and Android fetch to decide whether the app may claim
 * banatalk.com links.
 *
 * They shipped to production with `TODO_` placeholders in both, which means
 * verification failed and every link opened the browser — the app gateway was
 * inert from the start. These assertions stop a placeholder reaching the build
 * again, and keep the paths in step with what the app actually parses.
 */
const wellKnown = path.resolve(__dirname, "../../public/.well-known");
const aasa = JSON.parse(
  fs.readFileSync(path.join(wellKnown, "apple-app-site-association"), "utf8")
);
const assetLinks = JSON.parse(
  fs.readFileSync(path.join(wellKnown, "assetlinks.json"), "utf8")
);

const detail = aasa.applinks.details[0];

describe("apple-app-site-association", () => {
  it("names a real team and the app's own bundle id", () => {
    const appId: string = detail.appIDs[0];
    expect(appId).not.toContain("TODO");
    // TEAMID.bundle — the bundle half must match ios/Runner.xcodeproj.
    expect(appId).toMatch(/^[A-Z0-9]{10}\.com\.bananatalk\.bananatalkApp$/);
  });

  it("claims every path type the app can route", () => {
    const paths = detail.components.map((c: any) => c["/"]).sort();
    expect(paths).toEqual(["/chat/*", "/community/*", "/moment/*", "/profile/*"]);
  });
});

describe("assetlinks.json", () => {
  it("names the app's own package", () => {
    expect(assetLinks[0].target.package_name).toBe("com.bananatalk.app");
  });

  // PENDING until the two fingerprints are pasted in. Android App Links are
  // dead until then: Google's verifier fetches this file and finds TODO_ where
  // a SHA-256 should be, so banatalk.com links open the browser, not the app.
  //
  // To enable: replace both strings in public/.well-known/assetlinks.json and
  // change this to `it(`.
  //   upload key -> keytool -list -v -keystore <upload.jks> -alias <alias>
  //   Play key   -> Play Console > Test and release > App integrity > App signing
  it.skip("carries both signing fingerprints, with no placeholder left", () => {
    const prints: string[] = assetLinks[0].target.sha256_cert_fingerprints;
    // Two: Google re-signs for the Play Store, so an installed app carries the
    // Play fingerprint while an internal or sideloaded build carries the
    // upload one. Listing only one breaks links for that install source.
    expect(prints).toHaveLength(2);
    prints.forEach((print) => {
      expect(print).not.toContain("TODO");
      expect(print).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i);
    });
  });
});
