# Private Marketplace buyer agent (Demo 2)

A concept prototype of a product request assistant inside a Private Marketplace buyer console. Inspired by AWS Marketplace's Private Marketplace. Not an AWS product, and not affiliated with or endorsed by Amazon Web Services. All companies, products, people, category names, email addresses and account IDs are fictional.

Status: step 1 of the build. The pages work, and the drawer uses a fake agent. The fake agent never calls Claude. Step 2 adds the real agent.

## How to run

In a terminal tab, in the `~/pmp-buyer-agent` folder:

```
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

- Buyer: use the menu at the upper right (Riley or Sam). Switching clears the conversation. For a link, add `?buyer=sam`.
- The fake agent waits about 1.2 seconds for each step, so you can see the loading states. Add `?fakeDelay=0` for no wait.

### Messages the step 1 fake agent knows

| Frame | Message |
| --- | --- |
| 5, 9, 11, 12 | On the Meshwire page, choose "Request approval", then the support prompts, or type a note such as "Need this for the Q1 network migration. PO 4500012345" |
| 6 | Do we have a VPN I can use? |
| 7 | I need a security tool |
| 10 | On the Auditlane page, choose "Request approval", then "Show approved alternatives" |
| 13 | Request QuarryDB Cloud (pay-as-you-go) |
| 17 (Sam) | Can I get Meshwire? |
| 18 | I need Lumora Image Large. |
| 19 | Can I get a refund for Watchtail Pro? (also: contract, Private Marketplace settings, "Why isn't Meshwire approved?", "My coworker in Finance has Meshwire.") |
| 20 | Do we have Zentrova? |
| 23 | Can you just buy Tunnelport Access Server for me? |
| 24 | Just buy Meshwire for me. |
| 25 | How much does Watchtail Pro cost? |
| 26 | Is Watchtail Pro approved? |
| 27 | What does Watchtail Pro do? / What's the difference between Watchtail Pro and Watchtail Enterprise? / Does Watchtail Pro support SSO? / Compare all the security tools in a table |

### Error states (dev only)

Add one of these to the page URL. Every agent call then fails that way.

- `?fakeError=connection`: connection error
- `?fakeError=E1a`: the assistant is busy
- `?fakeError=E1b`: the assistant isn't available
- `?fakeError=E2`: the response stops halfway
- `?devCrash=drawer`: the drawer fails to load (E3). There is no control on the page for this, and the switch is not in the production build.

## Tests

Free tests. No test calls Claude.

- Unit tests: `npm run test:unit`
- UI tests: `npm run test:e2e`. Playwright starts its own dev server on port 5174.

Playwright 1.65 needs its own browser. To download it once: `npx playwright install chromium`. Until then, you can point the tests at a browser that is already installed with `PW_CHROMIUM_PATH=<path to chrome-headless-shell> npm run test:e2e`.

## Known limits

- Requests live in the browser session only. A page reload removes new requests from Product requests. The 2 sample rows stay. (Decision 79. Supabase comes later.)
- Every product page uses "View purchase options" as its primary button. On the real site, a few listings that these products are based on have only "Request private offer", for example the listing behind Talonix Platform. "View purchase options" doesn't open a page in this prototype.
- E3 (drawer fails to load) doesn't tell the buyer to contact anyone. The real console would tell the buyer to contact AWS Support. This prototype doesn't, because it is a prototype (decision 101).
- Contact details: code finds an email address and a "#" Slack channel in the branding description. It misses formats it doesn't know, such as a phone number.

## What comes from code, not from Claude

The drawer shows some things under the assistant avatar that code makes, not Claude (decision 95):

- Step lines (what the agent searched or checked)
- Product lists and their links
- The confirm card, and the lines next to it: the note and PO number ask, "Here's the request I'll send to your administrator.", "Got it. I didn't send the request." and the request sent line
- The contact details bubble
- Every error Alert
- The support prompts (code decides when they show)

All fixed text is in `shared/copy.js`.

## Data

- `data/catalog.json` is the source of truth for the catalog: 33 products, each with a category. Category names are fictional.
- `data/buyers.json`, `data/experiences.json`, `data/sampleRequests.json`, `data/clarifyChoices.json` (frame 7 choices for "security"), `data/productRoutes.json`.
