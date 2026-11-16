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
