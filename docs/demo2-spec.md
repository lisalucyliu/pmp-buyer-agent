# Demo 2 design spec

Nov 12, 2026 · @Lisa

Row 1 (entry points and search results) has 8 frames. Claude Code builds every frame in React with Cloudscape. Frames 3 and 6 also go through the Figma round trip: you build them with the Cloudscape Figma library (decided Nov 14). I checked each Cloudscape page on the live site on Nov 12. Decisions 30 to 35 and the row 1 notes in the Week 6 tab are the base.

**Build note, Figma wireframes (Nov 15):** Read only the purple section "Demo 2" in the Figma file "HR". It has 4 frames: PMP buyer home, PMP buyer product requests, PMP buyer PDP approved, and PMP buyer PDP not approved. Use the frames for layout and components only. Text, labels, product names, graphics and branding come from this spec and catalog.json. When a frame and the spec are different, the spec wins. The sticky notes in the section are build notes for Claude. Frame 6 (search results in the drawer) has no Figma wireframe (decided Nov 15, no functional need): build it from this spec. The Figma round trip now covers frame 3 only.

Each frame lists layout, Cloudscape components, copy and states. Copy is a draft for you to change. Items that still need your call are in Open questions. Add a section for rows 2 to 7 when you start each one.

Test data in the examples comes from `data/catalog.json` in pmp-tiny-agent. Riley (Engineering, requests on) is the buyer unless a frame says Sam (Finance, requests off). Ironveil Cloud Guard is left out (decision 20, removed in Build).

## Row 1: Cloudscape checks (Nov 12)

Four findings change the plan: messages in a drawer all align to one side, the drawer also gets a trigger bar icon, a clarifying question has its own Cloudscape method, and Badge says not to use it for status. They are in Open questions.

