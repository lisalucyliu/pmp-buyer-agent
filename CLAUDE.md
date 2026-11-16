# pmp-buyer-agent

Demo 2. Concept prototype of a product request assistant inside a Private Marketplace buyer console. Inspired by AWS Marketplace's Private Marketplace. Not affiliated with AWS. All companies, products, people and category names are fictional.

Read first: docs/demo2-spec.md, docs/build-decisions.md, docs/build-plan.md, docs/proposals.md (with "Lisa's answers (Nov 16)" at the end). When the docs disagree, ask Lisa.

# Design mode
- System (Cloudscape), the same as pmp-tiny-agent.
- Check the live site (cloudscape.design) for each component and pattern. For AI parts, check the Gen AI section first. Don't rely on memory.
- If no component or pattern fits, flag the gap and suggest up to 3 options. Don't invent one.
- No deviation from Cloudscape without Lisa's OK. Log each approved deviation in docs/deviations.md with its source (decision number, spec section or Lisa's answer, and date).
- Measure in the browser before you report a layout as done.

# Project rules
- Never commit or push. Lisa commits and pushes with GitHub Desktop.
- Never call the Claude API (a paid request) without Lisa's OK and a count of how many calls. Free tests use the fake agent or a fake Claude client.
- data/catalog.json is the source of truth for the catalog. ~/pmp-tiny-agent and ~/grounded-answers are read only.
- Fictional data only. No example.com links in data/ that the app or Claude uses.
- Rules that must always hold go in code (shared/), not only in the system prompt.
- Tool descriptions and the system prompt are design decisions. Show Lisa the before and after for each change.
- The agent has 3 tools: search_products, check_request_settings, submit_request. Ask before you add or remove a tool.
- Claude never sees a URL, contact details, or the words "declined" or "blocked".
- Every short ID gets a few words in parentheses, for example N (not approved), E1b (not available).
- Reports use ASD-STE100 Simplified Technical English. No em dashes.

# How to run
- Install (once, or after package.json changes), in a terminal tab in the ~/pmp-buyer-agent folder: npm install
- App on localhost: npm run dev
- Unit tests: npm run test:unit
- UI tests (fake agent, no Claude calls): npm run test:e2e
- Restart npm run dev after a change to data/ or dev/.
