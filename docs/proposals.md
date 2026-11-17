# Demo 2 proposals for Lisa

Nov 15, 2026. Step 0. Nothing here is in the build until you approve it.

Status key: A (approved), N (not approved), D (declined and blocked). Riley is Engineering. Sam is Finance.

## 1. Categories (decision 57)

Rule I used: 2 products share a category only if one could replace the other for the buyer's job. So an alternative is always a real swap. Names follow the spec drafts and the frame 7 choices where they fit. All names are fictional data.

Ironveil Cloud Guard is removed (decision 20). 33 products. A (approved) for both buyers: 6 (Lakeforge, Talonix, Gatekey, Vaultline, BucketShield, Larkspur). Checked against catalog.json.

| # | Product | Vendor | Current description | Proposed category | Riley | Sam |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Watchtail Enterprise | Watchtail | Observability and security platform for large companies: metrics, logs, traces, and database monitoring | Observability platform | N | N |
| 2 | Watchtail Pro | Watchtail | Observability and security platform for smaller teams: metrics, logs, traces, and database monitoring | Observability platform | A | N |
| 3 | Watchtail Agent | Watchtail | Monitoring agent preinstalled on an EC2 image | Monitoring agent setup | A | N |
| 4 | Watchtail Operator | Watchtail | Installs and manages the Watchtail agent on Kubernetes | Monitoring agent setup | N | N |
| 5 | Managed Watchtail Threat Detection | Sentrypoint Security | 24/7 managed security service that runs on Watchtail threat detection | Managed threat detection service | N | N |
| 6 | Ironveil Horizon | Ironveil | AI security platform that predicts and responds to threats across AWS and multicloud | Threat detection and response | N | N |
| 7 | Lakeforge Data Platform | Lakeforge | Unified data and AI platform with a 14-day free trial | Data and AI platform | A | A |
| 8 | Talonix Platform | Talonix | AI protection for devices identities and cloud through one agent | Threat detection and response | A | A |
| 9 | QuarryDB Cloud (pay-as-you-go) | QuarryDB | Fully managed NoSQL database with vector search | Managed NoSQL database | N | N |
| 10 | QuarryDB Multimodal Embeddings | QuarryDB | Turns text and images into vectors for search | Embedding model | N | N |
| 11 | Gatekey Workforce Starter | Gatekey | Identity and access for employees contractors and partners | Workforce identity and access | A | A |
| 12 | Vaultline Business | Vaultline | Enterprise password manager | Password manager | A | A |
| 13 | Meshwire | Meshwire | Secure networking that replaces legacy VPNs | Remote network access (VPN) | N | N |
| 14 | Auditlane | Auditlane | Compliance and security automation | Compliance automation | N | N |
| 15 | Tunnelport Access Server (BYOL) | Tunnelport | Self-hosted business VPN on EC2 | Remote network access (VPN) | A | N |
| 16 | Bastion NGFW VM | Bastion Networks | Next-generation firewall for AWS networks | Network firewall | N | N |
| 17 | Cardinal Enterprise Linux for SAP | Cardinal Linux | Enterprise Linux for SAP with high availability | Linux for SAP | N | N |
| 18 | Searchloom Search API | Searchloom | Web search API for developers and AI apps | Web search API | N | N |
| 19 | Parsewell Document Agent | Parsewell AI | Pulls structured data out of messy documents | Document data extraction | N | N |
| 20 | Tasklane MCP Server | Tasklane | Lets AI assistants read and update Tasklane projects | AI assistant connector (MCP) | A | N |
| 21 | BucketShield Malware Scanning | BucketShield | Scans S3 and other AWS storage for malware | Storage malware scanning | A | A |
| 22 | Rankwise Rerank 3 | Rankwise AI | Re-sorts search results by meaning | Search reranking model | N | N |
| 23 | Lumora Image Large | Lumora Labs | Image generation model | Image generation | D | N |
| 24 | Holdfast Incident Response Retainer | Holdfast Security | On-call incident response team | Incident response service | N | N |
| 25 | Identiweave Identity Resolution | Identiweave | Connects customer records across sources for analytics | Customer record matching | N | N |
| 26 | Larkspur Linux 22.04 LTS | Larkspur Linux | Free general-purpose Linux | General-purpose Linux | A | A |
| 27 | Breachkit Linux | Breachkit | Linux for penetration testing and security research | Penetration testing Linux | D | D |
| 28 | Cardinal Enterprise Linux 9 | Cardinal Linux | Enterprise Linux for general server workloads | General-purpose Linux | N | N |
| 29 | Paneway Server 2022 Base | Paneway Systems | Server operating system preinstalled on an EC2 image | Non-Linux server operating system | N | N |
| 30 | Ironveil Workload Security | Ironveil | Protects servers and cloud workloads from malware and intrusions | Server and workload protection | N | N |
| 31 | Emberfox Rooms Enterprise | Emberfox | Private 3D meeting spaces that a company hosts in its own AWS account | Self-hosted virtual meetings | N | N |
| 32 | Wrenhollow Text to SQL | Wrenhollow Consulting | Turns plain-language questions into SQL queries | Text to SQL | N | N |
| 33 | Shalecrest UTM 9 | Shalecrest Security | Firewall, VPN, and web filtering in one appliance | Network firewall | N | N |

