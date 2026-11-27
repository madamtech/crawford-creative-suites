# Crawford Creative Suites — Admin Guide

This is the training record for changes to the public website at https://madamtech.github.io/crawford-creative-suites/. Write each change as a dated section, in plain language, and do not delete earlier entries.

This file was started on Friday, Nov 27, 2026 (America/Chicago) because no existing admin guide was found in this repository, in AIAuthoriTech-OS, in Notion, or in Google Drive.

---

## 1. Request forms and the Allure Fusions inbox — Friday, Nov 27, 2026

### Why this change was made

Visitors who sent an Allure Fusions project request were emailing allurefusions@gmail.com, which is not the Allure Fusions Firm inbox already in use (allurefusionsfirm@gmail.com). The project form, the AI consultation form, and “Ask about this item” also had no Name, Email, or Phone fields, so a request could arrive with no way to reply if the visitor’s email app did not open. A leftover source preview page was also reachable on the live site and still pointed at an old ChatGPT site.

### What was changed

1. Allure Fusions requests, the concierge contact answer, the README, and the publishing notes now use allurefusionsfirm@gmail.com.
2. The Allure Fusions “Build My Project” form and the AI AuthoriTech “Request an AI readiness conversation” form now start with required Name and Email fields, plus an optional Phone field. Those details are included in the email body and in the text copied to the clipboard.
3. For Madam Allure items that are not sold on the shop website, “Ask about this item” now opens a short form with the same three fields, then prepares the email to madamallure@gmail.com. Products that already have a shop page still open https://madamallure.ueniweb.com/ in a new tab.
4. The arrival-page source file `src/ccs-preview.html` is still required to build the home page, so it was not deleted. The old ChatGPT site link in that file was replaced with a link to the live building (`suites/`), and `robots.txt` now also names `/src/` as not a public page.

### How to rebuild and publish (for the next update)

1. On a computer signed in to the GitHub account `madamtech`, open the `crawford-creative-suites` folder.
2. Edit the source as needed. Business inboxes live in `build/send.js`. Form field inserts live in `build/patch.mjs`. The concierge’s spoken-and-written contact answer lives in `build/faq.js`.
3. Run `npm install` if dependencies are missing, then `npm run build`.
4. Preview locally with `node build/serve.mjs` or `npm run serve`, using http://127.0.0.1 (not localhost) as described in PUBLISHING.md.
5. Confirm a test Fusions request is addressed to allurefusionsfirm@gmail.com and that Name and Email appear in the email body and the copied text.
6. After the owner approves, commit, push to `main`, and wait about a minute for GitHub Pages to update.
7. Check the live building at https://madamtech.github.io/crawford-creative-suites/suites/ and confirm `https://madamtech.github.io/crawford-creative-suites/suites/app.js` contains allurefusionsfirm@gmail.com and does not contain the old allurefusions@gmail.com address.

### What we found on Madam Allure (Suite 217)

On the live site before this change, Suite 217 did not show any “Ask about this item” button. Shop products only showed “View & buy on our shop,” custom gift sets showed name, price, and details with no request button, and memorial items showed the text “Custom Quote” only. That matches the code: “Ask about this item” exists only as a fallback for a catalog product that has no shop URL, and every current shop product has a URL. No new Madam Allure request form was added to the gift sets or memorial items, because those screens did not already have one.

### Screenshots for training

Before shots, already saved in `/workspace/training-captures/site-fix-1/screenshots/`:

- [Screenshot: before-01-lobby.png] — Floor 1 lobby, before the change.
- [Screenshot: before-02-fusions-form-top.png] — Allure Fusions “Build My Project,” top of the form, with no Name or Email fields. The old allurefusions@gmail.com address is not shown on this page; it only appeared after submit, in the email itself.
- [Screenshot: before-03-fusions-form-bottom.png] — Bottom of the same form.
- [Screenshot: before-04-authoritech-form-top.png] — AI AuthoriTech readiness form, top, with no contact fields.
- [Screenshot: before-05-authoritech-form-bottom.png] — Bottom of the same form.
- [Screenshot: before-06-madam-allure-products.png] — Madam Allure products, showing shop links rather than “Ask about this item.”
- [Screenshot: before-07-madam-allure-products-bottom.png] — Lower part of the Madam Allure catalog, including “Custom Quote” text where it appears.

Take these after the change is live and save them in the same folder:

- [Screenshot: after-fusions-form.png] — Allure Fusions, Suite 305, “Build My Project,” showing the Name, Email, and Phone fields at the top of the form.
- [Screenshot: after-fusions-sent.png] — The “request is ready to send” notice after submitting that form, showing allurefusionsfirm@gmail.com.
- [Screenshot: after-ai-form.png] — AI AuthoriTech, Suite 412, the readiness conversation form, showing the same contact fields under the heading.
- [Screenshot: after-ai-sent.png] — The ready-to-send notice for a consultation request, addressed to ai.authoritech@gmail.com, with Name and Email in the copied request.
- [Screenshot: after-allure-shop.png] — Madam Allure products, confirming they still use “View & buy on our shop” (no new ask form was added).
- [Screenshot: after-concierge-contact.png] — In the lobby, ask “how do I contact you?” and capture the concierge answer that lists allurefusionsfirm@gmail.com.
