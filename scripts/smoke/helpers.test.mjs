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

test("rejects unrelated or non-aborted resource failures", () => {
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/api/cases")), false);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/chunks/app.js")), false);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/webpack/webpack.hash.hot-update.js", "net::ERR_FAILED")), false);
  assert.equal(isExpectedNextRequestAbort(request("http://127.0.0.1:3012/_next/static/webpack/webpack.hash.hot-update.js", "net::ERR_ABORTED", "POST")), false);
});