**What the categories give the spec frames** (checked by hand against the table):

- Frame 9 (Riley, Meshwire): Remote network access (VPN), 1 found (Tunnelport Access Server (BYOL)). Matches.
- Frame 17 (Sam, Meshwire): 0 found (Tunnelport is N (not approved) for Finance). Matches.
- Frame 10 (Riley, Auditlane): Compliance automation, 0 found. Matches.
- Frame 18 (Riley, Lumora Image Large): Image generation, 0 found. Matches.
- New result: Riley asking about Watchtail Enterprise gets Watchtail Pro as an alternative. Ironveil Horizon gets Talonix Platform. Cardinal Enterprise Linux 9 gets Larkspur Linux 22.04 LTS. Watchtail Operator gets Watchtail Agent.

**Close calls for you to check:**

- Shalecrest UTM 9: firewall first, VPN second. I put it in Network firewall, so it is not a Meshwire alternative. If it goes in Remote network access (VPN), frame 9 still shows 1 found, because Shalecrest is N (not approved).
- Watchtail Agent and Watchtail Operator: same job (run the Watchtail agent), different platform (EC2 image or Kubernetes). One category, or 2?
- Talonix Platform (devices, identities, cloud) and Ironveil Horizon (cloud threats): both detect and respond to threats. Talonix covers more. I put them together.
- Managed Watchtail Threat Detection and Holdfast Incident Response Retainer: both are people, not software. One watches all day, one comes when something goes wrong. I kept them apart.
- Cardinal Enterprise Linux for SAP stays apart from General-purpose Linux, because a free Linux is not a swap for an SAP-ready Linux.
- Paneway Server 2022 Base: the description doesn't say which OS. "Non-Linux server operating system" keeps it from getting Larkspur Linux as an alternative.

## 2. Sample rows for Product requests (decision 83)

Both products are N (not approved) for Riley, not Meshwire, and not used in another spec frame for Riley (Auditlane is frame 10, Watchtail Enterprise is frame 27).

| Requested product | Status | Date requested (UTC-05:00) | Actions |
| --- | --- | --- | --- |
| QuarryDB Cloud (pay-as-you-go) | Pending | Nov 10, 2026, 10:42 | Cancel request |
| Bastion NGFW VM | Declined | Oct 27, 2026, 15:08 | - |

Why these:

- One Pending row, so you can demo "Cancel request". One closed row, so the table shows 2 status types.
- QuarryDB Cloud fits an Engineering team. A Pending request means the frame 13 duplicate line shows if Riley asks for it in chat, which is a free extra demo of frame 13.
- Bastion NGFW VM stays N (not approved) after the decline. A Declined request is not D (declined and blocked). See question 9.
- This replaces the spec's frame 2 placeholder rows (Meshwire Pending, Auditlane Declined), as decided in row 4 open question 4.

## 3. Cloudscape error boundary (row 6 Build notes, E3 (drawer fails to load))

**Found: yes.** Cloudscape has an Error boundary component.

- Live page: https://cloudscape.design/components/error-boundary/ (checked Nov 15, 2026). Listed in https://cloudscape.design/llms.txt as "Rendered around any part of the application to isolate unexpected errors."
- Package: `@cloudscape-design/components/error-boundary`. It is in version 3.0.1404 (the version in grounded-answers). The latest on npm today is 3.0.1413.

