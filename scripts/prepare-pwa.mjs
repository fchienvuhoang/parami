import { writeFileSync } from "node:fs";

// Imported service-worker scripts participate in update checks. Give each build
// a new launch cache so its HTML and Next.js runtime always belong together.
const version = `${process.env.VERCEL_GIT_COMMIT_SHA || "local"}-${Date.now().toString(36)}`;
writeFileSync(new URL("../public/pwa-version.js", import.meta.url), `self.DHAMMA_BUILD = ${JSON.stringify(version)};\n`);
