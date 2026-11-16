# Frame 3 Figma round trip (step 1 fixes, Nov 16)

Frame 3 is the product page. Its Figma source is the frame "PMP buyer PDP - not approved" in the Figma file "HR", page "prototyping in Claude", section "Demo 2". The approved case uses the frame "PMP buyer PDP - approved". Both frames are 1720px wide (280px left nav plus a 1440px content area).

Rule for this round trip (Lisa, part 9): "Use the Figma frames for layout and components only. Text, labels and product data come from the spec and catalog.json." The sticky notes on the canvas say the same: the Fortinet text and graphics are placeholders, and the spec wins.

## Figma tools used

All reads. Claude Code made no change to the Figma file. Figma reads are not Claude API requests.

| Tool (Figma MCP server) | What for | Result |
| --- | --- | --- |
| `create_session` | Start a read session on the HR file. | OK. |
| `get_metadata` (page) | Find the "Demo 2" section, its 4 frames and the 4 sticky notes. | The full page tree was about 2.9 million characters, too big for one response. It went to a file, and I filtered it to the Demo 2 section. The tree gives node IDs, layer names, positions, sizes and `hidden` flags. |
| `get_design_context` (4 sticky notes) | Read "Notes for Claude build" 1 to 4. | The note text came through correctly. |
| `get_screenshot` (4 frames) | The visual target for each page. | Correct PNGs at full size (the product page frames are 4327px tall). |
| `get_design_context` (action stack, node 6912:180878) | The "View purchase options" and "Request approval" buttons. | Sizes, padding and Cloudscape variables came through. The gradient border did not (see below). |
| `get_design_context` (Product requests table, node 6912:177548) | The filled "Request product" button and the table header. | The gradient came through as an SVG radial gradient with 16 color stops. |

Not used: `get_variable_defs`, Code Connect (the file has no Code Connect mappings for these components), and all write tools.

## What came through correctly

