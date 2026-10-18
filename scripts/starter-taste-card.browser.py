import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

S = Path(__file__).parent / "screenshots"; S.mkdir(parents=True, exist_ok=True)
EMAIL = "phi-starter-1792304074@outlook.com"
PASSWORD = "Starter-Test-9!"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # Sign in as a brand-new account with zero activity
        await page.goto("http://localhost:8080/login", wait_until="domcontentloaded")
        await page.wait_for_selector("input[type=email]", state="visible")
        await page.wait_for_timeout(1500)
        await page.fill("input[type=email]", EMAIL)
        await page.fill("input[type=password]", PASSWORD)
        await page.locator("button.btn-primary").click()
        await page.wait_for_timeout(5000)
        print("after login url:", page.url)
        assert "/login" not in page.url, "FAIL: login did not succeed"

        await page.goto("http://localhost:8080/profile", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        await page.screenshot(path=str(S / "2_profile.png"))

        card = page.locator("section.box", has_text="Your taste").first
        text = await card.inner_text()
        print("---- taste card text ----")
        print(text)
        assert "Could not load your taste" not in text, "FAIL: error state shown"
        assert "The Curious Explorer" not in text, "FAIL: hardcoded archetype shown"
        assert "still taking shape" in text, "FAIL: starter message missing"
        assert "Getting to know you" in text, "FAIL: starter stage label missing"
        assert not errors, f"FAIL: page errors: {errors}"
        print("PASS: brand-new account sees honest starter taste card, no errors")
        await browser.close()

asyncio.run(main())
