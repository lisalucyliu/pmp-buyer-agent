# Demo 2 build plan

Nov 15, 2026. Step 0 (plan and proposals). Read with `demo2-spec.md`, `build-decisions.md` and `proposals.md`.

Terms used here:

- **Server function**: a small Node program on Vercel that runs only when the browser calls it. It holds the API key and talks to Claude.
- **Tool**: a function in our code that Claude can ask us to run. Claude sees only the text our code returns.
- **Paid request**: one call to the Claude API. A buyer turn that uses 1 tool costs 2 calls (Claude asks for the tool, then Claude writes the answer).
- **Free test**: an automated test that never calls Claude. It uses a fake Claude or calls our code directly.
- **NDJSON**: one JSON object per line. The server function streams events to the browser this way, the same as Demo 1.

## 1. Folder and file structure

```
pmp-buyer-agent/
  CLAUDE.md                  Design mode: system (Cloudscape). Project rules. How to run.
  README.md                  Collects the README items in build-decisions.md.
  package.json               Same stack as grounded-answers: Vite, React, Cloudscape, Anthropic SDK, Playwright.
  vite.config.js             React plugin plus the dev API route.
  vercel.json                framework vite, one function: api/agent.js.
  index.html
  .gitignore                 .env*, node_modules, dist, .vercel, test-results.
  api/
    agent.js                 The server function (POST). Runs the agent loop and streams events.
  dev/
    apiDevRoute.js           Serves /api/agent inside `npm run dev`. Same pattern as Demo 1.
  shared/                    Plain JavaScript. The browser AND the server import it, so rules can't drift.
    catalog.js               Loads data/catalog.json. findProduct, statusFor(buyer, product).
    search.js                Match (Week 1 fuzzy match, ported) and the ranking rule (decision 19).
    alternatives.js          A (approved) products in the same category, ranked, top 5 plus "more" flag.
    requestChecks.js         The one check list: requests on, product N (not approved), no open request.
                             Used when the card would open (decision 18) and again at submit (decision 78).
    contacts.js              Finds an email address and a "#" Slack channel in the branding description.
    productRoutes.js         product_id to console product page route (no example.com links).
    copy.js                  Every fixed string: card, hand-off endings, recheck lines, error Alerts, success.
    productRequest.js        The `product_request` record and status names. Comment: "Buyers see Product
                             requests. Admins see Approval requests."
  server/
    prompt.js                SYSTEM_PROMPT.
    tools.js                 The 3 tool definitions and the code that runs them.
    toolText.js              Builds the text Claude sees from a tool result (no URLs, no "declined", no "blocked").
    errors.js                Maps a failure to an error type (row 6 Build notes).
  data/
    catalog.json             33 products, with `category` (after Lisa approves the list).
    buyers.json              Riley and Sam, with account ID and experience.
    experiences.json         Experience name (admin only), branding name, branding description, requests on or off.
    sampleRequests.json      The 2 sample rows (after Lisa approves them).
  src/
    main.jsx                 I18nProvider, global styles.
    App.jsx                  App layout, top navigation, side navigation, drawer, routes.
    state/                   Buyer, session request list, conversation. One store that pages and drawer both read.
    pages/                   MyPrivateMarketplace, ProductRequests, ProductPage, Discover, RequestForm.
    drawer/                  AssistantDrawer, EmptyState, Messages, StepLine, ProductList, ConfirmCard,
                             ContactBubble, ErrorAlert, DrawerErrorBoundary, ClarifyDialog.
    agentClient.js           Calls /api/agent, reads the NDJSON stream, finds the error type.
  tests/
    unit/                    node:test (built into Node, no new package). Tests shared/ and server/.
    e2e/                     Playwright with a fake agent. No Claude calls.
    fakeAgent.js             Fake event streams for each frame.
  docs/
    demo2-spec.md, build-decisions.md, build-plan.md, proposals.md, deviations.md (Cloudscape deviation log).
```

Why `shared/`: before Supabase the request list lives in the browser (decision 79). The server function has no memory between calls. So the browser sends its open requests with each call, and the browser also runs the recheck at submit. Both sides import the same `requestChecks.js`, so the card check and the recheck are the same code (row 4 Build notes).

## 2. How the parts work together

### One buyer turn

1. The buyer sends a message in the drawer. The browser POSTs to `/api/agent`: the conversation history, the buyer ID, the open requests (product IDs with status Pending), and conversation flags (note asked, alternatives shown, alternatives turned down).
2. `api/agent.js` looks up the buyer and experience from `data/`, never from the browser text. It calls Claude with the system prompt and the 3 tools. Model `claude-sonnet-5-5`, effort low.
3. When Claude asks for a tool, the server runs it and sends 2 things:
   - To the browser: UI events. `step` (step line text and status), `products` (product IDs for the List, in ranked order), `clarify` (frame 7 choices), `contact` (the details code found), `card` (product ID, note, PO number).
   - To Claude: plain text from `toolText.js`. No URL, no contact details, no "declined" or "blocked".