What the page says, and what it means for frame 22:

| Page says | For frame 22 |
| --- | --- |
| Must be inside `I18nProvider`, or get `i18nStrings`. | `src/main.jsx` adds `I18nProvider`, or we pass our strings. |
| App layout, container, modal, drawer and table have built-in boundaries. They turn on only when a standalone boundary is higher in the tree. | Wrap the drawer content in our own boundary, so the drawer header and close button stay. |
| Do: add a section-level boundary when a different fallback is needed, for example a context-specific action. | Our fallback is different (our Alert copy, "Reload page", request form link), so a section boundary follows the guideline. |
| Do: also have one top-level boundary for the whole app. | Add one around the app, with the default fallback. Not in the spec yet. I will add it unless you say no. |
| Don't use it for expected or async errors. | Connection, E1 and E2 stay as try and catch in code, not the boundary. Matches the spec. |
| Fallback has header, description and one action, default "Refresh page". `renderFallback` replaces all of it. | `renderFallback` shows the frame 22 Alert. Our button says "Reload page" (spec copy). |
| `onError` gets the error. | We keep the error message for the "Error details" section. |
| Tests: `__awsui__.forceError()` shows the fallback without a real error. It does NOT call `onError`. | With forceError, "Error details" would be empty. See question 7. |

## 4. Questions

| # | Question | Options | My recommendation |
| --- | --- | --- | --- |
| 1 | How does the prototype choose Riley or Sam? The spec has no switch. | A: a buyer menu in the top navigation (Riley, Sam). Switching clears the conversation. B: a URL parameter, for example `?buyer=sam`. C: 2 separate URLs. | A. It is visible for demos and fits the console account menu. B as a backup for tests. |
| 2 | How does Claude get alternatives? Week 1 has `approved_only` on a text search. Decision 62 says code finds them by category. Frame 17 shows alternatives with no ask, but frame 25 (price) shows none. | A: replace `approved_only` with `alternatives_for` (a product_id) on search_products. Claude calls it when the path needs alternatives. Still 3 tools. B: code adds alternatives to every single non-approved search result. C: a 4th tool (needs your OK). | A. B would add alternatives to frame 25 and 27, which the spec says not to do. Trade-off: frames 17, 18 and 24 cost 1 more paid request per turn. |
| 3 | Row 7 says code adds a List item "for each product the answer names". Frame 6 lists all results. How does code know which products the answer names? | A: code looks for product names in Claude's final text, only among this turn's tool results, and lists them in ranked order. B: always list every result of the turn. C: Claude passes product IDs in a tool. | A. B would list extra products in 5b (comparison) if Claude searched widely. Frame 6 still works, because Claude names all 3. |
| 4 | Frame 7 choices. The spec lists 4 fixed choices, but the 9 "security" matches have 8 categories in my table. Who makes the choices, and what does a choice do? | A: code makes up to 4 choices from the categories of the matches (most matches first, then catalog order). A choice filters the same 9 matches by category, so no new search. B: Claude writes the choices. C: keep the 4 spec choices as fixed text for "security" only. | A. It is the same each time and testable. Trade-off: the 4 choices change from the spec ("Observability platform" would be first). |
| 5 | Copy that sits next to the card: the note and PO ask (frame 11 says "the frame 5 copy") and "Here's the request I'll send to your administrator." Claude or code? | A: both are fixed in code. B: Claude writes them. | A. Code owns the card, and decision 66 (asked once) is easier to hold in code. The note ask uses only the last 2 sentences of frame 5. |
| 6 | When does a "Request \<product>" support prompt show? Frame 6 has 2 N (not approved) products and no prompt. Frames 9, 24, 25 and 27 (5b) have one. | A: show it only when exactly 1 product in the answer can be requested (N, requests on, no open request). B: one prompt for each product that can be requested. | A. It matches every frame in the spec. |
| 7 | E3 test. The spec says force the crash in a test only, with no control on the page (decision 84). Cloudscape's `forceError` doesn't fill "Error details". | A: `forceError` only. "Error details" is empty in the test. B: a test-only switch that throws inside the drawer. It works only in dev mode and is never in the Vercel build. No visible control. C: both. | C. A tests the Cloudscape path. B tests the details and the copy button. |
| 8 | Ranking (decision 19) with Week 1's typo match. Where does a match that only works with a typo go? And is "vendor name match" exact, or "contains"? | A: typo-only matches go last (tier 5). Vendor tier is "vendor name contains the search text". B: a typo counts as the tier of the field it matched. | A. A real match should beat a guess. It doesn't change any spec frame: "VPN" is all tier 4, catalog order (Meshwire, Tunnelport, Shalecrest), which is the frame 6 order. |
| 9 | The spec checks "no open request" (decision 18). Can Riley send a new request for a product whose last request is Declined, Canceled or Expired? | A: yes. Only Pending blocks a new request. Only D (declined and blocked) blocks all requests. B: Declined also blocks. | A. It follows the words "open request", and D already covers "blocked". |
| 10 | Step 4 GIFs. Real Claude or the fake agent? | A: fake agent, 0 paid requests. B: real Claude, about 12 paid requests. | B for the 2 or 3 GIFs in the case study, because they show the real agent. A for the rest. |

