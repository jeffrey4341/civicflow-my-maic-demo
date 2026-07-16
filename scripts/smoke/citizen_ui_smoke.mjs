import { chromium } from "playwright";
import {
  assert,
  assertPortAvailable,
  isExpectedNextRequestAbort,
  matchesResourceConsole,
  startNextServer,
  stopServer,
  waitForServer,
  watchBrowser,
} from "./helpers.mjs";

const port = Number(process.env.CIVICFLOW_CITIZEN_SMOKE_PORT || 3013);
const baseUrl = process.env.CIVICFLOW_CITIZEN_BASE_URL || `http://127.0.0.1:${port}`;
const startServer = !process.env.CIVICFLOW_CITIZEN_BASE_URL;
const languageNames = { en: "English", ms: "Bahasa Melayu", zh: "中文", ta: "தமிழ்" };
const localizedErrors = {
  en: {
    review: "We could not review this request. Please try again.",
    synthetic: "Use synthetic example details only. Do not enter real personal data.",
  },
  ms: {
    review: "Kami tidak dapat menyemak permintaan ini. Sila cuba lagi.",
    synthetic: "Gunakan butiran contoh sintetik sahaja. Jangan masukkan data peribadi sebenar.",
  },
  zh: {
    review: "我们无法检查此请求。请重试。",
    synthetic: "请仅使用合成示例资料。请勿输入真实个人资料。",
  },
  ta: {
    review: "இந்த கோரிக்கையைச் சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    synthetic: "செயற்கையான எடுத்துக்காட்டு விவரங்களை மட்டும் பயன்படுத்தவும். உண்மையான தனிப்பட்ட தரவை உள்ளிட வேண்டாம்.",
  },
};
const localizedBusinessRequests = {
  en: "I need a business licence for a synthetic food stall.",
  ms: "Saya mahu memohon lesen gerai makanan sintetik.",
  zh: "我要申请合成示例小食档执照，需要什么文件？",
  ta: "செயற்கை உணவுக் கடைக்கு வணிக உரிமம் தேவை.",
};
const notFoundCopy = {
  en: { title: "Case not found", action: "Back to case tracking" },
  ms: { title: "Kes tidak ditemui", action: "Kembali ke penjejakan kes" },
  zh: { title: "找不到个案", action: "返回个案查询" },
  ta: { title: "வழக்கு கிடைக்கவில்லை", action: "வழக்குக் கண்காணிப்பிற்குத் திரும்பவும்" },
};