4. Claude's final text streams to the browser as `text` events. The browser shows it as plain text (decision 110), never as markdown.
5. Code decides the stacked bubbles and support prompts after the text: product List, contact bubble, request prompt. Claude doesn't choose them.
6. The server ends the stream with `done`. If something fails, it sends `error` with a type, or the stream just stops. `agentClient.js` maps that to an error type (section 2, Errors).

### The 3 tools

| Tool | What code does | What Claude gets |
| --- | --- | --- |
| `search_products` | Match, rank (decision 19), cap at 5. More than 5 matches: send a `clarify` event and no List. Each result carries its category. Alternatives (see proposals.md, question 2). | Header line: requests on or off, and "contact details: yes" or "no". One line per product: name, vendor, type, description, status (approved, not approved, or "not approved. This product can't be requested."), product_id, category. No link. |
| `check_request_settings` | Reads the experience. | Requests on or off, contact details yes or no. |
| `submit_request` | Runs `requestChecks.js`. Pass: sends a `card` event and ENDS the loop. No more Claude calls this turn. Fail: sends the matching fixed line and, for D (declined and blocked) or requests off, the contact bubble. | Pass: nothing this turn (see the card section). Fail: a short reason in plain words, for example "Request not shown. The product can't be requested." |

### The confirm card (frames 11, 12, 14, 16)

1. Before the first card in a conversation, code asks for the note and PO number once (decision 66). The ask is fixed copy: "Add a note for your administrator about why you need this product. A PO number is optional." (frame 5). The flag "note asked" goes into the conversation state. The note is required and the PO number is optional (Lisa, Nov 21).
2. Claude calls `submit_request` with product_id, note and PO number. The server runs the checks (decision 18). A duplicate gets the frame 13 line and no card. After the ask, an empty note gets the fixed line "A note is required. Add a note for your administrator about why you need this product." and no card, each time (Lisa, Nov 21).
3. Checks pass: the server sends the fixed line "Here's the request I'll send to your administrator." and the `card` event, then stops. The tool call stays open in the history.
4. The card shows in the drawer. Focus moves to its heading. No dialog role, no focus trap. The prompt input stays enabled.
5. **"Submit request" selected.** All of this runs in the browser. There is no call to Claude, because the success copy is fixed in code (decision 73).
   1. The card resolves at once (no loading state).
   2. The browser runs `requestChecks.js` again with the current data (decision 78, recheck at submit).
   3. A check fails: nothing is saved. The card shows "Not sent" (stopped). The next bubble shows the frame 16 line for that case. For requests off and D (declined and blocked), the hand-off line and, for Riley, the contact bubble follow.
   4. All checks pass: the card shows "Submitted" (success). The browser saves the `product_request` record to the session store: account ID, product, experience, note, PO number, date, status Pending. No buyer name (decision 25). The step line shows "Sending your request" only if the save takes 1 second or more, then "Sent your request". Then the fixed frame 14 text with the "Product requests" link.
   5. The pages read the same store, so Product requests and the product page change at once (frame 15).
   6. Focus goes back to the card heading. The new bubble goes into the hidden LiveRegion.
6. **"Cancel" selected.** Card shows "Not sent". Fixed line "Got it. I didn't send the request." Then "Show approved alternatives" if the buyer hasn't seen alternatives yet. No call to Claude.
7. On the buyer's next message, the browser adds the tool result for the open `submit_request` call to the history, for example "The buyer selected Submit request. The request was sent." or "The buyer selected Cancel. Nothing was sent." So Claude knows what happened without a call at the time of the click.
8. Save fails (frame 12): the error Alert from `copy.js`. "Try again" saves the same record again with no new card.

### The drawer

- App layout `drawers` with the gen-ai trigger icon (aria label "Open product request assistant"). The drawer state and the conversation live in the app store, so they stay when the buyer changes pages.
- Empty state: frame 2b copy when opened from "Request product", frame 4 copy from the trigger bar, Sam variant from the buyer's experience.
- Opened from "Request approval" on a product page: code writes the frame 5 bubble with no Claude call, and adds it to the history as an assistant message so Claude has the context.
- Footer: Prompt input, placeholder "Ask a question", constraint text with the AWS Responsible AI Policy link.
- LiveRegion for each new bubble. No auto-scroll while the buyer reads older messages.

