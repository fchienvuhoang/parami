import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

async function worker() {
  const handlers = {}, stored = new Map();
  let requests = 0;
  const origin = "https://parami.example";
  const key = (input) => new URL(typeof input === "string" ? input : input.url, origin).href;
  const cache = {
    addAll: async (urls) => { for (const url of urls) stored.set(key(url), new Response("asset")); },
    put: async (url, response) => stored.set(key(url), response.clone()),
    match: async (url) => stored.get(key(url))?.clone(),
  };
  const self = { location: { origin }, DHAMMA_BUILD: "test-build", addEventListener: (name, fn) => handlers[name] = fn,
    skipWaiting: async () => {}, clients: { claim: async () => {} }, registration: { navigationPreload: { disable: async () => {} } } };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self, URL, Response, importScripts: () => {},
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async () => { requests++; return new Response('<html><link rel="stylesheet" href="/_next/static/build.css"><script src="/_next/static/build.js"></script>Loading</html>', { headers: { "content-type": "text/html" } }); },
  });
  let install;
  handlers.install({ waitUntil: (promise) => install = promise });
  await install;
  return {
    stored, requests: () => requests,
    fetch: async (path, mode = "navigate") => {
      let response;
      handlers.fetch({ request: { url: new URL(path, origin).href, method: "GET", mode }, respondWith: (promise) => response = promise });
      return response;
    },
  };
}

test("installed PWA opens root through cached launch HTML without a server round trip", async () => {
  const w = await worker(), baseline = w.requests();
  const root = await w.fetch("/?tab=transactions");
  assert.equal(root.status, 302);
  const launchUrl = new URL(root.headers.get("location"));
  assert.equal(launchUrl.pathname, "/khoi-dong");
  assert.equal(launchUrl.searchParams.get("next"), "/?tab=transactions");
  assert.match(await (await w.fetch("/khoi-dong")).text(), /Loading/);
  assert.equal(w.requests(), baseline);
  assert.equal(await (await w.fetch("/_next/static/build.js", "cors")).text(), "asset");
});

test("authenticated navigation and APIs cannot be served from the launch cache", async () => {
  const w = await worker();
  assert.equal(await w.fetch("/?_rsc=payload", "cors"), undefined);
  assert.equal(await w.fetch("/api/campaigns", "cors"), undefined);
  assert.equal(await w.fetch("/bao-cao?_rsc=payload", "cors"), undefined);
  await w.fetch("/bao-cao");
  assert.equal(w.stored.has("https://parami.example/bao-cao"), false);
  assert.equal(w.stored.has("https://parami.example/"), false);
});