Smaller notes (no answer needed unless you disagree):

- The spec intro says frames 3 and 6 go through the Figma round trip. The Nov 15 Build note and decision 114 say frame 3 only. I follow frame 3 only.
- I will not add `category` to the text that search matches against, so the spec counts stay true ("VPN" 3, "security" 9).
- The spec frame 6 order was a placeholder. With the ranking rule, it stays Meshwire, Tunnelport Access Server (BYOL), Shalecrest UTM 9.
- The new repo needs a CLAUDE.md with its design mode. I will write "System (Cloudscape)" in step 1, the same as pmp-tiny-agent.

## Lisa's answers (Nov 16)

Categories: approved as proposed, with 2 changes.

- Watchtail Agent: "Monitoring agent for EC2". Watchtail Operator: "Monitoring agent for Kubernetes". (2 categories. An EC2 image can't replace a Kubernetes install, so they aren't alternatives for each other.)
- Paneway Server 2022 Base: "Server operating system" (buyers see category names in the reason line and the step line).

Sample rows: approved. QuarryDB Cloud (pay-as-you-go) Pending, Nov 10, 2026, 10:42. Bastion NGFW VM Declined, Oct 27, 2026, 15:08.

Questions:

- Q1 (Riley or Sam switch): A, a buyer menu in the top navigation. Switching clears the conversation. Also B, a ?buyer= URL parameter, for tests.
- Q2 (how Claude gets alternatives): A, alternatives_for (a product ID) on search_products. Still 3 tools. Step 2 builds it. Step 1 only needs shared/alternatives.js.
- Q3 (which products get a List item): A, code finds product names in Claude's final text, only among this turn's tool results. Add a free test where the text uses a short name, for example "Tunnelport" for Tunnelport Access Server (BYOL), and tell me what code does with it.
- Q4 (frame 7, more than 5 matches, choices): C plus A.
  - For the search text "security", the dialog shows the 4 spec choices in this order. Each choice maps to categories:
    - "Threat detection and response": Threat detection and response, Managed threat detection service, Incident response service
    - "Firewall and VPN": Network firewall, Remote network access (VPN)
    - "Compliance automation": Compliance automation
    - "Server and workload protection": Server and workload protection
  - Keep this mapping as data (for example data/clarifyChoices.json), not in component code.
  - For any other search with more than 5 matches: option A. Code makes up to 4 choices from the categories of the matches (most matches first, then catalog order).
  - A choice shows ALL products in the chosen categories, not only the products that matched the search text. Example: "Firewall and VPN" shows Bastion NGFW VM, Meshwire, Tunnelport Access Server (BYOL) and Shalecrest UTM 9. "Threat detection and response" includes Talonix Platform.
  - The order of products in a choice result: there is no search text to rank by. Propose an order in your report. Do not decide a new rule without asking. The fake agent can use catalog order until I answer.
  - If a choice result has more than 5 products: tell me. Do not add a rule for it.