### Errors (row 6)

| Signal | Type | Where it is found |
| --- | --- | --- |
| fetch fails, or timeout before any text | Connection error | `agentClient.js` |
| Server `error` event with status 429 or 529 | E1a (busy) | `server/errors.js` |
| Server `error` event with 401, 403, 500, or any other cause | E1b (not available) | `server/errors.js` |
| Text started, then the stream ended with no `done` | E2 (stops halfway) | `agentClient.js`. Removes the partial text and stacked bubbles. |
| Crash while the drawer renders | E3 (drawer fails to load) | `DrawerErrorBoundary` |
| "Try again" fails again | E4 (Try again fails again) | Same Alert again |

E3 uses the Cloudscape Error boundary component (see proposals.md, section 3). It wraps the drawer content only, so the header and close button stay. Its `renderFallback` shows our error Alert, "Reload page" and the "Error details" expandable section. `onError` keeps the raw message for that section.

## 3. System prompt and tool description changes

Line numbers are in `~/pmp-tiny-agent/tiny_agent.py`. Before I write the new prompt text in step 2, I will show you the before and after for each change (tiny-agent project rule). I loaded the few-shot-patterns skill. Its main rule matches your Week 1 lesson: Claude copies the examples, flaws included. So each example below gets rewritten to follow every new rule, and I add no example that shows a link, a price or the word "experience".

### System prompt (`SYSTEM_PROMPT`, lines 47 to 115)

