# Publishing workflow: Crawford Creative Suites websites

Follow these steps in order for every new site, portal, database or inventory, and for every update. Don't skip a step or move it later. Each step names who does it and what has to be true before the next one starts.

## Before any building starts

**1. Confirm where it will live (owner confirms; Claude checks).**
- Everything for Crawford Creative Suites, Madam Allure, Allure Fusions and AI AuthoriTech is created, logged and built under the **AI AuthoriTech GitHub account: `madamtech`**. That covers websites, portals, databases and inventories.
- Before building, check that `gh auth status` shows `madamtech`. If another account is active, stop and ask the owner.
- Choose the repo name now (for example `crawford-creative-suites`). Check it isn't already taken.
- Cost: free only. That means a public repo with GitHub Pages and a `madamtech.github.io/<repo>` address. A custom domain is optional and costs money, so only the owner decides on one.

**2. Confirm the facts the site shows (owner confirms).**
- Prices: the latest price list file in the shared notes folder (now `madam-allure-price-list.html` / `.pdf`). No other source.
- Taglines, business names and contact inboxes:
  - Madam Allure: madamallure@gmail.com
  - Allure Fusions: allurefusionsfirm@gmail.com
  - AI AuthoriTech: ai.authoritech@gmail.com
- If two sources disagree, ask the owner before building. Don't pick one quietly.

**3. Confirm the look (owner confirms).**
- Keep the existing design and quality; only change it to improve it.
- Brand colors: teal, taupe, metallic rose gold, with sapphire blue, black and white accents.

## Building

**4. Build locally (Claude).** Edit `src/`, then run `npm run build`. Nothing goes online in this step.

**5. Check it locally (Claude).**
- Open http://127.0.0.1:8417/site/. Use 127.0.0.1, not localhost: the portals' offline cache can show an old copy on localhost.
- Check desktop and phone width, every floor, product prices, forms (they must route to the right inbox), and that sound is off by default.

## Approval, then publishing

**6. Owner previews and approves (owner).** Show the local preview. Nothing is published until the owner says yes after seeing it.

**7. Publish (Claude, only after step 6).**
- First time: create the public repo under `madamtech`, push, and turn on GitHub Pages from the `main` branch.
- Updates: commit and push to `main`. Pages rebuilds in about a minute.

**8. Verify it's public (Claude).**
- Open the live address signed out. Every page and image must load with no sign-in.
- Check the prices and taglines on the live site match step 2.

**9. Record it (Claude).** Add the live address, the date and what changed to the shared notes folder. Tell the other sessions if their sites need the same change. For example, a price change goes on every site.

## Live sites

| Site | Address | Repo |
|---|---|---|
| Crawford Creative Suites | https://madamtech.github.io/crawford-creative-suites/ | madamtech/crawford-creative-suites |