async function main() {
  let server = null;
  let serverReady = null;
  let getLaunchError = () => null;
  if (startServer) {
    await assertPortAvailable(port);
    ({ server, ready: serverReady, getLaunchError } = startNextServer("dev", port));
  }

  let browser = null;
  try {
    await waitForServer({ baseUrl, pathname: "/m", server, ready: serverReady, getLaunchError, label: "Citizen smoke server" });
    await fetch(`${baseUrl}/api/reset`, { method: "POST" });
    const localizedTrackingHtml = await (await fetch(`${baseUrl}/m?view=track&lang=zh`)).text();
    const newPanelTag = localizedTrackingHtml.match(/<div[^>]*id="citizen-panel-new"[^>]*>/)?.[0] ?? "";
    const trackPanelTag = localizedTrackingHtml.match(/<div[^>]*id="citizen-panel-track"[^>]*>/)?.[0] ?? "";
    assert(!localizedTrackingHtml.includes("<!--$?-->") && !localizedTrackingHtml.includes('<template id="B:0"'), "Citizen server HTML leaves the primary content behind a streamed Suspense fallback");
    assert(localizedTrackingHtml.includes("查询个案"), "Citizen server HTML omits localized content before hydration");
    assert(/\shidden(?:="")?/.test(newPanelTag) && !/\shidden(?:="")?/.test(trackPanelTag), "Citizen server HTML does not preserve ?view=track before hydration");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let expectedApiFailure = null;
    let expectNotFound = false;
    const assertBrowserHealthy = watchBrowser(page, {
      baseUrl,
      isExpectedConsoleMessage: (message) => {
        if (expectedApiFailure && matchesResourceConsole(message, {
          baseUrl,
          pathname: expectedApiFailure.pathname,
          status: expectedApiFailure.status,
          statusText: expectedApiFailure.statusText,
        })) return true;

        if (!expectNotFound) return false;
        let pathname;
        try {
          pathname = new URL(message.location().url).pathname;
        } catch {
          return false;
        }
        const expectedPath = pathname === "/not-a-real-page" || pathname.startsWith("/m/cases/CF-NOTREAL");
        return expectedPath && matchesResourceConsole(message, {
          baseUrl,
          pathname,
          status: 404,
          statusText: "Not Found",
        });
      },
      isExpectedRequestFailure: isExpectedNextRequestAbort,
      isExpectedResponse: (response) => {
        const url = new URL(response.url());
        const expectedInvalidPage = expectNotFound
          && response.status() === 404
          && (url.pathname === "/not-a-real-page" || url.pathname.startsWith("/m/cases/CF-NOTREAL"));
        const exactExpectedApiFailure = expectedApiFailure
          && response.request().method() === expectedApiFailure.method
          && response.status() === expectedApiFailure.status
          && url.pathname === expectedApiFailure.pathname;
        return expectedInvalidPage || exactExpectedApiFailure;
      },
    });

    async function withExpectedApiFailure({ method, pathname, status, statusText, body }, action) {
      const pattern = `**${pathname}`;
      const handler = (route) => route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      await page.route(pattern, handler);
      expectedApiFailure = { method, pathname, status, statusText };
      const expectedConsole = page.waitForEvent("console", {
        predicate: (message) => matchesResourceConsole(message, {
          baseUrl,
          pathname,
          status,
          statusText,
        }),
        timeout: 5_000,
      });
      try {
        await Promise.all([action(), expectedConsole]);
        assertBrowserHealthy();
      } finally {
        expectedApiFailure = null;
        await page.unroute(pattern, handler);
      }
    }

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /citizen services/i }).waitFor();
    await page.getByRole("link", { name: /officer workspace/i }).waitFor();

    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content");
    assert(!/maximum-scale|user-scalable\s*=\s*no/i.test(viewportMeta ?? ""), "citizen viewport disables zoom");
    const newRequestTab = page.getByRole("tab", { name: /new request/i });
    const trackCaseTab = page.getByRole("tab", { name: /track a case/i });
    await newRequestTab.waitFor();
    await trackCaseTab.waitFor();
    const skipLink = page.getByRole("link", { name: "Skip to main content", exact: true });
    assert(await skipLink.getAttribute("href") === "#main-content", "Citizen skip link does not target the main content");
    const brandBox = await page.getByRole("link", { name: /CivicFlow MY/ }).boundingBox();
    assert((brandBox?.height ?? 0) >= 44, `Citizen brand target is shorter than 44px (${brandBox?.height ?? 0}px)`);
    assert(await page.locator(".border-l-4").count() === 0, "Citizen home still renders a decorative border-l-4 callout");
    assert(await newRequestTab.getAttribute("aria-controls") === "citizen-panel-new", "New request tab is not associated with its panel");
    assert(await trackCaseTab.getAttribute("aria-controls") === "citizen-panel-track", "Track tab is not associated with its panel");
    const newRequestPanel = page.locator("#citizen-panel-new");
    const trackCasePanel = page.locator("#citizen-panel-track");
    assert(await newRequestPanel.count() === 1 && await trackCasePanel.count() === 1, "Both tab panels must remain associated in the DOM");
    assert(await newRequestPanel.isVisible() && await trackCasePanel.isHidden(), "New request panel is not the initial active panel");
    await newRequestTab.focus();
    await newRequestTab.press("ArrowRight");
    assert(await trackCaseTab.getAttribute("aria-selected") === "true", "ArrowRight did not activate the Track tab");
    assert(await trackCaseTab.evaluate((element) => document.activeElement === element), "ArrowRight did not move focus to the Track tab");
    assert(await trackCasePanel.isVisible() && await newRequestPanel.isHidden(), "Track panel did not become the active panel");
    await trackCaseTab.press("Home");
    assert(await newRequestTab.getAttribute("aria-selected") === "true", "Home did not activate the first tab");
    await newRequestTab.press("End");
    assert(await trackCaseTab.getAttribute("aria-selected") === "true", "End did not activate the last tab");
    await trackCaseTab.press("ArrowLeft");
    assert(await newRequestTab.getAttribute("aria-selected") === "true", "ArrowLeft did not return to the New request tab");
    assert((await page.locator('a[href^="/officer"]').count()) === 0, "citizen route leaks an officer link");
    assert((await page.getByText(/mock photo|attach mock/i).count()) === 0, "citizen route exposes fake media controls");

    await withExpectedApiFailure({
      method: "POST",
      pathname: "/api/triage",
      status: 500,
      statusText: "Internal Server Error",
      body: { error: "Raw English API failure" },
    }, async () => {
      for (const [locale, languageName] of Object.entries(languageNames)) {
        await page.getByRole("button", { name: languageName, exact: true }).click();
        await page.locator("#citizen-request").fill("Synthetic request used to verify localized errors.");
        await page.locator('#citizen-panel-new form button[type="submit"]').click();
        await page.getByRole("alert").filter({ hasText: localizedErrors[locale].review }).waitFor();
        assert(await page.getByText("Raw English API failure", { exact: true }).count() === 0, `${locale} citizen UI exposed a raw triage API error`);
      }
    });

    for (const locale of Object.keys(languageNames)) {
      await page.goto(`${baseUrl}/m?lang=${locale}`, { waitUntil: "networkidle" });
      await page.locator("#citizen-request").fill(localizedBusinessRequests[locale]);
      await page.locator('#citizen-panel-new form button[type="submit"]').click();
      await page.locator('#citizen-panel-new h2[tabindex="-1"]').waitFor();
      const submitButton = page.locator('#citizen-panel-new section > button[type="button"]').last();
      if (await submitButton.isDisabled()) {
        const keepSelectedLanguage = page.locator('#citizen-panel-new section button[aria-pressed]').first();
        assert(await keepSelectedLanguage.count() === 1, `${locale} review could not confirm the selected language`);
        await keepSelectedLanguage.click();
      }
      await withExpectedApiFailure({
        method: "POST",
        pathname: "/api/cases",
        status: 422,
        statusText: "Unprocessable Entity",
        body: { code: "synthetic_data_only", error: "Use synthetic example details only." },
      }, async () => {
        await submitButton.click();
        const alert = page.getByRole("alert").filter({ hasText: localizedErrors[locale].synthetic });
        await alert.waitFor();
        assert(await alert.innerText() === localizedErrors[locale].synthetic, `${locale} submit failure was not the exact localized synthetic-data message`);
        assert(await page.getByText("Use synthetic example details only.", { exact: true }).count() === 0, `${locale} submit exposed the raw English API message`);
      });
    }

    for (const locale of Object.keys(languageNames)) {
      const fixtureResponse = await page.request.post(`${baseUrl}/api/cases`, {
        data: { text: localizedBusinessRequests[locale], language: locale, answers: {} },
      });
      assert(fixtureResponse.status() === 201, `${locale} follow-up fixture creation returned ${fixtureResponse.status()}`);
      const fixture = await fixtureResponse.json();
      assert(fixture.status === "needs_info" && fixture.missing_info.some((item) => item.required && !item.satisfied), `${locale} follow-up fixture is not awaiting required details`);
      await page.goto(`${baseUrl}/m/cases/${fixture.citizen_ref}`, { waitUntil: "networkidle" });
      assert(await page.locator(`main [lang="${locale}"]`).count() === 1, `${locale} follow-up page does not declare its language`);
      const inputs = page.locator('form input[id^="follow-up-"]');
      const inputCount = await inputs.count();
      assert(inputCount > 0, `${locale} follow-up fixture rendered no required fields`);
      for (let index = 0; index < inputCount; index += 1) {
        await inputs.nth(index).fill(`Synthetic detail ${index + 1}`);
      }
      const pathname = `/api/cases/${fixture.citizen_ref}`;
      await withExpectedApiFailure({
        method: "PATCH",
        pathname,
        status: 422,
        statusText: "Unprocessable Entity",
        body: { code: "synthetic_data_only", error: "Use synthetic example details only." },
      }, async () => {
        await page.locator('form button[type="submit"]').click();
        const alert = page.getByRole("alert").filter({ hasText: localizedErrors[locale].synthetic });
        await alert.waitFor();
        assert(await alert.innerText() === localizedErrors[locale].synthetic, `${locale} follow-up failure was not the exact localized synthetic-data message`);
        assert(await page.getByText("Use synthetic example details only.", { exact: true }).count() === 0, `${locale} follow-up exposed the raw English API message`);
      });
    }

    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "English", exact: true }).click();

    await page.setViewportSize({ width: 320, height: 700 });
    const composeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(composeOverflow <= 1, `320px compose view overflows horizontally by ${composeOverflow}px`);
    await page.getByRole("button", { name: /english/i }).click();
    await page.getByLabel(/describe your request/i).fill("我要申请小食档执照，需要什么文件？");
    await page.getByRole("button", { name: /review request/i }).click();
    const reviewHeading = page.getByRole("heading", { level: 2, name: /review your request/i });
    await reviewHeading.waitFor();
    assert(await reviewHeading.evaluate((element) => document.activeElement === element), "Review heading did not receive focus after analysis");
    assert(await reviewHeading.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    }), "Focused review heading has no visible focus indicator");
    await page.getByText(/we detected.*中文/i).waitFor();
    const reviewOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(reviewOverflow <= 1, `320px language review overflows horizontally by ${reviewOverflow}px`);
    await trackCaseTab.click();
    await newRequestTab.click();
    assert(await newRequestTab.evaluate((element) => document.activeElement === element), "Returning to the review tab moved focus away from the selected tab");
    await page.getByRole("button", { name: /keep english/i }).click();
    await page.getByRole("button", { name: /submit request/i }).click();
    await page.waitForURL(/\/m\/cases\/CF-/);
    await page.getByRole("heading", { level: 1, name: /information needed/i }).waitFor();
    const followUpOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(followUpOverflow <= 1, `320px needs-info follow-up overflows horizontally by ${followUpOverflow}px`);

    await page.getByLabel(/where will the business operate/i).fill("Synthetic Market A");
    await page.getByLabel(/what type of business/i).fill("Synthetic food stall");
    await page.getByLabel(/what are.*intended operating hours/i).fill("09:00 to 17:00");
    await page.getByRole("button", { name: /send details/i }).click();
    const savedStatus = page.getByRole("status").filter({ hasText: /details saved.*status.*updated/i });
    await savedStatus.waitFor();
    assert(await savedStatus.evaluate((element) => document.activeElement === element), "Saved-details confirmation did not receive focus");
    await page.getByText(/assigned to/i).waitFor();
    assert(await page.locator(".border-l-4").count() === 0, "Citizen status still renders a decorative border-l-4 callout");
    assert((await page.locator('a[href^="/officer"]').count()) === 0, "tracking route leaks an officer link");

    const citizenRef = decodeURIComponent(new URL(page.url()).pathname.split("/").filter(Boolean).at(-1));
    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(homeOverflow <= 1, `320px citizen home overflows horizontally by ${homeOverflow}px`);
    await page.getByRole("tab", { name: /track a case/i }).click();
    await page.getByRole("tabpanel", { name: /track a case/i }).waitFor();
    await page.getByLabel(/tracking code/i).fill(citizenRef.toLowerCase());
    await Promise.all([
      page.waitForURL((url) => url.origin === baseUrl && url.pathname === `/m/cases/${citizenRef}` && url.searchParams.get("lang") === "en"),
      page.getByRole("button", { name: /view case status/i }).click(),
    ]);
    await page.getByText(citizenRef, { exact: true }).first().waitFor();
    assert((await page.locator('a[href^="/officer"]').count()) === 0, "Track flow exposes an officer link");
    const trackingOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(trackingOverflow <= 1, `320px tracked case overflows horizontally by ${trackingOverflow}px`);

    const languagePartsResponse = await page.request.post(`${baseUrl}/api/cases`, {
      data: {
        text: localizedBusinessRequests.zh,
        language: "zh",
        location_text: "Synthetic Market A",
        answers: {
          location: "Synthetic Market A",
          business_type: "Synthetic food stall",
          operating_hours: "09:00 to 17:00",
        },
      },
    });
    assert(languagePartsResponse.status() === 201, `Language-parts fixture creation returned ${languagePartsResponse.status()}`);
    const languagePartsCase = await languagePartsResponse.json();
    assert(languagePartsCase.status === "routed" && languagePartsCase.citations.length > 0 && languagePartsCase.reply_draft, "Language-parts fixture is not a cited routed case with a reply draft");
    const reviewResponse = await page.request.post(`${baseUrl}/api/cases/${languagePartsCase.case_id}/review`, {
      data: {
        triage_revision: languagePartsCase.triage_revision,
        officer: "Officer Aishah (demo)",
        note: "Reviewed against synthetic policy evidence.",
        citizen_language: "zh",
        category: languagePartsCase.category,
        routing: { department: languagePartsCase.department, unit: languagePartsCase.unit },
        citation_keys: languagePartsCase.citations.map(({ source_doc, section }) => ({ source_doc, section })),
        reply_body: languagePartsCase.reply_draft.body,
        reply_body_en: languagePartsCase.reply_draft.body_en,
        resolution: "proceed",
      },
    });
    assert(reviewResponse.status() === 200, `Language-parts officer review returned ${reviewResponse.status()}`);
    const reviewedLanguagePartsCase = await reviewResponse.json();
    const releaseResponse = await page.request.post(`${baseUrl}/api/cases/${languagePartsCase.case_id}/reply`, {
      data: { triage_revision: reviewedLanguagePartsCase.triage_revision, officer: "Officer Aishah (demo)" },
    });
    assert(releaseResponse.status() === 200, `Language-parts reply release returned ${releaseResponse.status()}`);

    await page.goto(`${baseUrl}/m/cases/${languagePartsCase.citizen_ref}`, { waitUntil: "networkidle" });
    const statusDepartment = page.locator('[data-language-part="department"]');
    const statusUnit = page.locator('[data-language-part="unit"]');
    assert(await statusDepartment.count() === 1 && await statusDepartment.innerText() === languagePartsCase.department && await statusDepartment.getAttribute("lang") === "en", "Chinese status does not mark the fixture department as an English language part");
    assert(await statusUnit.count() === 1 && await statusUnit.innerText() === languagePartsCase.unit && await statusUnit.getAttribute("lang") === "en", "Chinese status does not mark the fixture unit as an English language part");
    await page.goto(`${baseUrl}/m/cases/${languagePartsCase.citizen_ref}/reply`, { waitUntil: "networkidle" });
    const replyDepartment = page.locator('[data-language-part="department"]');
    const replyUnit = page.locator('[data-language-part="unit"]');
    const replyApprover = page.locator('[data-language-part="approver"]');
    assert(await replyDepartment.count() === 1 && await replyDepartment.innerText() === languagePartsCase.department && await replyDepartment.getAttribute("lang") === "en", "Chinese reply does not mark the fixture department as an English language part");
    assert(await replyUnit.count() === 1 && await replyUnit.innerText() === languagePartsCase.unit && await replyUnit.getAttribute("lang") === "en", "Chinese reply does not mark the fixture unit as an English language part");
    assert(await replyApprover.count() === 1 && await replyApprover.innerText() === "Officer Aishah (demo)" && await replyApprover.getAttribute("lang") === "en", "Chinese reply does not mark the approver as an English language part");
    const policyTitles = page.locator('[data-language-part="policy-title"]');
    const policySections = page.locator('[data-language-part="policy-section"]');
    const citationCount = await policyTitles.count();
    assert(citationCount > 0 && await policySections.count() === citationCount, "Chinese reply does not expose matching policy title and section language parts");
    for (let index = 0; index < citationCount; index += 1) {
      assert(await policyTitles.nth(index).getAttribute("lang") === "en" && (await policyTitles.nth(index).innerText()).trim().length > 0, `Policy title ${index + 1} is not a non-empty English language part`);
      assert(await policySections.nth(index).getAttribute("lang") === "en" && (await policySections.nth(index).innerText()).trim().length > 0, `Policy section ${index + 1} is not a non-empty English language part`);
    }

    expectNotFound = true;
    for (const [locale, copy] of Object.entries(notFoundCopy)) {
      const response = await page.goto(`${baseUrl}/m/cases/CF-NOTREAL?lang=${locale}`, { waitUntil: "networkidle" });
      assert(response?.status() === 404, `${locale} invalid citizen tracking route did not return HTTP 404`);
      await page.getByRole("heading", { level: 1, name: copy.title, exact: true }).waitFor();
      const action = page.getByRole("link", { name: copy.action, exact: true });
      assert(await action.getAttribute("href") === `/m?view=track&lang=${locale}`, `${locale} not-found action does not return to localized tracking`);
      assert(await page.locator(`[lang="${locale}"]`).count() > 0, `${locale} not-found content does not declare its language`);
      assert(await page.locator('a[href^="/officer"]').count() === 0, `${locale} invalid citizen route exposes an officer link`);
      const invalidOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(invalidOverflow <= 1, `320px ${locale} not-found view overflows horizontally by ${invalidOverflow}px`);
      assertBrowserHealthy();
    }

    const directInvalid = await page.goto(`${baseUrl}/m/cases/CF-NOTREAL`, { waitUntil: "networkidle" });
    assert(directInvalid?.status() === 404, "Direct invalid citizen tracking route did not return HTTP 404");
    await page.getByRole("heading", { level: 1, name: notFoundCopy.en.title, exact: true }).waitFor();
    assertBrowserHealthy();
    expectNotFound = false;
    await page.goto(`${baseUrl}/m?view=track&lang=zh`, { waitUntil: "networkidle" });
    assert(await page.getByRole("tab", { name: "查询个案", exact: true }).getAttribute("aria-selected") === "true", "Localized not-found return path did not reopen case tracking");

    expectNotFound = true;
    const globalNotFound = await page.goto(`${baseUrl}/not-a-real-page`, { waitUntil: "networkidle" });
    assert(globalNotFound?.status() === 404, "Global not-found route did not return HTTP 404");
    assert(!(await page.locator("body").innerText()).includes("🔎"), "Global not-found still renders the generic magnifying-glass emoji");
    for (const link of await page.getByRole("link").all()) {
      const box = await link.boundingBox();
      assert((box?.height ?? 0) >= 44, `Global not-found action is shorter than 44px (${box?.height ?? 0}px)`);
      await link.focus();
      assert(await link.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      }), "Global not-found action has no visible focus indicator");
    }
    assertBrowserHealthy();
    expectNotFound = false;
    assertBrowserHealthy();
    console.log("Citizen UI smoke passed");
  } finally {
    if (browser) await browser.close();
    if (server) await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
