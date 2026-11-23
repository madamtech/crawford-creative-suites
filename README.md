# Crawford Creative Suites website

Public home of Madam Allure, Allure Fusions and AI AuthoriTech, hosted free on GitHub Pages at https://madamtech.github.io/crawford-creative-suites/ (AI AuthoriTech GitHub account `madamtech`).

Before building or publishing anything, follow [PUBLISHING.md](PUBLISHING.md) step by step.

- `index.html`: arrival and preview lobby (the old crawford-creative-suites ChatGPT site)
- `suites/`: the full building with the concierge, elevator and the three suites (the old tanika-creative-ventures ChatGPT site)
- `img/`: scene images

## Changing prices, products or wording

The building's content (products, prices, lounge cards) is in `src/ccs-app.js`, the original code ChatGPT produced. Edit it there, then rebuild:

```
npm install
npm run build
```

`build/patch.mjs` applies the publishing fixes (inboxes, terms, sound off by default, memorial cards). `build/site.mjs` builds the pages and the rose-gold brand colors. Commit and push, and GitHub Pages updates in about a minute.

## Where form requests go

Visitors' email apps open with the request filled in. The request is also copied to the clipboard, so it isn't lost if they have no email app.

- Madam Allure: madamallure@gmail.com
- Allure Fusions: allurefusions@gmail.com
- AI AuthoriTech: ai.authoritech@gmail.com

Change these in `build/send.js` and `build/patch.mjs`.