| Pattern or component | What the live page says | What it means for row 1 |
| --- | --- | --- |
| [Generative AI chat](https://cloudscape.design/gen-ai/patterns/generative-ai-chat/) | Side-panel surfaces align every message to the same side and use an avatar or name to show the author. Keep the prompt input pinned; only the message log scrolls. Terms: "generative AI assistant", "responses", "submit". Placeholder text: "Ask a question". Disclaimer goes in constraint text. Error: error alert with a recovery action such as "Try again". | All bubbles start-aligned in the drawer, with avatars. Prompt input in the drawer footer. No thumbs up or down and no copy action in row 1 (not needed for this task). |
| [Ingress](https://cloudscape.design/gen-ai/patterns/ingress/) | Secondary button with the sparkle (gen-ai) icon when a primary button already exists. One primary per page. The standalone sparkle is for features where AI is the main function, for example an "Ask AI" button. | Matches decision 31. Label draft "Ask AI" comes from this page. |
| [Button](https://cloudscape.design/components/button/?tabId=usage) | Labels are 1 or 2 words, start with a verb, no articles, no end punctuation. Icon before the text. Don't hide buttons; disable them. | "Ask AI" fits. Disabled "View purchase options" stays visible on the product page. |
| [App layout](https://cloudscape.design/components/app-layout/?tabId=usage) | Each drawer has an icon in the trigger bar at the upper right. Users open and close it there or with the close button. Drawers are closed by default on mobile. | The drawer gets a gen-ai icon in the trigger bar on every console page, in addition to the page header buttons. |
| [Drawer](https://cloudscape.design/components/drawer/?tabId=usage) | Keep the open or closed state across pages. Show an empty state when an on-page action opens the drawer. One h2 title in the header. Footer holds the prompt input in a chat. Don't put critical content in a drawer. | One conversation carries from page to page. The agent is supplemental: the existing request form still works. |
| [In-chat context](https://cloudscape.design/gen-ai/patterns/in-chat-context/) | Pre-fill what can be inferred. Confirm what the agent received and how it will use it. Don't ask for what the system already has. | The page doesn't cover context from the page itself, only context the user adds. Frame 5 applies its rules to the product page. |
| [Support prompts](https://cloudscape.design/gen-ai/patterns/support-prompts/) and [Support prompt group](https://cloudscape.design/components/support-prompt-group/?tabId=usage) | Editable prompts (edit icon) help users get started. Non-editable prompts send at once and guide the next step. Up to 5 at a time, under 72 characters, hide old prompts after a message is sent. Horizontal at the start of a chat, vertical under responses. | Frame 4: 2 editable, horizontal. Frame 5: 2 non-editable, vertical. |
| [Follow-up questions](https://cloudscape.design/gen-ai/patterns/follow-up-questions/) | To clarify intent before a response, show predefined choices in a dismissible dialog docked to the prompt input. To narrow a broad response, use a support prompt group with up to 5 choices. Avoid free-text replies when choices can do the job. Order choices by relevance. | Frame 7 (more than 5 matches) needs one of these. See Open questions. |
| [Progressive steps](https://cloudscape.design/gen-ai/patterns/progressive-steps/) | While working, show a loading status on the last step. When done, show the steps in an expandable section, collapsed by default. No loading state under 1 second. | The step line (what the agent searched) is a collapsed expandable section with the steps inside. |
| [Generative AI loading states](https://cloudscape.design/gen-ai/patterns/generative-ai-loading-states/) | Processing: loading avatar plus loading text. A response with a list: loading bar plus text where the list will show. Text format: "Generating a response", "Loading list of S3 buckets", no end punctuation. | Frame 8 copy. |
| [Avatar](https://cloudscape.design/components/avatar/?tabId=usage) and [Chat bubble](https://cloudscape.design/components/chat-bubble/?tabId=usage) | Gen AI color and gen-ai icon for the assistant. Tooltip with the full name. Don't rely on alignment alone. Unique aria label per bubble. | Assistant tooltip: "Generative AI assistant". Buyer avatar: initials (RK for Riley is a placeholder). |
| [List](https://cloudscape.design/components/list/?tabId=usage) | Link as main content, description as secondary content, tags or brief details in the actions slot. Use secondary links when every item is a link. | Frame 6 results: product name link, vendor and description, badge in the actions slot. |
| [Badge](https://cloudscape.design/components/badge/?tabId=usage) | Colors: grey, blue, green, red, and 5 severity colors. Text only, no icons. "Avoid using badges to indicate status"; use a status indicator. | Purple is your approved deviation (decision 33). The status rule is a second point to note. See Open questions. |

## Row 1 frames 1 to 3: entry points

All 3 pages use the console chrome from your console Private Marketplace redesign (light header, console top nav, AWS Marketplace left nav). The drawer is closed in these frames. The button label changes by page, and every button opens the same drawer.

**Shared on all 3 pages**

- **Entry point buttons:** Button with the gen-ai icon before the text. "Request product" on My Private Marketplace and Product requests. "Request approval" on the product page. Decided Nov 13 and 14: this agent is only for product requests, not for general AI use, so no page uses "Ask AI".
- **Trigger bar:** App layout drawer trigger with the gen-ai icon at the upper right. Aria label: "Open product request assistant".
- **Drawer state:** when the buyer opens the drawer and then goes to another page, the drawer stays open with the same conversation.

### Frame 1: My Private Marketplace (Riley)

- **Layout:** your 2023 buyer page. Page header "My Private Marketplace". Branded welcome container with the Initech branding name and branding description. "Product request enabled" shows for Riley.
- **Header actions, left to right:** "Request product" (normal, gen-ai icon), then "Explore your Private Marketplace" (primary, stays the only primary). "Request product" opens frame 2b. "Explore your Private Marketplace" opens the discovery page with the Approved products filter on. "Discover products" in the left nav opens it with no filters. Keep both labels (decided Nov 14).
- **Sam variant (optional frame):** same page. The request status shows "Product request disabled" in place of "Product request enabled". Product requests is hidden in the left nav (decided Nov 13). "Request product" is hidden for Sam (decided Nov 14). The trigger bar icon still opens the drawer for approval checks and alternatives.

### Frame 2: Product requests (Riley)

- **Layout:** App layout with a full-page table of Riley's submitted product requests (left nav: Private Marketplace > Product requests). Status labels Pending, Approved, Declined, Canceled, Expired (decision 15).
- **Header actions, left to right (your decision, Nov 12):** "Discover products" (normal), then "Request product" (primary, gen-ai icon). "Request product" opens the drawer. "Discover products" goes to the Private Marketplace discovery page, where the buyer searches by themselves.
- **Icon position:** the gen-ai icon goes before the text (Button and Ingress: icons go before the text).
- **Row action:** (decided Nov 14) "Cancel request" is an inline link button in the last column, Actions. It shows only on Pending rows. Other rows show "-" (Table: use a hyphen for empty values). Aria label: "Cancel request for \<product name>" (Table: repeated controls need unique names). No row selection. Trade-off: no bulk cancel, which AWS allows.
- **Sam variant (requests off):** the page is hidden from the left nav (decided Nov 13; Disabled and read-only states: hide an item the user can't turn on). Exception: a buyer who sent requests before the admin turned requests off still sees the page, with "Request product" hidden. Your reason: the PMP team very likely hides this page too.
- **Drawer opened from "Request product" on My Private Marketplace or Product requests (frame 2b):** the empty state uses request copy, because the button promised a request. Heading: "Request a product". Description: "I'm a product request assistant powered by generative AI. Tell me which product you need. I'll check if it's already approved, and if it isn't, help you send a request to your administrator." No support prompts (the buyer must name the product).
- **Sample rows (placeholder data):** Meshwire, Pending. Auditlane, Declined.
- **Columns and status (decided Nov 14):** Requested product (primary link to the product page), Status, Date requested (UTC-05:00), Actions. Table: the first column is the unique identifier, the second is status, and in-context actions go in the last column. Default sort: Date requested, newest first. Status labels with their Status indicator types: Pending (pending), Approved (success), Declined (error), Canceled (stopped), Expired (stopped).

### Frame 3: Product page, not approved (Riley, Meshwire)

- **Layout:** console product page with console chrome and light header, as in your ADC audit. Product title "Meshwire" (vendor equals the product name, so no separate vendor line is needed in the title area).
- **Alert:** an info Alert in the Flashbar's place, with no button (decided Nov 13; replaces the Flashbar in decision 32). Flashbar is for task operation status. Here the Alert is the disabled reason for "View purchase options" (Disabled and read-only states). Copy for each case is in the next table.
- **Right-hand action stack (ADC stack), top to bottom:**
  1. "View purchase options", disabled, with its existing disabled reason.
  2. "Request approval", normal variant, gen-ai icon, enabled. Opens frame 5.
- **No other buttons:** no Request demo, no Request private offer, none of agent mode's newer features (decision 34).
- **Why "Request approval" stays normal here:** the disabled "View purchase options" is still the page's primary button. One primary per page (Ingress, Button).

**When "Request approval" shows (decided Nov 13).** Hiding is correct here because the buyer can't turn the button on (Disabled and read-only states).

| Case | "Request approval" | Info Alert text |
| --- | --- | --- |
| N (not approved), requests on, no open request | Shows | "This product isn't approved for purchase in your Private Marketplace. You can request approval from your administrator." |
| Request is Pending | Hidden | "You requested approval for this product. View its status in Product requests." (Product requests is a link.) |
| A (approved) | Hidden | No Alert. "View purchase options" is enabled and the purple badge shows. Approved product pages have no agent button. |
| Sam (requests off) | Hidden | "This product isn't approved for purchase in your Private Marketplace. Product requests are turned off." |
| D (declined and blocked) | Hidden | "This product isn't approved for purchase in your Private Marketplace. This product can't be requested." |

## Row 1 frames 4 and 5: the drawer

**Shared drawer structure (all drawer frames)**

- **Header (h2):** "Product request assistant" (decided Nov 14). Logged as a copy deviation, because the Cloudscape term is "generative AI assistant". Both empty states (frames 2b and 4) say the assistant is powered by generative AI. Close button from App layout.
- **Content:** the conversation. All chat bubbles start-aligned (side-panel rule). Outgoing bubbles (buyer) use the default avatar with initials. Incoming bubbles (assistant) use the Avatar gen AI color and gen-ai icon, tooltip "Generative AI assistant". In stacked bubbles, only the first shows the avatar. Content region: `role="region"`, aria label "Chat".
- **Footer (sticky):** Prompt input with the send action button and no secondary actions (no upload, no shortcut menus). Placeholder: "Ask a question". Constraint text (disclaimer): "Use of this service is subject to the AWS Responsible AI Policy." "AWS Responsible AI Policy" is an external link with the external icon (approved Nov 12).

### Frame 4: drawer, empty state (opened from the trigger bar icon)

- **Empty state text (no bubble):**
  - Heading: "Ask about products in your Private Marketplace"
  - Description: "I'm a product request assistant powered by generative AI. I can check if a product is approved for purchase, find approved products that do the same job, or help you request a product from your administrator. Choose a prompt or enter your own."
- **Support prompt group:** horizontal, editable (edit icon), 2 prompts. Selecting one fills the prompt input and doesn't send it.
  1. "Is \<product name> approved for purchase?"
  2. "Find an approved product for \<what you need>"
- **Sam variant (requests off):** the description leaves out the request part: "I'm a product request assistant powered by generative AI. I can check if a product is approved for purchase or find approved products that do the same job. Choose a prompt or enter your own." Same 2 prompts.
- **Why these 2 prompts:** they match the 2 main jobs (one specific product first, then alternatives). A request prompt isn't useful before the buyer has named a product.

### Frame 5: drawer opened from the product page (Riley, Meshwire, not approved)

The agent speaks first and names the product, so the buyer doesn't have to type it (In-chat context: pre-fill, then confirm what was received). There is no outgoing bubble yet. The agent goes straight into the request, because the "Request approval" button promised one (decided Nov 13 and 14). Alternatives are a secondary choice.

- **Incoming bubble:** "You're looking at Meshwire. It isn't approved for purchase in your Private Marketplace. I can send a request for approval to your administrator. Add a note for your administrator about why you need this product. A PO number is optional." (Asked once in chat, decision 14. The note is required and the PO number is optional: Lisa, Nov 21, from the AWS buyer docs and blog. This replaces the optional note.)
- **Support prompt group:** vertical, non-editable (sends at once), 1 prompt: "Show approved alternatives" (row 2). "Continue without a note" is removed, because the note is required (Lisa, Nov 21).
- **No step line:** the product and its approval status come from the page, so there is nothing to show as a search.

No Sam or D (declined and blocked) variants: those products don't get the "Request approval" button (frame 3 table), so this drawer doesn't open for them from the product page.

## Row 1 frames 6 to 8: results, many matches, loading and error

### Frame 6: search results, 5 or fewer (Riley)

Example from the catalog: "VPN" matches 3 products. Tunnelport Access Server (BYOL) is A (approved) for Engineering. Meshwire and Shalecrest UTM 9 are N (not approved).

1. **Outgoing bubble:** "Do we have a VPN I can use?"
2. **Step line:** Expandable section, collapsed by default. Header: "Searched your Private Marketplace for "VPN"". Inside: Steps with 1 step, status success, "Searched products. 3 matched."
3. **Incoming bubble (text):** "I found 3 products that match "VPN". Tunnelport Access Server (BYOL) is approved for purchase. Meshwire and Shalecrest UTM 9 aren't approved."
4. **Stacked incoming bubble (no avatar):** List, normal variant, 3 items. Each item:
   - Content: product name as a secondary link to its console product page.
   - Secondary content: "Tunnelport · Self-hosted business VPN on EC2". Leave out the vendor when it equals the product name (Meshwire: "Secure networking that replaces legacy VPNs").
   - Actions slot: purple "Approved for purchase" badge on approved products only. No badge on the others (decision 33).

- **Order:** code ranks the list (decision 19). The ranking rule isn't defined yet, and all 3 match on the description only, so the frame order (Meshwire, Tunnelport, Shalecrest) is a placeholder.
- **Next step after the list:** the request offer and alternatives belong to rows 2 and 5. Frame 6 ends with the list.

### Frame 7: more than 5 matches (Riley)

Example: "security" matches 9 products. Decision 19: ask a clarifying question before the results.

1. **Outgoing bubble:** "I need a security tool"
2. **Step line:** collapsed. Header: "Searched your Private Marketplace for "security"". Step: "Searched products. 9 matched."
3. **Incoming bubble:** "9 products match "security". What do you need it for?"
4. **Choices (method open, see Open questions), most likely first:** "Threat detection and response", "Firewall and VPN", "Compliance automation", "Server and workload protection". The buyer can also enter their own answer in the prompt input.

- **No list in this frame:** results show only after the buyer answers.

### Frame 8: loading and error

**8a. Searching (processing stage):**

- Step line open while working: 1 step with a loading status, "Searching your Private Marketplace for "VPN"". After it ends it collapses as in frame 6.
- Incoming bubble: Avatar in its loading state plus the text "Generating a response" (no end punctuation).
- Don't show these if the search ends in under 1 second.

**8b. Loading the list (generation stage):**

- The text response streams into the first bubble. The stacked bubble shows a Loading bar with "Loading matching products" until the list is ready.

**8c. Error:**

- Incoming bubble with an Alert, type error. Text: "The response couldn't be generated because of a connection error." Action button: "Try again". Content link: "You can also use the request form." It opens the backup request form (decided Nov 13 and 14).
- If the error happens during the search, the step shows the error status: "Couldn't search your Private Marketplace".
- "Try again" sends the same prompt again. The prompt input stays enabled.

**Backup request form (decided Nov 13 and 14).** The agent is not the only way to request. A static page with a Cloudscape Form, in the console. Fields from the AWS buyer docs: Product (read-only, pre-filled when known), Reason for request, PO number (optional). Buttons: Cancel, Submit request. Buyers reach it from agent errors: the response fails, the drawer doesn't load, or the card can't submit. It is a stand-in, because we don't know the real form's layout.

## Row 1 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Frame 7: how does the buyer answer the clarifying question? | A: dismissible dialog docked to the prompt input with the choices (Cloudscape method for clarifying intent). B: support prompt group under the response (Cloudscape method for narrowing a response already shown). C: text question only. | Decided Nov 14: A, the dismissible dialog docked to the prompt input. |
| 2 | Badge says "avoid using badges to indicate status". Approval is a status. Keep the badge? | A: keep the purple badge and log it as a deviation (color and use). B: Status indicator, success type, "Approved for purchase". | Decided Nov 14: A. Log it as a deviation for color and for use. |
| 3 | Product requests page: does it already have a primary button? | A: no primary there, so "Ask AI" uses the gen AI primary button (it is the key CTA). B: a primary exists, so "Ask AI" stays normal. | Decided Nov 12: primary "Request product" with the gen-ai icon (opens the drawer) and normal "Discover products". See frame 2. |
| 4 | The disclaimer "AWS Responsible AI Policy" is an external link (aws.amazon.com). Decision 35 keeps links in the console. | A: allow this one external link, with the external icon. B: plain text, no link. C: no disclaimer. | Decided Nov 12: A, allow this external link. |
| 5 | Frame 5: should the first reply show alternatives at once (as in decision 6) or offer 2 prompts? | A: 2 prompts, the buyer picks. B: search and show alternatives with the request offer in the first reply. | Decided Nov 14: the button now says "Request approval", so frame 5 goes straight into the request, with "Show approved alternatives" as a secondary prompt. |
| 6 | Button label | A: "Ask AI" (Cloudscape Ingress example). B: "Ask assistant". | Decided Nov 13 and 14: no "Ask AI" anywhere. Labels by page are "Request product" and "Request approval". You picked "Ask assistant", but no button uses it now. See question 8. |
| 7 | Does "Ask AI" also show on approved product pages? | A: yes, in the same stack position. B: no, only on products that aren't approved. | Decided Nov 13: B. Approved product pages have no agent button. |
| 8 | Drawer name. Cloudscape Ingress says "generative AI assistant" is the approved term. You like "product request assistant" and picked "Ask assistant" in question 6. | A: drawer header "Product request assistant"; the frame 4 intro still says it is a generative AI assistant. B: header "Generative AI assistant" (Cloudscape term); only the trigger aria label says "product request assistant". | Decided Nov 14: A. The header says "Product request assistant", and both empty states say it is powered by generative AI. Logged as a copy deviation. |
| 9 | Sam on My Private Marketplace: requests are off, so "Request product" can't do what it says. | A: hide the button for Sam (the same rule as the product page). The trigger bar icon still opens the drawer for approval checks and alternatives. B: keep a button for Sam with another label. | Decided Nov 14: A, hide the button for Sam. It matches the product page rule, and Sam can still open the drawer from the trigger bar. |

**Not row 1, but it blocks frame 6's final order:** the code ranking rule from decision 19 (for example name match, then vendor, then description) is still open for Build.

## Row 2: approved alternatives

Decided Nov 14: one shared reason line names the job the products have in common, and each item shows its catalog description (option B). There is no reason for each product. Code finds the alternatives from a new `category` field (option B). Base: decisions 1, 6, 19 and 30, and frame 6.

### Data change (Build)

- Add a `category` field to each product in `data/catalog.json`. One value for each product, specific enough that products in the same category do the same job. Example: Meshwire and Tunnelport Access Server (BYOL) both get "Remote network access (VPN)".
- Claude Code proposes the values from the descriptions. You approve the list before the build uses it.
- Alternatives = products in the same category as the asked product that are A (approved) for this buyer. Code finds and ranks them, so the result is the same each time and you can test it (decision 19). Claude only writes the text around them. With more than 5, the list shows the top 5 and a link to the discovery page with the Approved products filter and that category on (decided Nov 14).

### When alternatives show

- The buyer chooses "Show approved alternatives" (frame 5) or asks for them in chat.
- N (not approved), requests on, and the buyer asked about the product in chat: one reply shows the alternatives first, then the request offer (decision 6).
- After the buyer turns them down once, the agent doesn't offer them again. It offers the request (decision 6).

### Frame 9: alternatives found (Riley, Meshwire)

1. **Outgoing bubble:** "Show approved alternatives" (sent by the support prompt in frame 5).
2. **Step line:** Expandable section, collapsed. Header: "Checked approved products like Meshwire". Inside: Steps with 1 step, status success, "Checked approved products in Remote network access (VPN). 1 found."
3. **Incoming bubble (the shared reason):** "1 approved product in your Private Marketplace is also used for remote network access (VPN)." With more than one: "3 approved products in your Private Marketplace are also used for ..."
4. **Stacked incoming bubble:** List, the same items as frame 6: product name as a secondary link, "Tunnelport · Self-hosted business VPN on EC2", purple "Approved for purchase" badge in the actions slot.
5. **Support prompt group:** vertical, non-editable, 1 prompt: "Request Meshwire" (decision 6: alternatives first, then the request offer). It hides after the buyer sends a message (Support prompts).

**Sam variant:** the same list, with no prompt. The hand-off copy is in row 5.

### Frame 10: no approved alternatives (Riley, Auditlane)

1. **Step line:** collapsed. Step: "Checked approved products in Compliance automation. 0 found."
2. **Incoming bubble:** "No approved products in your Private Marketplace do the same job as Auditlane."
3. **Support prompt group:** vertical, non-editable, 1 prompt: "Request Auditlane".

**Sam variant:** the same text, with no prompt. The hand-off copy is in row 5.

### Not in row 2

- No reason for each product, no comparison table, and no "other products considered" (decision 30).
- The category names in this section are drafts until you approve the list. They are specific names we write, not broad AWS Marketplace names (decided Nov 14). The case study says they are fictional data.

### Row 2 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | More than 5 approved products in one category. | A: show the top 5 ranked by code, plus a link to the discovery page with the Approved products filter and that category. B: a clarifying question, as for search (decision 19). C: show all. | Decided Nov 14: A. The buyer already named a product, so a question adds a turn for little gain. The link keeps the buyer in the console. |
| 2 | Category names that buyers see in the reason line. | A: broad AWS Marketplace category names, such as "Network Infrastructure" or "Security". B: specific names we write, such as "Remote network access (VPN)". | Decided Nov 14: B. A broad name such as "Security" would match most of the catalog, and the alternatives would not do the same job. Note in the case study that the names are fictional data. |

## Row 3: confirm-before-submit card

The card is a Cloudscape one-time authorization card inside the conversation. Selecting "Submit request" on it is the buyer's confirmation (decision 21). Base: decisions 12, 13, 14, 18, 21, 25 and 44, and your Nov 14 answers.

What a card is: a box that sits in the chat as one of the assistant's messages. It holds a question, the details of what will be sent, and two buttons. It is not a pop-up. The buyer can still scroll and type while it is open. After the buyer selects a button, the buttons go away and the card keeps a short label of the decision ("Submitted" or "Not sent"), so the chat history shows what happened.

### Row 3: Cloudscape check (Nov 14)

I checked User authorized actions on the live site through Chrome on Nov 14. The page was last updated Sep 14, 2026. Two findings change your answers: the card must resolve at once with no loading state (open question 1), and the page now says what to do with a card nobody answers (open question 2).

| What the live page says | What it means for row 3 |
| --- | --- |
| One-time authorization: there is no future call for a scope to cover, so the scope selector is left out and the buttons carry the whole decision. | No scope selector. Buttons "Cancel" and "Submit request" (decision 12). |
| One-time decision title: "Approve action?" | "Submit request for Meshwire?" fits. |
| Communicate consequences before authorization: whether the change can be reversed and what happens if something goes wrong. | One line on how to undo it (open question 3, decided Nov 14). |
| The one-time example shows its details as visible key-value pairs (Service, Version, Stage). | Note and PO number as visible key-value pairs, never collapsed (decision 21). |
| Dismiss the dialog at once when the user selects a button. Don't show a loading state or success indicator. The resolved state belongs in the conversation. | The card resolves at once. Sending and errors show in the next bubble (open question 1, decided Nov 14). |
| Resolved state labels: past tense, no end punctuation. Convey the resolved state with text, not color alone; the Status indicator label carries it. | "Submitted" and "Not sent" (decision 13) in a Status indicator. |
| If the user cancels, the agent acknowledges it in the conversation. | "Got it. I didn't send the request." (decision 13). |
| When a request expires, show the expired state and have the agent say that nothing ran. Don't let a pending request block the UI with no end. | The card stays open. Expiry goes to the parking lot (open question 2, decided Nov 14). |
| The one-time card is not a dialog: no dialog role, no focus trap, the conversation stays reachable. Focus moves to the card heading, never to the approve button. | Matches decision 12. |

### Frame 11: confirm card (Riley, Meshwire)

- **When the card shows:** the buyer gave a note, as a typed reply to the note ask or with "Request Meshwire" (frame 9) or a typed ask. If the agent has not asked for a note and PO number in this conversation, it asks first with the frame 5 copy (decided Nov 14). The note is required and the PO number is optional (Lisa, Nov 21). After the ask, a reply with no note (for example "No note", or only a PO number) gets the fixed line "A note is required. Add a note for your administrator about why you need this product." and no card. Code writes this line, not Claude, and it repeats each time the note is empty.
- **Code checks before the card:** requests on, product N (not approved), no open request for this product (decision 18). If a check fails, no card shows. A duplicate gets frame 13.
- **Outgoing bubble (example):** "Need this for the Q1 network migration. PO 4500012345"
- **Incoming bubble (text):** "Here's the request I'll send to your administrator."
- **Stacked incoming bubble: the card.**
  - Heading: "Submit request for Meshwire?"
  - Description: "Your administrator will review this request. You can cancel it in Product requests while it's pending." (decided Nov 14). No marketplace name.
  - Key-value pairs, visible: Note "Need this for the Q1 network migration." and PO number "4500012345". Leave out the PO number row when the buyer didn't give one. The Note row always shows, because the note is required (Lisa, Nov 21).
  - Vendor row only when the vendor name isn't the product name (decision 21). For example, Tunnelport Access Server (BYOL) shows Vendor "Tunnelport". Meshwire shows none.
  - No fields, no scope selector, no buyer name (decisions 14, 21, 25).
  - Buttons: "Cancel" (normal), "Submit request" (primary).
- **Focus:** moves to the card heading when the card shows. No dialog role, no focus trap. The prompt input stays enabled.

### Frame 12: resolved card

- **Submitted:** the buttons go and the card shows a Status indicator, success type, "Submitted". What the agent says next is row 4 (request submitted). The card shows no loading state (decided Nov 14). The next incoming bubble has a step line, "Sending your request", with a loading status. If the save fails, an error Alert follows: "Your request for Meshwire wasn't sent because of a connection error." It has "Try again", which sends the same request again with no new card because the buyer already decided, and the link "You can also use the request form." (decision 44).
- **Not sent (Cancel):** the buttons go and the card shows a Status indicator, stopped type, "Not sent". Incoming bubble: "Got it. I didn't send the request." Then a vertical, non-editable support prompt "Show approved alternatives", only if the buyer hasn't seen alternatives in this conversation yet (decided Nov 14; decision 6).

### Frame 13: duplicate request (no card)

- Incoming bubble: "You already sent a request for Meshwire. View its status in Product requests." "Product requests" is a link to the page (decision 18, confirmed Nov 14).
- No card and no support prompts.

### Build notes for row 3

- Internal name `product_request`, with the comment "Buyers see Product requests. Admins see Approval requests." (confirmed Nov 14).
- The request record holds the account ID, product, experience, note, PO number, date and status Pending. No buyer name (decision 25).
- Remove "Always ask the buyer to confirm" from the submit request tool description (decision 21).
- The duplicate check runs when the agent would open the card (decision 18).

## Row 3 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | The save fails after the buyer selects "Submit request". You picked A on Nov 14 (a loading state on the button until the save returns), but the live page says to resolve the card at once with no loading state. | A: your pick, logged as a deviation. B: the Cloudscape way. The card resolves at once to "Submitted", which records the buyer's decision. A step line in the next bubble shows "Sending your request" with a loading status. If the save fails, an error Alert follows: "Your request for Meshwire wasn't sent because of a connection error." with "Try again" (sends the same request again with no new card, because the buyer already decided) and the link "You can also use the request form." (decision 44). | Decided Nov 14: B. It follows the updated page, and the error text says plainly that nothing was sent. Trade-off: if the save fails, the card says "Submitted" above an error for a moment, until "Try again" works. |
| 2 | The buyer leaves a card open and types something else. | A: the card stays open until the buyer selects a button. Card expiry goes to the parking lot. B: the card resolves to "Not sent" when the buyer sends a new message. C: the card expires after a set time and the agent says "This request expired. Nothing was sent." | Decided Nov 14: A. The card doesn't block the chat, so it meets the "don't block" rule. B can drop a request the buyer still wants. C adds an "expired" label that is easy to mix up with the Expired request status (decision 15). |
| 3 | Cloudscape says to tell users before they decide whether they can undo the action. | A: add one line to the card description: "You can cancel it in Product requests while it's pending." B: leave it out. | Decided Nov 14: A. Buyers can cancel Pending requests (frame 2 row action), so the line is true and short. |

## Row 4: request submitted

What Riley sees after selecting "Submit request" when the save works, and what happens when the request is no longer valid at that moment. Base: frame 12, decisions 18 and 65, and your Nov 14 answers. Sam (Finance, requests off) never gets a card, so row 4 has no Sam variant.

### Row 4: Cloudscape check (Nov 14)

I checked Progressive steps, Generative AI loading states and Generative AI chat on the live site through Chrome on Nov 14. User authorized actions was checked earlier the same day (row 3). One finding adds a rule: don't show a loading state for under one second (open question 1).

| What the live page says | What it means for row 4 |
| --- | --- |
| Progressive steps: showing a step and its status tells users what the assistant is doing while it works, and what it did once it stops. | The step line stays after the save, with a success status. |
| Progressive steps and Generative AI loading states: avoid a loading state for under one second, because it can flicker. | "Sending your request" shows only when the save takes 1 second or more (open question 1). |
| Progressive steps examples show a finished step in the past tense ("Checked 5 nodes"). | Finished step line: "Sent your request". |
| Generative AI chat: announce every new message with a visually hidden LiveRegion. | The success bubble is announced to screen readers. |
| Generative AI chat: don't auto-scroll to a new message while the user reads older messages. | If Riley scrolled up, the success bubble doesn't pull the view down. |
| User authorized actions: the resolved state belongs in the conversation. | No Flashbar or other message on the page behind the drawer (decided Nov 14). |

### Frame 14: request sent (Riley, Meshwire)

- Card: "Submitted", success Status indicator (frame 12).
- Next incoming bubble, step line: "Sending your request" with a loading status, then "Sent your request" with a success status. If the save takes under 1 second, the step line shows "Sent your request" at once, with no minimum time (decided Nov 14).
- Same bubble, text: "I sent your request for Meshwire to your administrator. You can see its status in Product requests." "Product requests" is a link to the page, in the same tab. The drawer stays open with the same conversation (row 1 rule). Same wording style as frame 13 (duplicate request).
- No support prompts (decided Nov 14). Riley can type a new ask.
- No claim about emails, review time or when the administrator decides (decided Nov 14: the data can't back these up).

### Frame 15: the page behind the drawer

When the save works, the page Riley is on updates at once (decided Nov 14).

- Product requests: a new row at the top (default sort, Date requested, newest first): Meshwire, Pending, the date, "Cancel request".
- Meshwire product page: the info Alert changes to "You requested approval for this product. View its status in Product requests." and "Request approval" is hidden (frame 3 table).
- My Private Marketplace: no change.
- No Flashbar on any page (decided Nov 14).

### Frame 16: request no longer valid at submit (recheck)

Code runs the card's checks again when Riley selects "Submit request" (decided Nov 14), so a card left open can't send a request that is no longer valid. The checks are the same as before the card (decision 18). If a check fails, nothing is sent, and the card shows "Not sent" with the stopped type (decided Nov 14). Draft copy for you to change:

| What changed while the card was open | Incoming bubble |
| --- | --- |
| Same request already sent (for example from the backup form) | "You already sent a request for Meshwire. View its status in Product requests." (frame 13 line) |
| Product approved | "Meshwire is now approved in your Private Marketplace, so I didn't send the request." Row 7 covers the link to the product page. |
| Requests turned off | "Product requests are turned off in your Private Marketplace, so I didn't send the request. To ask about Meshwire, contact your administrator." Then the row 5 contact bubble (decided Nov 15). |
| Product declined and blocked | "This product can't be requested, so I didn't send the request. To ask about it, contact your administrator." Then the row 5 contact bubble (decision 16 wording; hand-off decided Nov 15). |

### Build notes for row 4

- **Known limit before Supabase (decided Nov 14):** a submitted request lives only in the browser session. A page reload removes it from Product requests. The README says so until the Supabase row is built. Publishing the repo to GitHub or deploying it to Vercel doesn't need Supabase.
- **Supabase is built (Nov 18, decisions 1 to 7 of prompt 2j):** requests are saved for each browser through `api/requests.js`. Without the Supabase keys, requests stay in the browser session only.
- Recheck at submit: same check code as the duplicate check (decision 18), called again when "Submit request" is selected.
- Step line timing: "Sending your request" shows only when the save really takes 1 second or more. No fake delay (decided Nov 14). When the card resolves, focus goes back to the card heading (decided Nov 14). Recheck: a free automated test changes the data, then submits (decided Nov 14). Sample rows on Product requests: Claude Code picks 2 N (not approved) products other than Meshwire, and you approve them (decided Nov 14).
- New bubble in a hidden LiveRegion; no auto-scroll when Riley is reading older messages.
- The page behind the drawer reads the same request list as the agent, so frame 15 needs no extra message.

## Row 4 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | The save in this prototype is almost instant, but Cloudscape says not to show a loading state for under 1 second. | A: show "Sending your request" only when the save takes 1 second or more; otherwise the step line shows "Sent your request" at once. B: always show "Sending your request" for a minimum time, for example 1 second. | Decided Nov 14: A. It follows Cloudscape, and B adds a fake delay. Trade-off: on localhost you will rarely see "Sending your request". It shows on a slow save, and you can test it in the break-the-build row. |
| 2 | Focus goes to the card heading when the card shows. When the buttons go away, the focused button goes too. Where does focus go? | A: back to the card heading. B: the prompt input. C: the new bubble. | Decided Nov 14: A. The reader stays in place, and the LiveRegion reads the new bubble. I didn't see a rule for this on the live pages I checked today. |
| 3 | Card label when the recheck fails (frame 16). | A: "Not sent", stopped type, because nothing was sent. B: "Submitted", then the bubble explains. | Decided Nov 14: A. The checks run in code before the save, so the card can resolve at once with a true label. B would show "Submitted" for a request that never went out. |
| 4 | Test data conflict: the frame 2 sample rows have Meshwire as Pending. Then the demo's Meshwire request would get the frame 13 duplicate line, not a card. | A: Claude Code picks 2 other N (not approved) products for the sample rows, and you approve them. B: no sample rows, so the table starts empty. | Decided Nov 14: A. The demo story keeps Meshwire, and the table still shows more than one status. B needs an empty state we haven't specced. |
| 5 | How to test the recheck, since nothing changes the data while a card is open. | A: a free automated test only (change the data in the test, then submit). B: a dev-only control on the page to change the data. | Decided Nov 14: A. It proves the rule with no new UI. B adds scope you didn't ask for. |

## Row 5: hand-off states

What the agent says when it can't get the buyer the product, and who it sends the buyer to. Row 5 has 4 cases (decided Nov 15): H1 (requests off, Sam), H2 (blocked product, Riley), H3 (a question the agent can't answer) and H4 (no match). Base: decisions 1, 4, 6, 7, 10, 11, 16, 22 and 58, and your Nov 15 answers. "Just buy it" and price questions are in row 7. Errors are in row 6.

### Row 5: Cloudscape check (Nov 15)

I checked Generative AI chat and Copy to clipboard on the live site through Chrome on Nov 15. Neither page has a rule for a response where the assistant can't help, so the copy follows the general writing guidelines: present tense, active voice, no "please".

| What the live page says | What it means for row 5 |
| --- | --- |
| Generative AI chat, error state example (Access denied): the Alert tells the user to copy the text and send it to their AWS administrator, and it has a Copy button. | Cloudscape already pairs a hand-off to the administrator with text the user can copy. |
| Copy to clipboard (published Jan 30, 2024): the inline variant lets users quickly copy a string of text, for example an ARN in a list of key-value pairs. | The email address uses the inline variant, inside key-value pairs. |
| Copy to clipboard writing: success text "\[Name of the content\] copied", error text "\[Name of the content\] failed to copy". | Popover text: "Email address copied" and "Email address failed to copy". |
| Generative AI chat: put complex UI elements in stacked bubbles. Only the first bubble shows the avatar. | The contact details go in their own stacked bubble. |
| Generative AI chat: announce every new message with a visually hidden LiveRegion. | Same as row 4. Each hand-off bubble is announced. |

### Contact details (all hand-off frames)

Code finds the contact details, and Claude never sees them (decided Nov 15, option B). So Claude can't change or invent a detail.

- Code reads the buyer's branding description and looks for 2 things: an email address, and a Slack channel name (text that starts with "#"). It shows only what the admin wrote. If the description names no Slack channel or email, the agent names neither (decided Nov 15).
- The tool result tells Claude only "contact details: yes" or "contact details: no", never the details.
- Yes: Claude's text ends "contact your administrator." Code adds a stacked bubble with the details.
- No: Claude's text ends "speak with your administrator." No stacked bubble, and no reference to contact details.

Stacked bubble (no avatar): Key-value pairs, one pair for each detail code found.

- "Email": the address with Copy to clipboard, inline variant (decided Nov 15). Aria label "Copy email address". Popover: "Email address copied" or "Email address failed to copy".
- "Slack channel": the channel name as plain text. No copy button and no link.

Known limit: code misses formats it doesn't know, for example a phone number or a name with no email. This is realistic, because the real Private Marketplace has no official field for contact details (your Nov 15 note). The case study can say so.

Test data (Build). Approved Nov 15. You asked me to make up branding names when we need them (decision 67).

| Experience | Branding name | Branding description |
| --- | --- | --- |
| Engineering (Riley) | Initech Engineering Marketplace | Software approved for Initech engineering teams. Questions about a product or a request? Email eng-software@initech.example or post in #eng-software-requests on Slack. |
| Finance (Sam) | Initech Finance Marketplace | Software approved for the Initech finance team. |

The ".example" domain is reserved for examples, so the address can't reach a real person.

### Frame 17: requests off (Sam, Meshwire, H1)

Sam opens the drawer from the trigger bar (frame 4, Sam variant) and asks about a product that isn't approved. Order: alternatives first, then the hand-off (decided Nov 15, option A; decision 6).

- Outgoing bubble: "Can I get Meshwire?"
- Step line: collapsed. Header: "Searched your Private Marketplace for "Meshwire"". 2 steps, status success: "Searched products. 1 matched." and "Checked approved products in Remote network access (VPN). 0 found."
- Incoming bubble: "Meshwire isn't approved for purchase in your Private Marketplace. No approved products in your Private Marketplace do the same job." With the current data, Finance has no approved VPN (Tunnelport Access Server (BYOL) is N (not approved) for Finance), so this example has no list.
- With alternatives: the row 2 shared reason line and the List go here, in stacked bubbles, with no support prompt (frame 9, Sam variant).
- Stacked bubble (the hand-off): "Product requests are turned off in your Private Marketplace, so I can't send a request for Meshwire. To ask about it, speak with your administrator."
- No contact bubble, because Finance has no contact details. No support prompts (decision 58).

Same frame for a D (declined and blocked) product when requests are off, for example Breachkit Linux. Sam hears the requests-off line, not "This product can't be requested" (decision 1).

### Frame 18: blocked product (Riley, Lumora Image Large, H2)

Lumora Image Large is D (declined and blocked) for Engineering. Riley gets no request offer (decision 16).

- Outgoing bubble: "I need Lumora Image Large."
- Step line: collapsed. Header: "Searched your Private Marketplace for "Lumora Image Large"". 2 steps: "Searched products. 1 matched." and "Checked approved products in Image generation. 0 found." ("Image generation" is a draft category until you approve the list.)
- Incoming bubble: "Lumora Image Large isn't approved for purchase in your Private Marketplace. No approved products in your Private Marketplace do the same job."
- With alternatives: the shared reason line and the List go here (frame 9), with no "Request" support prompt.
- Stacked bubble (the hand-off): "This product can't be requested. To ask about it, contact your administrator."
- Stacked bubble (contact details): Email "eng-software@initech.example" with the inline copy button. Slack channel "#eng-software-requests".
- No support prompts.

### Frame 19: a question the agent can't answer (H3)

No step line, because no tool runs. One incoming bubble: the first sentence from the table, then the hand-off line only, with no list of what the agent can do (decided Nov 15, option A). Riley's line ends "Contact your administrator." and the contact bubble follows. Sam's line ends "Speak with your administrator."

| Question type | Example | First sentence (draft) |
| --- | --- | --- |
| Refunds | "Can I get a refund for Watchtail Pro?" | "I can't help with refunds." |
| Contract terms | "Can we change the contract for Watchtail Pro?" | "I can't help with contract terms." |
| How Private Marketplace works | "Can I change my Private Marketplace settings?" | "I can't help with Private Marketplace settings." |
| Approval history | "Why isn't Meshwire approved?" | "I don't have more details about Meshwire's approval." (decision 4) |
| Another team's approvals | "My coworker in Finance has Meshwire." | "Approvals can be different for other teams. In your Private Marketplace, Meshwire isn't approved." (decisions 10 and 24) |

Example (Riley): "I can't help with refunds. Contact your administrator." Then the contact bubble.

### Frame 20: no match (Riley, H4)

The search finds 0 products. The next step is a new search, with no hand-off line (decided Nov 15, open question 2, option A).

- Outgoing bubble: "Do we have Zentrova?"
- Step line: collapsed. Header: "Searched your Private Marketplace for "Zentrova"". Step: "Searched products. 0 matched."
- Incoming bubble: "I didn't find a product named "Zentrova". Check the spelling, or tell me what you need it for, and I can look for an approved product that does the same job."
- Support prompt group: the frame 4 one, horizontal and editable, with 1 prompt: "Find an approved product for \<what you need>".
- Sam: the same frame.

### Build notes for row 5

- Contact details: code reads the branding description and finds an email address and a "#" Slack channel name. Claude gets only yes or no. A free automated test checks that the bubble shows exactly the details in the data, and that Finance shows none.
- Branding names and descriptions go into the test data (decision 22), with the drafts in this section (approved Nov 15).
- Week 1 system prompt (tiny\_agent.py, the requests-off rule and its example): the first sentence no longer has to say requests are off. New order: answer, alternatives, then the hand-off line. Remove the 2 extras in that rule: the line that tells the buyer to include product links, and the AWS docs link (decided Nov 15).
- Row 2 frames 9 and 10, Sam variants: they now end with the frame 17 hand-off bubble.
- Each hand-off bubble goes in the hidden LiveRegion. No auto-scroll when the buyer reads older messages (row 4 rule).
- No support prompts after a hand-off. Frame 20 has 1 editable support prompt (decided Nov 15). Frame 16: the requests-off and D (declined and blocked) lines now end with the hand-off line and the contact bubble (decided Nov 15).

## Row 5 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | The Week 1 requests-off reply has 2 extras: it tells the buyer to put the product links in their message to the administrator, and it links to the AWS buyer guide page on how requests work (docs.aws.amazon.com, an external link). | A: remove both. B: keep the docs link only, as an external link exception (decision 35). C: keep both. | Decided Nov 15: A. The product names already show in the drawer. The docs page tells buyers to choose "Approval requests", but your buyers see "Product requests" (decision 23), so the link would confuse them. |
| 2 | What comes after the no-match line (frame 20). | A: ask the buyer to check the spelling or say what they need, plus the editable prompt "Find an approved product for \<what you need>". No hand-off line. B: A plus the hand-off line and the contact bubble. | Decided Nov 15: A. An admin can approve only products that are in AWS Marketplace, so a new search is the most useful next step. The prompt is the frame 4 prompt, so it adds no new UI. |
| 3 | Branding names and descriptions (contact details section). | A: use my drafts. B: you change them. | Decided Nov 15: A, including the made-up .example email address. |
| 4 | Frame 16 (recheck at submit) has "Not sent" lines for requests turned off and for a D (declined and blocked) product, with no hand-off. | A: add the row 5 hand-off line (and Riley's contact bubble) to those 2 lines. B: leave frame 16 as it is. | Decided Nov 15: A. Then every time the agent can't send a request, the buyer hears who to ask next. |

## Row 6: AI disclosure, error and retry states

Row 6 adds no output label and 4 new error cases: E1 (service busy or not available), E2 (response stops halfway), E3 (drawer fails to load) and E4 (Try again fails again). Base: frames 4, 8c and 12, decisions 44 and 65, and your Nov 15 answers. All error copy is fixed text in code. Claude never writes it.

### Row 6: Cloudscape check (Nov 15)

I checked Generative AI output label, Generative AI chat, Response regeneration and Error messages on the live site through Chrome on Nov 15. The Generative AI loading states page was checked on Nov 14 (row 4).

| What the live page says | What it means for row 6 |
| --- | --- |
| Generative AI output label (published Apr 8, 2024): the label text is "Generated by AI" with the sparkle icon, close to the output. It matters most where users see outputs from generative AI and from other sources. Avoid redundancy: when every output in a group is from generative AI, put one label near the group header. | No label in the drawer (open question 1). The avatar, the empty state intro and the disclaimer already disclose. |
| Generative AI chat: its examples have no output label. Avatars show who wrote each message. Error state: an error Alert with a recovery action, for example "Try again". It names access denied, server side error and connection error. | E1 and E2 are error Alerts. No access denied case: the prototype has no sign-in or permissions. |
| Response regeneration (published Nov 11, 2025): an optional regenerate icon button under each response and an optional stop button. Use regenerate only when it doesn't break context. Regenerating removes all later messages. | No regenerate and no stop (open question 4). "Try again" in an error Alert is the only retry. |
| Error messages: say why the error happened if it is known. Don't make false promises. For unexpected client-side errors, show the raw error in an expandable section and ask the user to contact you. A section-level error boundary replaces only the part that failed, for example a drawer. | Code picks the Alert from the error type. Only E3 has error details. E3 has no contact line (open question 7, logged deviation). |

### AI disclosure

No "Generated by AI" label (decided Nov 15, option C). The drawer already discloses in 3 places: the Avatar with the gen AI color and the tooltip "Generative AI assistant", the empty state line "powered by generative AI" (frames 2b and 4), and the disclaimer in the prompt input constraint text.

Some content under the assistant avatar comes from code, not from Claude: the step lines, the product lists, the confirm card, the contact details bubble and every error Alert. The case study says which parts come from code. Why: the label page says the label matters most when AI and non-AI outputs mix, which is true here, but a label on almost every bubble is the redundancy the page warns against.

### Frame 21: response errors in the drawer (connection, E1, E2)

The response fails inside a working drawer. Code knows the error type and picks one Alert, so the Alert says the real reason. Each Alert is an incoming bubble with an Alert, type error. This changes frame 8c: its "connection error" copy is now only for real connection errors. Before, it showed for every failure, which gave a false reason when the cause was E1.

| Case | What happened | Alert text | Actions |
| --- | --- | --- | --- |
| Connection error (frame 8c) | The request didn't reach the server, or no reply came back before any text (network drop, timeout) | "The response couldn't be generated because of a connection error." | "Try again", link "You can also use the request form." |
| E1a (busy) | Too many requests, or the service is overloaded | "The product request assistant is busy, so the response couldn't be generated. Try again in a few minutes." | "Try again", link "You can also use the request form." |
| E1b (not available) | Spend limit reached, a key problem, or any other server error, including one with no known cause | "The product request assistant isn't available right now. You can use the request form to send your request." ("request form" is the link) | Link only. No "Try again", because a spend limit stays until next month. |
| E2 (stops halfway) | Text started to stream, then the connection dropped | "The response stopped before it was complete because of a connection error." | "Try again", link "You can also use the request form." |

E2: code removes the partial text and any stacked bubbles of that response. The bubble shows the Alert only (decided Nov 15, option B). Why: half a sentence can say the wrong thing about approval, for example "Meshwire is approved" before the rest arrives. Demo 1 kept partial text; Demo 2 doesn't, because here a wrong claim can lead to a request.

E4 (Try again fails again): "Try again" sends the same prompt again, and the new response replaces the Alert. If it fails again, the same Alert shows again (decided Nov 15, option A). Every Alert has the request form link. In E1b it is inside the text.

Search step: if the error happens during the search, the step shows the error status "Couldn't search your Private Marketplace" (frame 8c, no change).

Save fails (frame 12): no change. Its copy says connection error, and before Supabase the save is in the browser session only, so that is the one real cause.

The buyer never sees "Claude", "API", "spend limit" or an error code in these Alerts. No raw error details (decided Nov 15): the causes are known, so Cloudscape doesn't ask for them, and buyers can't act on an API code.

The prompt input stays enabled. Each Alert goes in the hidden LiveRegion. No auto-scroll when the buyer reads older messages (row 4 rule).

### Frame 22: drawer fails to load (E3)

A code crash in the drawer. A section-level error boundary (Cloudscape Error messages) replaces the drawer content. The drawer header "Product request assistant" and the close button stay. The page behind the drawer keeps working, including the backup request form.

Alert, type error:

- Text: "The product request assistant couldn't load. Reload the page to try again. You can also use the request form." ("request form" is the link)
- Button: "Reload page"
- Expandable section, collapsed by default: header "Error details". Inside: the raw error message, with Copy to clipboard, inline variant. Popover: "Error details copied" or "Error details failed to copy".

No contact line (decided Nov 15, option A). Cloudscape says to ask the user to contact you with the details, but this prototype has no support team, and the page also says not to make false promises. Logged as a deviation. The README and the build say that the real console would tell the buyer to contact AWS Support, and that this prototype doesn't because it is a prototype, not the real product.

I read the Error messages page, which names error boundaries. I didn't check a separate Cloudscape component page for them. Build checks whether one exists before it builds frame 22.

### Build notes for row 6

- Error type in code, from the server function's response: network drop or timeout before any text → connection error; too many requests (429) or overloaded (529) → E1a; spend limit, key problem (401, 403), server error (500) or any other error → E1b; stream ends with no finish → E2; crash while the drawer renders → E3.
- Free automated tests, one per case, each with a mocked failure. They check the Alert text, that E1b has no "Try again", and that E2 removes the partial text.
- E3: force the crash in a test only. No dev control on the page (same rule as decision 84).
- No output label, no regenerate button, no stop button.
- README: the AWS Support note (frame 22), and which parts of the drawer come from code, not from Claude.

## Row 6 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Output label. Code makes some of what shows under the assistant avatar. | A: no label. B: "Generated by AI" on Claude's text bubbles only. C: A, plus a case study line on which parts come from code. | Decided Nov 15: C. A label on almost every bubble is the redundancy the page warns against. |
| 2 | Which new error cases are in row 6? | E1 (service busy or not available), E2 (response stops halfway), E3 (drawer fails to load), E4 (Try again fails again). | Decided Nov 15: all 4. |
| 3 | Partial text before an error (E2). | A: keep it and add the Alert. B: remove it, Alert only. | Decided Nov 15: B. Half a sentence can make a wrong approval claim. |
| 4 | Stop and regenerate buttons. | A: neither. B: stop only. C: both. | Decided Nov 15: A. Responses are short, and regenerate removes later messages, which can include a card or a sent request. Trade-off: no stop, which Demo 1 had. |
| 5 | Try again fails again (E4). | A: the same Alert each time. B: after the second failure, drop "Try again" and lead with the request form. | Decided Nov 15: A. No new copy, and the form link is always there. |
| 6 | Raw error details. | A: none. B: an expandable section with the error code. | Decided Nov 15: details only for E3, the one unexpected client-side error. E1 and E2 have known causes, so plain copy follows Cloudscape and is not a deviation. |
| 7 | Who E3 tells the buyer to contact. | A: no one, details and Copy only. B: a GitHub issue link. C: "contact AWS Support". | Decided Nov 15: A, logged as a deviation. The README and the build say the real console would tell the buyer to contact AWS Support. |

## Row 7: link to the product page, "just buy it" and simple questions

The agent never buys and never researches products for the buyer. It answers whether a product is approved, answers simple questions in a few lines of text, and links to the product page, where the buyer chooses View purchase options. Row 7 has 5 cases (decided Nov 15): P1 ("just buy it", approved product), P2 ("just buy it", product that isn't approved), P3 (price), P4 ("Is it approved?", approved product) and P5 (a simple question about features or a simple comparison). Base: decisions 8, 9, 19, 30 and 34, frames 3, 6 and 9, and your Nov 15 answers.

Your scope rule (Nov 15): the product request assistant is not Agent Mode. No large comparison tables, no generated artifacts, and no long answers. A simple question gets a short text answer that takes little vertical space.

### Row 7: Cloudscape check (Nov 15)

I checked Link and Generative AI chat on the live site through Chrome on Nov 15.

| What the live page says | What it means for row 7 |
| --- | --- |
| Link: use links to go from one page to another. Every navigation link has an href. Use onFollow, not onClick, so users can open the link in a new tab. | The product link is a real link with an href. The buyer can still open it in a new tab by choice. |
| Link: an external link (external icon, new tab) is only for pages outside the console or product, or when the user needs both pages open. | The product page is in the console, so the link opens in the same tab, with no external icon (decided Nov 15). |
| Link: a secondary link is for places where the context shows it is a link, for example a list of links. A primary (underlined) link is for links next to body text. | The product name in the List is a secondary link, the same as frame 6. |
| Link: link text says where the link goes. Repeated links need unique accessible names. | The product name is the link text. Each item has its own name, so no extra aria label is needed. |
| Generative AI chat: use stacked bubbles for complex UI elements, such as a list of resources or a table. | The product link goes in a stacked bubble with a List, the same as frame 6. No table in row 7 (your scope rule). |

### How the link works (all row 7 frames)

Code makes the link, and Claude never sees a URL (decided Nov 15, option A). Same rule as decisions 56, 73 and 87: code supplies the facts that must be exact.

- Claude's text names the product only. Code adds a stacked bubble with a List item for each product the answer names: product name as a secondary link to its console product page, vendor and catalog description as secondary content (vendor left out when it equals the product name), and the purple "Approved for purchase" badge on approved products only. This is the frame 6 item.
- The link opens the product page in the same tab. The drawer stays open with the same conversation (decided Nov 15, option A; row 1 drawer rule; frame 14).
- An approved product page shows the frame 3 A (approved) case: no Alert, "View purchase options" enabled, purple badge, no agent button.
- The prototype's product pages all use "View purchase options" as the primary CTA (decided Nov 15). Other CTAs from the real listing can show too, as long as "View purchase options" stays the primary CTA for buying.

### Frame 23: "just buy it", approved product (Riley, Tunnelport Access Server (BYOL), P1)

Outgoing bubble: "Can you just buy Tunnelport Access Server for me?"

Step line: collapsed. Header: "Searched your Private Marketplace for "Tunnelport Access Server"". Step: "Searched products. 1 matched."

Incoming bubble: "I can't buy products for you. Tunnelport Access Server (BYOL) is approved for purchase in your Private Marketplace. To buy it, choose View purchase options on its product page." (decision 8: can't buy, then the link, then one line on how to buy.)

Stacked bubble: List with 1 item (Tunnelport Access Server (BYOL), "Tunnelport · Self-hosted business VPN on EC2", purple badge).

No support prompts.

Sam variant: the same frame with an approved Finance product, for example Lakeforge Data Platform.

### Frame 24: "just buy it", product that isn't approved (Riley, Meshwire, P2)

The first sentence is "I can't buy products for you." The rest is the normal path for a product that isn't approved (decided Nov 15, option A). No link to the product page, because the buyer can't buy there.

Outgoing bubble: "Just buy Meshwire for me."

Step line: collapsed. 2 steps: "Searched products. 1 matched." and "Checked approved products in Remote network access (VPN). 1 found."

Incoming bubble: "I can't buy products for you. Meshwire isn't approved for purchase in your Private Marketplace." Then the frame 9 shared reason line and List in stacked bubbles, and the "Request Meshwire" support prompt (decision 6: alternatives first, then the request offer).

Sam variant: frame 17 (requests off), with "I can't buy products for you." before its first sentence.

D (declined and blocked) variant: frame 18, with "I can't buy products for you." before its first sentence.

### Frame 25: price (Riley, Watchtail Pro, P3)

The catalog has no prices, and a Private Marketplace purchase depends on more than price (decision 9). Every buyer goes to the product page, for approved products and for products that aren't approved (decided Nov 15).

Outgoing bubble: "How much does Watchtail Pro cost?"

Step line: collapsed. Step: "Searched products. 1 matched."

Incoming bubble: "I can't give you prices. You can find pricing for Watchtail Pro on its product page."

Stacked bubble: List with 1 item (Watchtail Pro, purple badge).

Not approved (Riley, Meshwire): "I can't give you prices. You can find pricing for Meshwire on its product page. Meshwire isn't approved for purchase in your Private Marketplace." Then the List item (no badge). Riley gets 1 non-editable support prompt, "Request Meshwire". Sam gets the frame 17 hand-off line, with no prompt (decided Nov 15, open question 1).

The agent never gives a price, a price range or a pricing model, even if the buyer asks again.

### Frame 26: "Is it approved?", approved product (Riley, Watchtail Pro, P4)

Frame 6 with 1 match. The link is the main answer.

Outgoing bubble: "Is Watchtail Pro approved?"

Step line: collapsed. Step: "Searched products. 1 matched."

Incoming bubble: "Watchtail Pro is approved for purchase in your Private Marketplace."

Stacked bubble: List with 1 item (Watchtail Pro, purple badge).

No support prompts. Sam variant: Watchtail Pro isn't approved for Finance, so Sam gets the frame 17 path.

### Frame 27: a simple question about features or a simple comparison (Riley, P5)

Simple questions are OK if the answer is mostly text and short (decided Nov 15). The agent uses only the facts in the search result (name, vendor, type, catalog description, approval status). It doesn't add its own claims, opinions or a recommendation (Week 1 rule: state the difference in one short phrase and let the buyer choose).

Limits for every P5 answer:

- Plain text only, at most 3 short sentences. No table, no headings, no bullet list, no code block, no generated file.
- Products: only the ones the buyer named, at most 5 (the same limit as search, decision 19). More than 5 → the frame 7 clarifying question.
- Each product the answer names gets a List item from code (how the link works).

5a. Features (one product):

Outgoing bubble: "What does Watchtail Pro do?"

Incoming bubble: "Watchtail Pro is an observability and security platform for smaller teams, with metrics, logs, traces and database monitoring. It's approved for purchase in your Private Marketplace." Stacked bubble: List with 1 item.

5b. Simple comparison (2 products):

Outgoing bubble: "What's the difference between Watchtail Pro and Watchtail Enterprise?"

Incoming bubble: "Watchtail Pro is for smaller teams, and Watchtail Enterprise is for large companies. Both have metrics, logs, traces and database monitoring. Watchtail Pro is approved for purchase in your Private Marketplace, and Watchtail Enterprise isn't." Stacked bubble: List with 2 items (badge on Watchtail Pro only).

Support prompt group: vertical, non-editable, 1 prompt: "Request Watchtail Enterprise" (decision 58: after a list, a request prompt for Riley). Sam: no prompt, and the frame 17 hand-off line.

5c. A fact the catalog doesn't have (for example "Does Watchtail Pro support SSO?"):

Incoming bubble: "I don't have details about that. Watchtail Pro's product page has more information." Stacked bubble: List with 1 item. No guess.

5d. A request that is too big (for example "Compare all the security tools in a table" or "Write a report on these products"): "I can only give short answers about products. Each product page has more details." Then the List items for the products named, at most 5, or the frame 7 clarifying question if more than 5 match. No hand-off line (decided Nov 15, open question 2).

### Build notes for row 7

- Search tool result: remove the link field from what Claude gets. Code keeps the link and adds the List items. A free automated test checks that each List item's href is the product page route for that product\_id, and that the request to Claude has no product URL.
- Week 1 system prompt (tiny\_agent.py): replace "When a product is approved, give the buyer its product page link" with a line that the app shows product links. Remove the link-format rules ("write the name followed by its link" and "include its link so the buyer can share it") and the \<link> placeholders in the 2 examples. Keep "You cannot purchase anything."
- New system prompt rules: "I can't buy products for you." first for any buy request; no prices; P5 limits (3 short sentences, catalog facts only, no recommendation).
- Render Claude's text as plain text, not markdown, so a table or heading can't show even if Claude writes one. Code enforces the scope rule, not only the prompt.
- Product page route: the prototype maps each product\_id to its console product page. The example.com links in catalog.json are not used.
- Known simplification: every product page uses "View purchase options" as the primary CTA. On the real site, a few listings that our products are based on have only "Request private offer". One of them is approved: Talonix Platform (A for both). The case study can say the CTA is simplified.
- Each new bubble goes in the hidden LiveRegion. No auto-scroll when the buyer reads older messages (row 4 rule).

### Row 7 open questions

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Price question for a product that isn't approved (frame 25). What follows the List item? | A: Riley gets the "Request Meshwire" support prompt only, and Sam gets the frame 17 hand-off line. B: the full path for a product that isn't approved (alternatives, then the request offer). C: nothing. | Decided Nov 15: A. The buyer asked about price, not alternatives, so one prompt is enough. It still shows the next step, and the buyer can ask for alternatives. |
| 2 | A request that is too big for a simple answer (frame 27, 5d). | A: "I can only give short answers about products. Each product page has more details." Then the List items, at most 5, or the frame 7 question if more than 5 match. B: the frame 19 pattern: one sentence, then the hand-off to the administrator. | Decided Nov 15: A. The product pages answer the question, and the administrator doesn't need to. |
| 3 | Frame 27 limit of 3 short sentences. | A: 3 sentences. B: 2 sentences. C: no number, only "short". | Decided Nov 15: A. 5b needs 3 sentences (the difference, what is the same, approval). A number is easier to test than "short". |

## Sources

All checked on the live Cloudscape site (cloudscape.design) on Nov 12, 2026, through Chrome.

- [Generative AI chat](https://cloudscape.design/gen-ai/patterns/generative-ai-chat/)
- [Ingress](https://cloudscape.design/gen-ai/patterns/ingress/)
- [In-chat context](https://cloudscape.design/gen-ai/patterns/in-chat-context/)
- [Support prompts](https://cloudscape.design/gen-ai/patterns/support-prompts/)
- [Follow-up questions](https://cloudscape.design/gen-ai/patterns/follow-up-questions/)
- [Progressive steps](https://cloudscape.design/gen-ai/patterns/progressive-steps/)
- [Generative AI loading states](https://cloudscape.design/gen-ai/patterns/generative-ai-loading-states/)
- Components: [Prompt input](https://cloudscape.design/components/prompt-input/?tabId=usage), [Support prompt group](https://cloudscape.design/components/support-prompt-group/?tabId=usage), [App layout](https://cloudscape.design/components/app-layout/?tabId=usage), [Drawer](https://cloudscape.design/components/drawer/?tabId=usage), [Badge](https://cloudscape.design/components/badge/?tabId=usage), [Button](https://cloudscape.design/components/button/?tabId=usage), [Avatar](https://cloudscape.design/components/avatar/?tabId=usage), [Chat bubble](https://cloudscape.design/components/chat-bubble/?tabId=usage), [List](https://cloudscape.design/components/list/?tabId=usage)
- Test data: `data/catalog.json` in [pmp-tiny-agent](https://github.com/lisalucyliu/pmp-tiny-agent)

Checked Nov 13 and 14, also through Chrome: [Flashbar](https://cloudscape.design/components/flashbar/?tabId=usage), [Alert](https://cloudscape.design/components/alert/?tabId=usage), [Disabled and read-only states](https://cloudscape.design/patterns/general/disabled-and-read-only-states/), [Table](https://cloudscape.design/components/table/?tabId=usage), [In-context actions](https://cloudscape.design/patterns/general/actions/incontext-actions/), [Global actions](https://cloudscape.design/patterns/general/actions/global-actions/), and Ingress again. Row 3: User authorized actions (https://cloudscape.design/gen-ai/patterns/user-authorized-actions/), checked Nov 14. Row 4: Progressive steps, Generative AI loading states and Generative AI chat, checked Nov 14. Row 5: Generative AI chat and Copy to clipboard (https://cloudscape.design/components/copy-to-clipboard/), checked Nov 15. Row 6: Generative AI output label (https://cloudscape.design/gen-ai/patterns/generative-ai-output-label/), Response regeneration (https://cloudscape.design/gen-ai/patterns/response-regeneration/), Generative AI chat and Error messages (https://cloudscape.design/patterns/general/errors/error-messages/), checked Nov 15.

Row 7: Link (https://cloudscape.design/components/link/) and Generative AI chat, checked Nov 15. Product page buttons: the public AWS Marketplace listings that the fictional products are based on, checked Nov 15 (the mapping stays private, so the listings aren't named here).
