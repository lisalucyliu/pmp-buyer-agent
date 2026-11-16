# Demo 2 build decisions (not all are in the spec's Build notes)

Written Nov 15, 2026, from the Week 6 handoffs (decisions 1 to 114). Read this file together with `docs/demo2-spec.md`. When this file and the spec are different, ask Lisa. Decision numbers come from the Week 6 handoffs in Lisa's Claude project.

## Who, what, where

- Lisa is a senior UX designer. She reviews every step on localhost. Her review wins over your report.
- Repo: `~/pmp-buyer-agent`, a new repo. Vite, React, Cloudscape components, and a Node server function on Vercel. Same setup as `~/grounded-answers` (Demo 1). You can read that repo for patterns. Do not change it.
- Week 1 agent: `~/pmp-tiny-agent` (Python). Read it. Do not change it. Port its 3 tools (search products, check request settings, submit request), its tool descriptions and its system prompt to this repo, with the changes below.
- `data/catalog.json` in this repo becomes the source of truth for the fictional catalog. Copy it from pmp-tiny-agent, then apply the data changes below.
- Fictional data only. Marketplace company: Initech. Buyers: Riley (Engineering, requests on) and Sam (Finance, requests off).
- Model: `claude-sonnet-5-5`, effort low. The API key is in `.env.local` locally and in Vercel environment variables (Production). Lisa makes a new Claude Console workspace with a $10 monthly limit.

## How to work with Lisa

- Ask before any paid request (a real call to Claude). Say how many. Free tests mock Claude.
- Every short ID gets a few words in parentheses each time, for example N (not approved), E1b (service not available).
- Write reports in ASD-STE100 Simplified Technical English. No em dashes.
- Check the live Cloudscape site (cloudscape.design) for components and patterns. No deviation from Cloudscape without Lisa's OK. Log each approved deviation.
- Measure in the browser before you report a visual result as done.
- Do not commit or push. Lisa commits and pushes with GitHub Desktop.

## Data changes

- Remove Ironveil Cloud Guard (decision 20). New counts: 33 products; A (approved) for both buyers: 6.
- Add a `category` field to each product (decision 57). You propose the values; Lisa approves the list before the build uses it.
- Each experience has an experience name (admin only) and a branding name and branding description (buyer facing) (decision 22). Drafts approved (decision 92): "Initech Engineering Marketplace" (description includes eng-software@initech.example and #eng-software-requests) and "Initech Finance Marketplace" (no contact details).
- Request record: account ID, product, experience, note, PO number, date, status. No buyer name (decision 25).
- Sample rows on Product requests: 2 N (not approved) products other than Meshwire. You propose them; Lisa approves (decision 83).
- Product page route: map each product_id to a console product page route in the prototype. Do not use the example.com links in catalog.json.

## Agent rules for code (not left to Claude)

- Ranking rule for 5 or fewer search results (decision 19, decided Nov 15): 1) exact product name match, 2) product name contains the search text, 3) vendor name match, 4) description match. Ties keep catalog order. More than 5 matches: the agent asks a clarifying question (frame 7).
- Alternatives: code finds A (approved) products in the same category and ranks them with the same rule. Top 5, plus a discovery link when there are more (decision 62).
- Duplicate check runs when the agent would open the card (decision 18). The same check runs again when "Submit request" is selected (decision 78).
- Submit request goes by the requests line that search results already include (decision 17).
- Claude never sees the words "declined" or "blocked". Change `STATUS_LABELS` and the D (declined and blocked) result in submit request. The buyer hears "This product can't be requested." (decision 16).
- Contact details: code finds them in the branding description. Claude gets only yes or no (decision 87).
- Product links: code makes them. Claude never sees a URL (decision 103).
- Render Claude's text as plain text, not markdown (decision 110).
- Internal name `product_request`. One term in code. Buyers see "Product requests"; admins see "Approval requests" (decisions 23, 64).
- Error type comes from code (row 6 Build notes).

## System prompt and tool description changes (Week 1 to Demo 2)

Before you rewrite the system prompt, use the few-shot-patterns skill from the prompt-architecture plugin (Lisa installed it). Week 1 lesson: Claude copies the examples, mistakes included.

- Remove "If a product is retired, say so and name its replacement" (decisions 4, 20).
- Remove "Always ask the buyer to confirm" from the submit request description (decision 21). The card is the confirmation.
- No "experience" in buyer-facing text or examples, including the "Finance experience" example. Say "your Private Marketplace" or the branding name (decisions 22, 24).
- Week 1 carry-over: shorten the requests-off answer; fix the "submit the request for you" wording; give the product description before the approval status.
- Requests-off order: answer, alternatives, then the hand-off line. Remove the line about including product links and the AWS docs link (decision 91).
- Replace "When a product is approved, give the buyer its product page link" with a line that the app shows product links. Remove the link-format rules and the `<link>` placeholders in both examples. Keep "You cannot purchase anything." (row 7 Build notes).
- New rules: "I can't buy products for you." first for any buy request; no prices, ranges or pricing models; P5 (simple questions) limits: at most 3 short sentences, catalog facts only, no recommendation, at most 5 products; too-big request copy from decision 112 (row 7 Build notes).
- Note and PO number: asked once per conversation, before the first card (decision 66).

## Figma

- Lisa's rule, word for word: "Use the Figma frames for layout and components only. Text, labels and product data come from the spec and catalog.json."
- Read only the purple "Demo 2" section of the Figma file "HR". The Figma round trip covers frame 3 (product page, not approved) only (decision 114).

## Order and scope

- Steps: 0 plan and proposals; 1 pages with a fake agent; 2 agent server function and drawer states (rows 1 to 5, 7); 3 error states (row 6) and Vercel deploy; 4 Figma round trip, Supabase, motion, GIFs.
- Hard end: Wed Nov 18. If time runs out, motion goes to the parking lot first, then Supabase.
- Until Supabase, requests live in the browser session only. The README says so (decision 79).
- Parking lot, do not build: card expiry (decision 70), output label, stop and regenerate buttons (decisions 95, 98).
- Still open: Supabase save error types (frame 12 stays "connection error" for now).

## README items (collect as you build)

- Session-only requests until Supabase (decision 79).
- Which drawer parts come from code, not Claude: step lines, lists, card, contact bubble, error Alerts (decision 95).
- E3 (drawer fails to load) has no AWS Support line, because it is a prototype (decision 101).
- "View purchase options" as every product's primary CTA is a simplification (Talonix Platform).
- Category names and all products are fictional.