- **Layout:** the 1040px content column with 200px margins, the header row (140 x 80 logo, 20px gap, title), the right-hand action stack (2 buttons, 8px apart, right-aligned), the tab row under the header, and the section order: Overview, Pricing, Legal, Usage information, Resources, Support.
- **Spacing:** 60px between sections, 20px between a section title and its content, 20px between containers, 20px between the Alert and the header. These values come from the node positions in `get_metadata`.
- **Components (from layer names):** Alert, Header/Page, Link, Badge, Primary button, Normal button, Container - Simple, Tabs ("Links" and "Videos" in Vendor resources), Select ("Version"), Side navigation with an "Expandable link group", Breadcrumb group, Table.
- **Tokens:** Cloudscape variables with their fallback values, for example `--background/button/primary/disabled` (#ebebf0), `--text/button/primary/disabled` (#8c8c94), `--text/link/default` (#006ce0), `--radius/button` (20px), `--xs` (8px), `--large` (22px). Text style names came through too (Heading 2, Info link, Paragraph Bold).
- **Hidden layers:** `hidden="true"` flags let me skip layers that don't show in the frame (Features and programs, Customer reviews, a Flashbar, extra badges and buttons).

## What came through wrong or was missing

1. **The gen-ai gradient on the normal button.** The style name "aws gen ai" came through, but the code for "Request approval" said `border #b8e7ff` (only the first gradient stop) and text #006ce0. The gradient border was lost. The screenshot showed the real look. The filled button on the Product requests frame did bring the full gradient (an SVG radial gradient). I used that SVG for both buttons.
2. **Code format.** `get_design_context` returns React with Tailwind classes, absolute positions and hex colors. It doesn't return Cloudscape components. I mapped each layer to a Cloudscape component by hand.
3. **Misleading layer names.** The disabled "View purchase options" is a "Primary button (Atom)" with disabled colors. The filled gen-ai button is also a "Primary button (Atom)". The buyer left nav is named "Side navigation PMP admin other". I used the screenshot to confirm each one.
4. **Heading levels.** Each section title uses "Header/Page" (the page heading size). A page can have only one h1, so the build uses the h1 size with an h2 tag (`headingTagOverride`).
5. **The tab row.** In Figma it is a custom "Subnavigation / nav-secondary" layer: a full-width band, dark bold text for the active tab and a dark underline. It is not a Cloudscape Tabs instance. The build uses Cloudscape Tabs (blue active tab, no full-width band). Cloudscape Tabs also adds 16px of padding above and below its content, which made the gap to Overview 92px. `disableContentPaddings` fixed it (now 60px).
6. **Spacing that is not on the Cloudscape scale.** 60px between sections: SpaceBetween has no size above `xxl` (32px). I first used `size="xxxl"`, which doesn't exist, and the gaps were 0. Now each section has a 20px gap plus 40px top padding (`xxxl` exists for Box padding). The 40px gutter between the 2 Overview columns: Cloudscape Grid has a 20px gutter, so the columns are 510px, not 500px. Not changed.
7. **Content that catalog.json doesn't have.** Logo, product video, long overview, highlights, delivery option, latest version, operating system, pricing, refund policy, legal text, usage instructions, vendor links and videos, support text. The build shows placeholder text in square brackets, the same for every product (see "Placeholders").
8. **Content the spec doesn't allow.** All prices (decision 107): the usage cost table, the infrastructure cost table, the Region select and the free trial. The "Request demo", "Try for free" and "Get support" buttons (spec frame 3: "No other buttons", and no page for them). The "Free trial" badge was hidden in Figma already.
9. **The breadcrumb.** The frame shows AWS Marketplace > Security > Amazon Machine Image (AMI) > product. The build shows AWS Marketplace > category > product. The prototype has no page for a delivery method.

## What I fixed by hand

- Rebuilt the gen-ai gradient with the Cloudscape Button `style` API, from the SVG of the filled button (logged as D4 in docs/deviations.md).
- Mapped every layer to a Cloudscape component: Alert, Header, Grid, SpaceBetween, Tabs, Container (with `media` for the video slot), KeyValuePairs, TextContent, Select, FormField.
- Set the spacing to the frame values with Cloudscape sizes (see item 6).
- Made the logo and video slots token-styled placeholders (`colorBackgroundCellShaded`, `colorBorderDividerDefault`, `borderRadiusContainer`).
- Replaced all Fortinet text with catalog data (name, vendor, category, delivery method, description) or placeholders.
- Applied the spec where it differs from the frame (see "Frame and spec differences" in the step 1 fixes report).

## Measured in the browser (1720px viewport, Riley, Meshwire)

| Item | Frame | Build |
| --- | --- | --- |
| Content column width | 1040px | 1040px |
| Alert to header row | 20px | 20px |
| Logo | 140 x 80px | 140 x 80px |
| Logo to title | 20px | 20px |
| Button stack gap | 8px | 8px |
| Button widths | 193px, 193px | 204px, 188px (Cloudscape sizes buttons to their text) |
| Tab row to Overview title | 60px | 60px |
| Between sections | 60px | 59 to 60px |
| Overview columns | 500 + 40 + 500px | 510 + 20 + 510px |
| Content left edge (from the left nav) | 200px | 171px (App layout centers the column between the left nav and the drawer trigger bar) |

## Placeholders

| Slot in the frame | Placeholder |
| --- | --- |
| Logo | [Logo] |
| Product video | [Product video] |
| Long overview | [Placeholder: long product overview. The catalog has only the short description.] and, after "Show more", [Placeholder: more overview text.] |
| Highlights | [Placeholder: highlight 1] to [Placeholder: highlight 3] |
| Details: Delivery option, Latest version, Operating system | [Placeholder] |
| Pricing | [Placeholder: pricing information. The prototype shows no prices.] |
| Vendor refund policy | [Placeholder: vendor refund policy] |
| Vendor terms and conditions | [Placeholder: vendor terms and conditions] |
| Content disclaimer | [Placeholder: content disclaimer] |
| Version select | [Placeholder] - latest version |
| Delivery details | heading from catalog.json (delivery method), text [Placeholder: delivery details] |
| Additional details | [Placeholder: usage instructions] |
| Vendor resources | [Placeholder: vendor links], [Placeholder: vendor videos] |
| Vendor support, AWS infrastructure support | [Placeholder: vendor support information], [Placeholder: AWS infrastructure support information] |

All placeholder strings are in `PLACEHOLDER` in `src/pages/ProductPage.jsx`.