| # | Change | Source | Line |
| --- | --- | --- | --- |
| S1 | Model `claude-opus-5` becomes `claude-sonnet-5-5`, effort low. | build-decisions | 40 |
| S2 | Format rule: drop "formatted for a terminal". Keep plain text, no markdown, no em dashes. Code also renders plain text (decision 110). | decision 110 | 48 to 52 |
| S3 | Replace "When a product is approved, give the buyer its product page link so they can view purchase options and subscribe themselves." with a line that the app shows a link for each product the answer names, and that Claude never writes a URL. Keep "You cannot purchase anything." | row 7, decision 103 | 56 to 58 |
| S4 | Remove "If a product is retired, say so and name its replacement." | decisions 4, 20 | 58 to 59 |
| S5 | Note and PO rule: the app asks before the first card. The note is required and the PO number is optional (Lisa, Nov 21). Claude doesn't ask for them and doesn't make up a note. Pass the buyer's note and PO number to submit_request. With no note, Claude passes an empty note, and the app asks again. | decision 66, note required (Lisa, Nov 21) | 66 to 70 |
| S6 | Length rule: keep "Answer the buyer's question in the first sentence." Remove "Summarize the rest as a count", because code never shows more than 5 (more than 5 gets the frame 7 question). | decision 19 | 72 to 76 |
| S7 | Remove the link format rules ("write the name followed by its link", "include its link so the buyer can share it"). | row 7 | 78 to 82 |
| S8 | Keep "state the difference in one short phrase". Change "Do not recommend one unless the buyer has told you what they need" to no recommendation at all (P5 (simple questions) rule). | row 7 | 84 to 86 |
| S9 | Example 1: remove both `<link>` placeholders. "approved for your experience" becomes "approved for purchase in your Private Marketplace". Give the description before the status. | decisions 22, 24, Week 1 carry-over | 88 to 96 |
| S10 | Requests-off rule: the first sentence answers the question (it no longer has to say requests are off). Order: answer, alternatives, then the hand-off line. Remove the line about product links in the message to the administrator, and the docs link sentences. Make it shorter. | decision 91, row 5 | 98 to 105 |
| S11 | Example 2: remove "Finance experience", both `<link>`s, the docs link and "Want me to check what's already approved for Finance?". End with the hand-off line "To ask about it, speak with your administrator." | decisions 22, 24, 91 | 107 to 114 |
| S12 | New rule: for any request to buy, the first sentence is "I can't buy products for you." | row 7 (P1, P2) | new |
| S13 | New rule: never give a price, a price range or a pricing model, even if asked again. Say "I can't give you prices." and point to the product page. | row 7 (P3) | new |
| S14 | New rule: P5 (simple questions) limits. At most 3 short sentences, catalog facts from tool results only, no recommendation, at most 5 products. A fact the catalog doesn't have gets "I don't have details about that." | row 7 (P5) | new |
| S15 | New rule: too-big request copy: "I can only give short answers about products. Each product page has more details." | decision 112 | new |
| S16 | New rule: hand-off endings. If the tool result says contact details: yes, end with "contact your administrator." If no, end with "speak with your administrator." Never write an email or channel. | decision 87, row 5 | new |
| S17 | New rule: H3 (a question the agent can't answer). One first sentence from the frame 19 table, then the hand-off line only. | row 5 | new |
| S18 | New rule: say "send a request to your administrator". Never "submit the request for you". This line isn't in the prompt today. It fixes Week 1 output wording. | Week 1 carry-over | new |
| S19 | New rule: never say "experience". Say "your Private Marketplace". | decisions 22, 24 | whole prompt |
| S20 | New rule: a product that "can't be requested" gets "This product can't be requested." and no request offer. | decision 16 | new |

### Tool descriptions and tool result text

| # | Change | Source | Line |
| --- | --- | --- | --- |
| T1 | `search_products` description: remove "and a link to the product page". "approval status in the buyer's experience" becomes "in the buyer's Private Marketplace". Add: results show at most 5; if more matched, the app asks the buyer to narrow it down, so don't list them. | decisions 19, 103 | 150 to 155 |
| T2 | `search_products`: `approved_only` changes, depending on your answer to proposals.md question 2. | decision 62 | 159 to 160, 174 to 177 |
| T3 | `check_request_settings` description: "experience" becomes "Private Marketplace". | decision 22 | 185 to 189 |
| T4 | `submit_request` description: remove "Always ask the buyer to confirm before you call this tool." Add: "This tool shows the buyer a card to confirm. Nothing is sent until the buyer selects Submit request." | decision 21 | 199 to 200 |
| T5 | `submit_request` description: remove "After you submit, tell the buyer that the administrator will review the request". The app writes the success text. | decision 73 | 205 to 207 |
| T6 | `submit_request` description: replace "If the tool returns blocked, the administrator has declined this product and blocked new requests for it." with "If the result says the product can't be requested, tell the buyer 'This product can't be requested.'" | decision 16 | 207 to 210 |
| T7 | `submit_request` input `reason` becomes `note`, to match the record and the card label. | decision 25 | 222 to 229 |
| T8 | `STATUS_LABELS`: D becomes "not approved. This product can't be requested." | decision 16 | 240 |
| T9 | Search result line: remove `Link: ...` and "Status in {experience}". Add category. Description comes before status. | decisions 103, 22 | 283 to 288 |
| T10 | `REQUESTS_DOCS_LINK` and the docs sentences: removed. Requests-off header: short, adds contact details yes or no. | decision 91 | 295 to 314 |
| T11 | `submit_request` requests-off result: remove link and docs link. | decision 91 | 332 to 341 |
| T12 | `submit_request` D result: no "declined", no "blocked". | decision 16 | 344 to 351 |
| T13 | `submit_request` A result: no link. | decision 103 | 352 to 356 |
| T14 | Record: remove `buyer_name`, `reason` becomes `note`, add `status: "Pending"` and `date`. Save moves to the browser at "Submit request". | decisions 25, 78 | 358 to 370 |

## 4. Free tests for each spec Build note

All tests below are free. Unit tests use `node --test`. UI tests use Playwright with `fakeAgent.js`, which replaces `/api/agent` in the test browser only.

**Row 1 (Figma note, ranking)**
- U1. Ranking: "VPN" returns Meshwire, Tunnelport Access Server (BYOL), Shalecrest UTM 9 (all description matches, catalog order). Exact name, name contains and vendor tiers each tested with a made-up 4-product list.
- U2. "security" returns 9 matches, so a `clarify` event and no `products` event.
- U3. Ironveil Cloud Guard is not in the catalog. 33 products. 6 are A (approved) for both buyers.
- E1. Frame 1 and frame 3 pages render the right buttons for Riley and Sam (shown, hidden, disabled).

**Row 3 (card)**
- U4. `product_request` record has exactly: account ID, product, experience, note, PO number, date, status. No buyer name.
- U5. `submit_request` tool description has no "confirm". (A text check on `server/tools.js`.)
- U6. Duplicate: with an open request for Meshwire, `submit_request` sends the frame 13 line and no `card` event.
- E2. Card: heading gets focus, no `role="dialog"`, prompt input enabled, Vendor row only when vendor differs from the product name, rows left out when empty.

**Row 4 (submitted)**
- U7. Recheck at submit (decision 78): open a card, then change the data in the test (approve the product, turn requests off, set it to D (declined and blocked), add a Pending request). Each time, submit returns "Not sent", the frame 16 line, and saves nothing.
- E3. Submit with no change: card "Submitted", success text, new row on top of Product requests, Meshwire page Alert changes, "Request approval" hidden. No call to `/api/agent` after the click.
- E4. Step line: a save under 1 second shows "Sent your request" with no "Sending your request". A test-only slow save shows "Sending your request".
- E5. Focus returns to the card heading after the click. New bubble text is in the LiveRegion. Scrolled up: no auto-scroll.
- E6. Reload clears the session request (known limit), sample rows stay.

**Row 5 (hand-off)**
- U8. Contact details: Engineering finds exactly "eng-software@initech.example" and "#eng-software-requests". Finance finds none.
- U9. Tool text for Claude says "contact details: yes" or "no" and never holds the email or channel.
- U10. Requests-off and D tool text holds no "declined", "blocked" or URL.
- E7. Contact bubble: Email with inline Copy to clipboard ("Copy email address"), Slack channel plain text. Sam: no bubble.
- E8. No support prompts after a hand-off. Frame 20 shows 1 editable prompt.

**Row 6 (errors)**
- U11. `server/errors.js`: 429 and 529 give E1a; 401, 403, 500 and an unknown error give E1b.
- E9 to E13. One test for each case with a mocked failure: connection, E1a, E1b, E2, E4. Each checks the Alert text and the request form link. E1b has no "Try again". E2 removes the partial text and stacked bubbles.
- E14. E3: force the crash in a test only (proposals.md question 7). Check the Alert, "Reload page", "Error details" collapsed, the drawer header still there, and the page behind still works.
- U12. No output label, regenerate or stop button in the drawer source.

**Row 7 (links, buy, price, simple questions)**
- U13. The request body to Claude (built by the same function the server uses) has no "http", no "example.com" and no product route.
- E15. Each List item's href equals the route for that product_id. Same tab, no external icon.
- E16. Claude's text with `**bold**`, `# heading` or a markdown table shows as literal plain text.
- U14. System prompt holds "I can't buy products for you.", the no-price rule and the P5 limits. Holds no "experience", "<link>" or "retired".

Some rules depend on what Claude writes (for example "I can't buy products for you." first). A free test can't prove those. I will check them in the paid runs in step 2.

## 5. Steps 1 to 4

### Step 1: pages with a fake agent (0 paid requests)

- Ask you to run `npm install` (I won't run it without your OK).
- Write CLAUDE.md with design mode: system (Cloudscape). Read the anti-slop-check skill "Before you build" rules first.
- Apply the data changes after you approve proposals.md: remove Ironveil Cloud Guard, add categories, experiences, sample rows, product routes.
- Build `shared/` and its unit tests first, so the pages and the agent use the same rules.
- Pages: My Private Marketplace, Product requests, product page (all 5 frame 3 cases), Discover, backup request form. Console chrome.
- Drawer shell with a fake agent: frames 2b, 4, 5, 6, 7, 8, 9 to 27 from `fakeAgent.js` event scripts. Card, contact bubble and step lines are real code.
- Free tests. Check against Cloudscape pages. Measure in the browser. design-review-loop for layout.
- You review on localhost.

### Step 2: server function and drawer states, rows 1 to 5 and 7

- Port the 3 tools and the prompt with the section 3 changes. Show you each before and after.
- Free tests with a fake Claude client first.
- Paid smoke run A, about 12 paid requests: frames 6 (VPN), 9 (alternatives), 11 (card), 17 (Sam, requests off), 23 (just buy it). I ask first.
- Paid run B, about 14 paid requests (changed Nov 16, Lisa's answers in proposals.md): only the frames where Claude's wording is the subject of the test. P1 and P2 ("I can't buy products for you." first), P3 (price), P5 (simple questions), 5d (too-big request), H3 (questions the agent can't answer) and 1 Sam requests-off turn. Free tests and the Week 7 evals cover the other frames. I ask first.
- Fix and recheck only the frames that fail, each with your OK and a count.

### Step 3: error states (row 6) and Vercel deploy

- Error Alerts and E3 boundary. All free tests, mocked. 0 paid requests for row 6.
- Vercel: you add the key in Vercel (Production) and deploy, or I give you the exact steps. One smoke conversation on the live URL: about 3 paid requests.

### Step 4: Figma round trip, Supabase, motion, GIFs

- Figma round trip for frame 3 only (decision 114): 0 paid requests.
- Supabase: save and read `product_request`. One card flow to check it: about 3 paid requests.
- Motion: 0 paid requests. First to go to the parking lot if time runs out.
- GIFs: 0 paid requests with the fake agent, or about 12 with real Claude (proposals.md question 10).

**Total: about 32 paid requests (about 26 in step 2, 3 in step 3, 3 in step 4), or more with real GIFs (decided at step 4).** I will compare the first run's usage in the Claude Console with your $10 limit before run B.

Hard end: Wed Nov 18. Cut order: motion, then Supabase.
