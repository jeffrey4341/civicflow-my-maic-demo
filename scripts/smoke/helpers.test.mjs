import assert from "node:assert/strict";
import test from "node:test";

import { isExpectedNextRequestAbort } from "./helpers.mjs";

function request(url, errorText = "net::ERR_ABORTED", method = "GET") {
  return {
    failure: () => ({ errorText }),
    method: () => method,
    url: () => url,
  };
}

test("accepts aborted Next navigation and HMR requests", () => {
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/officer?_rsc=abc")), true);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/webpack/webpack.hash.hot-update.js")), true);
});

test("accepts only aborted Cloudflare RUM beacons", () => {
  assert.equal(isExpectedNextRequestAbort(request("https://maic.aifather.dpdns.org/cdn-cgi/rum?", "net::ERR_ABORTED", "POST")), true);
  assert.equal(isExpectedNextRequestAbort(request("https://maic.aifather.dpdns.org/cdn-cgi/rum?", "net::ERR_ABORTED", "GET")), false);
  assert.equal(isExpectedNextRequestAbort(request("https://maic.aifather.dpdns.org/cdn-cgi/rum?", "net::ERR_FAILED", "POST")), false);
  assert.equal(isExpectedNextRequestAbort(request("https://maic.aifather.dpdns.org/api/rum", "net::ERR_ABORTED", "POST")), false);
});

test("rejects unrelated or non-aborted resource failures", () => {
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/api/cases")), false);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/chunks/app.js")), false);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/webpack/webpack.hash.hot-update.js", "net::ERR_FAILED")), false);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/webpack/webpack.hash.hot-update.js", "net::ERR_ABORTED", "POST")), false);
});