- Q5 (note and PO ask, "Here's the request I'll send to your administrator."): A, both fixed in code (shared/copy.js).
- Q6 (when a "Request <product>" support prompt shows): A, only when exactly 1 product in the answer can be requested.
- Q7 (E3 (drawer fails to load) test): C, both forceError and a dev-only switch that throws inside the drawer. The switch is never in the Vercel build and has no visible control.
- Q8 (typo matches, vendor tier): A, typo-only matches go last (tier 5). Vendor tier is "vendor name contains the search text".
- Q9 (new request after Declined, Canceled or Expired): A, only Pending blocks a new request. Only D (declined and blocked) blocks all requests.
- Q10 (GIFs, real Claude or fake agent): decide at step 4.
- Top-level Error boundary around the whole app with the default fallback: yes (Cloudscape Error boundary guideline).
- Step 2 paid requests: keep run A (about 12). Run B becomes smaller: only the frames where Claude's wording is the subject of the test, P1 and P2 ("I can't buy products for you." first), P3 (price), P5 (simple questions), 5d (too-big request), H3 (questions the agent can't answer) and 1 Sam requests-off turn. About 14. Free tests and the Week 7 evals cover the other frames. Change section 5 of docs/build-plan.md to say this. New total: about 32 paid requests (about 26 in step 2, 3 in step 3, 3 in step 4), or more with real GIFs.

## Lisa's answers (Nov 16, step 1 report)

- Q3 (List items, short names): B. Also match a short name when exactly 1 product in this turn's results starts with that word. "Tunnelport" finds Tunnelport Access Server (BYOL). "Watchtail" matches more than 1 product, so it finds nothing. Change the Q3 short-name test, and add a test for the "Watchtail" case.
- Q4 (order inside a frame 7 choice result): B. Products approved for this buyer first, then catalog order. Add tests for Riley and Sam.
- Badge color #3759ce is correct. Keep calling it purple (blue could be mistaken for AWS blue). Make docs/deviations.md D1 say "purple" only.

## Lisa's answers (Nov 16, step 1 fixes report)

1. Keep out: Request demo, free trial, cost tables, Region select, Get support, and "Sold by" for Meshwire. The spec wins.
2. Keep out: Info links, "Show more" under the header description, and the refresh and preferences buttons on Product requests. Each would be a control that does nothing.
3. Product page tabs: keep the tabs that jump to sections, as in the frame and the live AWS Marketplace product page. Make the active tab follow the scroll. Log it in docs/deviations.md as D5: Cloudscape Tabs are not for jumping to sections on one page (Anchor navigation is). Source: Lisa's frame and the live AWS Marketplace product page. Approved by Lisa Nov 16. Add a free test that the active tab changes when the page scrolls to a section.
4. Product requests: keep "Find requests" and pagination, as in the frame.
5. Gradient fill on the primary "Request product" (Product requests): make the gradient darker until the white text is at least 4.5:1 at every point of the gradient, in the default, hover and active states. Keep the same hue direction (blue to purple). Update D4 with the new values.
6. Breadcrumb: keep it without the delivery method crumb.
7. Left nav items outside the prototype: keep the "not part of the prototype" page.
8. "What is Private Marketplace?": replace the text with this text, word for word. It comes from Lisa's wireframe, from the version approved for launch. She can't confirm it matches the live site today.

   "Private Marketplace is a new feature that makes it simple to control which AWS Marketplace products developers can procure. Built on top of AWS Marketplace, Private Marketplace enables administrators to create and customize a curated digital catalog of approved independent software vendor (ISV) products that conform to their in-house policies. Business users and engineering teams can now find, buy, and deploy products from AWS Marketplace in their custom Private Marketplace, knowing that all available products comply with their organization's policies and standards."

9. Q3 short names: a short name matches only when it starts with a capital letter in Claude's text, and exactly 1 product in this turn's results starts with that word. Free tests: "Tunnelport" matches, "a managed service" doesn't.

Questions from the round 2 report:

- Sticky tab row: yes. Build it and add it to D5 (source: the live AWS Marketplace product page keeps its tab row in view).
- "Find requests" and pagination with 2 rows: yes, log it as D6 (Cloudscape Table: only use filtering, pagination and sorting if there are more than 5 items. Source: Lisa's frame and the live console).

Design review suggestions:

- Header count: when the filter finds nothing, show the total, not (0).
- "Cancel request" cut off on tablet and phone widths: fix it.
- Side nav doesn't open again after the drawer closes: fix it, with a free test.
- Details: keep Cloudscape Key value pairs (labels on top). No change.
- Heading levels: 1 h1 per page and no skipped levels. Report the final structure for each page.

README: add "Differences from the live AWS Marketplace console", with a link to docs/deviations.md. Keep the "View purchase options" note.

## Lisa's answers (Nov 16, step 2 start)

- Decision 148 approved. On tablet and phone widths, the Status column on Product requests stays hidden behind the fixed Actions column (the column order comes from the frame and the spec, and the demo is for desktop). The "Date requested (UTC-05:00)" header cut at 1024px stays.
- Paid runs A and B use a runner script (prompt-2.md section 4), not typing on localhost.
- The fake agent stays for tests. `npm run dev` uses real Claude. Playwright and a new `npm run dev:fake` command use the fake agent.

## Lisa's answers (Nov 16, step 2 part 1 report)

1. Q1 (hand-off bubble): code writes it. For frame 17 (requests off) and frame 18 (product can't be requested), and their variants (frames 9 and 10 Sam variants, frame 24 Sam and D (declined and blocked) variants, frame 25 Sam variant), code adds the hand-off line as its own stacked bubble with the spec text, word for word:
   - Frame 17: "Product requests are turned off in your Private Marketplace, so I can't send a request for <product name>. To ask about it, speak with your administrator." (Riley never gets this case. If a case needs "contact your administrator", tell Lisa.)
   - Frame 18: "This product can't be requested. To ask about it, contact your administrator." Then the contact bubble for Riley.
   Claude's text stops before the hand-off and does not repeat its sentences. Change S10, S11, S16, S20 and T10 to T12 to fit, and show the before and after. If a turn has more than 1 product that needs a hand-off, tell Lisa what code does. Do not decide a new rule.
2. Q2 (frame 19, a question the agent can't answer): no tool call. Code adds "Contact details: yes" or "Contact details: no" for the buyer's Private Marketplace as an app note to each message. Remove the check_request_settings call from S17, and "asks something you can't help with" from T3. No step line in frame 19. Tell Lisa how code knows to show the contact bubble after Riley's frame 19 line.
3. Q3 (history): keep the app notes. Run A will show if Claude searches again on a follow-up.
4. Q4 (frame 7 choice answer): code writes it. No change.
5. Q5 (U5 test and the T4 card sentence): approved. U5 checks that "ask the buyer to confirm" is gone.
6. Q6 (refusal fallback): keep it. The runner records which model wrote each answer (from usage.iterations), and summary.md shows a column for it. If a fallback model answered, summary.md says so.
7. Q7 (runs/ folder): keep the run files in GitHub. Do not add runs/ to .gitignore.
8. Q8 (empty history entry after "Submit request"): the server-side fix is approved.
9. Section 5, proposal 1: approved. Remove "unless the buyer asks for more" from S6.
10. Section 5, proposal 2: approved. Remove "and check_request_settings shows requests are enabled" from the submit_request description (decision 17: submit request goes by the requests line in the search results).
11. Section 5, proposal 3: approved. Add a rule that Claude doesn't write a request offer in its text, because the app shows the request option (Q6, request support prompt). Keep S18 for when the buyer asks about requests. Show the exact words as "Draft, Lisa to approve".
12. Section 5, proposal 4 (a short remark before a tool call): no change now. Run A will show if it happens.

## Lisa's answers (Nov 16, part 1b report)

1. More than 1 product needs a hand-off in one answer: code shows 1 combined bubble, not 1 bubble for each product. The List above it already names the products. Copy, word for word:
   - Frame 17 (requests off), 2 or more products: "Product requests are turned off in your Private Marketplace, so I can't send a request for these products. To ask about them, speak with your administrator."
   - Frame 18 (can't be requested), 2 or more products: "These products can't be requested. To ask about them, contact your administrator." Then the contact bubble once (Riley only).
   - 1 product: the spec text, as now.
   - Use "contact your administrator" in place of "speak with your administrator" when the Private Marketplace has contact details, the same rule as now.
2. The rule "no hand-off bubble when Claude's text already has a hand-off line" is approved. Keep its test.
