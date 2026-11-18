# Private Marketplace buyer agent (Demo 2)

A concept prototype of a product request assistant inside a Private Marketplace buyer console. Inspired by AWS Marketplace's Private Marketplace. Not an AWS product, and not affiliated with or endorsed by Amazon Web Services. All companies, products, people, category names, email addresses and account IDs are fictional.

Status: step 2 of the build. The server function (`api/agent.js`) runs the real agent with Claude. The fake agent stays for free tests and for `npm run dev:fake`.

## How to run

In a terminal tab, in the `~/pmp-buyer-agent` folder, run `npm install` once. Then use one of these 2 commands:

| Command | The drawer talks to | Cost |
| --- | --- | --- |
| `npm run dev` | Real Claude (`api/agent.js` through `dev/apiDevRoute.js`) | Each buyer message is 1 to 4 paid requests. Needs `ANTHROPIC_API_KEY` in `.env.local`. |
| `npm run dev:fake` | The fake agent (`tests/fakeAgent.js` through `dev/fakeAgentRoute.js`) | Free. Never calls Claude. |

Open the URL it prints (usually http://localhost:5173).

- Buyer: use the menu at the upper right (Riley or Sam). Switching clears the conversation. For a link, add `?buyer=sam`.
- Restart the dev server after a change to `server/`, `shared/`, `data/`, `dev/`, `vite.config.js` or `.env.local`.
- With no key, `npm run dev` shows the "isn't available" error (E1b) in the drawer and makes no call.
- `npm run dev:fake` only: the fake agent waits about 1.2 seconds for each step, so you can see the loading states. Add `?fakeDelay=0` for no wait.

### Paid runs (runner)

`scripts/run_agent.js` runs scripted conversations (`scripts/conversations/run-a/` and `run-b/`) with the same request builder and tool code as the app, and saves what the buyer sees in `runs/<date>-<label>/`. Card buttons run the browser's code with no Claude call. No retries.

- `npm run run:agent -- --run a --dry-run`: prints each conversation and the paid request count. 0 calls.
- `npm run run:agent -- --run a --label run-a`: the paid run. Only with Lisa's OK and a count.

### Messages the fake agent knows (`npm run dev:fake`)

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

### Error states (dev only, `npm run dev:fake`)

Add one of these to the page URL. Every agent call then fails that way. `?devCrash=drawer` also works with `npm run dev`.

- `?fakeError=connection`: connection error
- `?fakeError=E1a`: the assistant is busy
- `?fakeError=E1b`: the assistant isn't available
- `?fakeError=E2`: the response stops halfway
- `?devCrash=drawer`: the drawer fails to load (E3). There is no control on the page for this, and the switch is not in the production build.

## Tests

Free tests. No test calls Claude.

- Unit tests: `npm run test:unit`. The server tests use a fake Claude client (`tests/fakeClaude.js`).
- UI tests: `npm run test:e2e`. Playwright starts its own dev server on port 5174 with the fake agent (`PMP_FAKE_AGENT=1`) and an empty `ANTHROPIC_API_KEY`. It never reuses a dev server you started. `tests/e2e/free.spec.js` checks that `/api/agent` is the fake agent.

Playwright 1.65 needs its own browser. To download it once: `npx playwright install chromium`. Until then, you can point the tests at a browser that is already installed with `PW_CHROMIUM_PATH=<path to chrome-headless-shell> npm run test:e2e`.

## Known limits

- Product requests on tablet and phone widths: the fixed Actions column hides the Status column. The column order comes from the frame and the spec, and the demo is for desktop (decision 148).
- Requests live in the browser session only. A page reload removes new requests from Product requests. The 2 sample rows stay. (Decision 79. Supabase comes later.)
- Product page buttons, placeholders and other differences from the live console: see "Differences from the live AWS Marketplace console".
- Pages follow Lisa's Figma frames for layout (see docs/figma-round-trip.md).
- Contact details: code finds an email address and a "#" Slack channel in the branding description. It misses formats it doesn't know, such as a phone number.

## Differences from the live AWS Marketplace console

The prototype looks or works differently from the live console or Lisa's wireframes in these places. Approved Cloudscape deviations are logged in [docs/deviations.md](docs/deviations.md).

- **Gen-ai gradient on the entry point buttons (D4):** "Request product" and "Request approval" use the AWS gen-ai gradient from Lisa's wireframes, because public Cloudscape code has no gen-ai gradient and only adds the gen-ai icon.
- **Darker gradient on the primary "Request product" (Product requests, D4):** the fill is darker than in the wireframe, because white text on the wireframe gradient failed WCAG AA contrast.
- **Purple "Approved for purchase" badge (D1):** it uses purple (#3759ce) from the console badge in Lisa's earlier Private Marketplace prototype, because Cloudscape Badge has no purple color (decision 33).
- **Tabs that jump to sections, and a sticky tab row (D5):** the product page tabs scroll to sections on the same page and stay in view, as on the live product page, because the wireframe and the live page work this way (Cloudscape Tabs are not for this).
- **"Find requests" and pagination on a short table (D6):** Product requests has a filter and pagination with only 2 rows, because the wireframe and the live console have them.
- **Placeholder content on the product page:** the logo, video, overview, highlights, some details, pricing, legal, usage, resources and support show text in square brackets, because the catalog has only the name, vendor, category, delivery method and a short description.
- **Buttons and price sections left out:** the product page has no "Request demo", "Try for free" or "Get support" button, no free trial, no Region select and no cost tables, because the spec allows no other buttons, the prototype shows no prices (decision 107) and these controls would do nothing.
- **Info links and other controls left out:** there are no "Info" links, no "Show more" under the product description, and no refresh or preferences button on Product requests, because each would be a control that does nothing.
- **Shorter breadcrumb on product pages:** it shows AWS Marketplace > category > product, without the delivery method, because the prototype has no page for a delivery method.
- **"Not part of the prototype" pages:** Procurement insights, Manage subscriptions, Private offers, Vendor insights and Settings open a page that says so, because the prototype doesn't build them.
- **"What is Private Marketplace?" text:** it comes word for word from Lisa's wireframe, from the version approved for launch, so it may differ from the live site today.
- **"View purchase options":** every product page uses it as the primary button. On the real site, a few listings that these products are based on have only "Request private offer", for example the listing behind Talonix Platform. "View purchase options" doesn't open a page in this prototype.
- **No contact line when the drawer fails to load (D3):** the real console would tell the buyer to contact AWS Support, but this prototype doesn't, because it is a prototype (decision 101).
- **Drawer title "Product request assistant" (D2):** Cloudscape uses "generative AI assistant", but this assistant does only product requests.

## What comes from code, not from Claude

The drawer shows some things under the assistant avatar that code makes, not Claude (decision 95):

- Step lines (what the agent searched or checked)
- Product lists and their links
- The confirm card, and the lines next to it: the note and PO number ask, "Here's the request I'll send to your administrator.", "Got it. I didn't send the request." and the request sent line
- The hand-off line when product requests are turned off (frame 17) or a product can't be requested (frame 18). With 2 or more such products in one answer, 1 combined line
- The contact details bubble
- Every error Alert
- The support prompts (code decides when they show)
- The choices to narrow a large search down (frame 7)
- The search words: code removes general words such as "tools" or "software" before it searches

All fixed text is in `shared/copy.js`.

When Claude broke a rule in testing, that rule moved out of the prompt and into the tool results or into code. docs/prompt-changes.md has each change, with the text before and after.

## Data

- `data/catalog.json` is the source of truth for the catalog: 33 products, each with a category. Category names are fictional.
- `data/buyers.json`, `data/experiences.json`, `data/sampleRequests.json`, `data/clarifyChoices.json` (frame 7 choices for "security"), `data/productRoutes.json`.
