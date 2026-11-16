# Cloudscape deviation log

Each place where the build doesn't follow Cloudscape, with Lisa's approval and its source. Add a row before you build a new deviation. No deviation goes in without Lisa's OK.

| # | What | Cloudscape says | Approved | Where in code |
| --- | --- | --- | --- | --- |
| D1 | Purple "Approved for purchase" badge. Always call it purple (Lisa, Nov 16: "blue" could be mistaken for AWS blue). Color #3759ce with white text, from the console badge in Lisa's private-marketplace-prototype (style.css, `.badge--pmp`). Used for an approval status. | Badge colors are grey, blue, green, red and 5 severity colors. "Avoid using badges to indicate status"; use a status indicator. | Decision 33. Spec row 1 open question 2, decided Nov 14: keep the purple badge, log it for color and for use. | `src/components/ApprovedBadge.jsx` (Badge `style` API). The color is hardcoded, because no Cloudscape design token has it. |
| D2 | Drawer header "Product request assistant". | Generative AI chat and Ingress: the term is "generative AI assistant". | Spec row 1 open question 8, decided Nov 14. Both empty states say the assistant is powered by generative AI, and the avatar tooltip says "Generative AI assistant". | `shared/copy.js` (`drawerTitle`) |
| D3 | E3 (drawer fails to load) has no contact line. | Error messages: for unexpected client-side errors, ask the user to contact you with the error details. | Spec row 6 open question 7, decided Nov 15 (option A). The README says the real console would tell the buyer to contact AWS Support. | `src/drawer/DrawerErrorFallback.jsx` |
| D4 | AWS gen-ai gradient on the entry point buttons. "Request product" on My Private Marketplace and "Request approval" on the product page: normal variant with a gradient border, Cloudscape normal text color. "Request product" on Product requests: primary variant with a gradient fill and white text. The gradient is the "aws gen ai" style from the Figma frames (a radial gradient, light blue at the upper right to purple at the lower left). Hover and active keep the Cloudscape normal background tokens (normal) or add a darker layer (primary). Disabled uses the Cloudscape disabled tokens. The Cloudscape focus ring is not changed. | Public Cloudscape gen-ai buttons only add the gen-ai icon (Ingress pattern). The Visual affordance page names gradients only for loading states. | Lisa's step 1 review, Nov 16. Source: Lisa's Figma frames (HR file, section "Demo 2": PMP buyer home, PMP buyer product requests, PMP buyer PDP not approved). Approved by Lisa Nov 16. Contrast: see "D4 contrast" below. Darker fill for the primary variant: Lisa's answer, Nov 16 (step 1 fixes report, item 5). | `src/components/GenAiButton.jsx` (Button `style` API only, no CSS on Cloudscape class names). The gradient values are hardcoded, because no Cloudscape design token has them. |
| D5 | Cloudscape Tabs used to jump to sections on one page: the product page tab row (Overview, Pricing, Legal, Usage, Resources, Support). The tabs have no content. A tab scrolls to its section, and the active tab follows the scroll. The tab row is sticky: it stays in view under the top navigation (and under the App layout toolbar on narrow screens). The sticky row is a plain div with `position: sticky`, a background from the `colorBackgroundLayoutMain` token and z-index 1001 (under the top navigation's 1002). Its top offset is measured in the browser. | Tabs: "Don't use tabs as steps, application navigation, or in-page anchor navigation." Anchor navigation is the component for jumping to sections on one page. Cloudscape has no sticky tab row. | Lisa's answer, Nov 16 (step 1 fixes report, item 3). Source: Lisa's frame "PMP buyer PDP - not approved" and the live AWS Marketplace product page. Approved by Lisa Nov 16. Sticky tab row: Lisa's answer, Nov 16 (round 2). Source: the live AWS Marketplace product page keeps its tab row in view. | `src/pages/ProductPage.jsx` (`useSectionTabs`, the `data-tab-row` div, `Tabs` with `disableContentPaddings`). |
| D6 | "Find requests" (text filter) and pagination on the Product requests table, which has 2 rows. | Table: "Only use filtering, pagination, and sorting if there are more than five items in the table." | Lisa's answer, Nov 16 (round 2). Source: Lisa's frame "PMP buyer product requests" and the live console. | `src/pages/ProductRequests.jsx` (`filter`, `pagination`). |

### D4 contrast (measured Nov 16, WCAG 2.1 AA)

Measured in Chromium on localhost: the button background without the text, sampled under the text box, against the text color. AA needs 4.5:1 for 14px bold text.

- Normal variant ("Request product" on My Private Marketplace, "Request approval" on the product page): text #006ce0 on white, 4.97:1. Passes. Hover: #002b66 on #f0fbff, 12.97:1. Passes. The gradient border goes down to 2.31:1 against the white page at its lightest point. The text and the shape of the button identify it, so this is the same as other Cloudscape buttons that rely on their text. Not a fail, but noted.
- Primary variant ("Request product" on Product requests), first build: white text on the frame gradient was 2.41:1 to 4.58:1 (median 3.53:1). It failed AA.
- Primary variant, fixed Nov 16 (Lisa's answer, step 1 fixes report, item 5): the fill uses a darker copy of the gradient. Each color stop keeps its hue and has a lower lightness, until white is at least 4.75:1 on it. The direction stays the same: blue at the upper right to purple at the lower left. Measured under the text area in Chromium: default 4.74:1 to 5.11:1 (median 4.81:1), hover 6.49:1 to 7.06:1, active 8.32:1 to 9.06:1. **Passes AA in all 3 states.** A free UI test checks the 4.5:1 minimum in each state. The normal variant keeps the frame gradient on its border (its text is not on the gradient).

  | Offset | Frame color (RGB) | White text | New color (RGB) | White text |
  | --- | --- | --- | --- | --- |
  | 0 | 184, 231, 255 | 1.32:1 | 0, 120, 181 | 4.82:1 |
  | 0.075 | 138, 212, 255 | 1.62:1 | 0, 118, 186 | 4.88:1 |
  | 0.15 | 92, 192, 255 | 2.01:1 | 0, 119, 194 | 4.75:1 |
  | 0.1875 | 69, 182, 255 | 2.24:1 | 0, 118, 194 | 4.81:1 |
  | 0.225 | 46, 173, 255 | 2.46:1 | 0, 118, 194 | 4.81:1 |
  | 0.2625 | 23, 163, 255 | 2.72:1 | 0, 117, 194 | 4.86:1 |
  | 0.28125 | 12, 158, 255 | 2.86:1 | 0, 118, 196 | 4.79:1 |
  | 0.3 | 0, 153, 255 | 3.00:1 | 0, 118, 196 | 4.79:1 |
  | 0.31875 | 12, 150, 255 | 3.08:1 | 0, 115, 203 | 4.87:1 |
  | 0.3375 | 23, 147, 255 | 3.16:1 | 0, 113, 212 | 4.87:1 |
  | 0.375 | 46, 140, 255 | 3.33:1 | 0, 108, 240 | 4.77:1 |
  | 0.4125 | 69, 134, 255 | 3.44:1 | 21, 102, 255 | 4.80:1 |
  | 0.45 | 92, 127, 255 | 3.54:1 | 56, 99, 255 | 4.78:1 |
  | 0.6 | 133, 117, 255 | 3.51:1 | 106, 86, 255 | 4.79:1 |
  | 0.7 | 142, 82, 255 | 4.37:1 | 135, 72, 255 | 4.77:1 |
  | 0.8 | 150, 46, 255 | 5.08:1 | 150, 46, 255 (no change) | 5.08:1 |

## Not deviations (checked)

- "AWS Responsible AI Policy" external link in the prompt input constraint text. Cloudscape allows external links with the external icon. It is an exception to project decision 35 (keep links in the console), approved Nov 12 (spec row 1 open question 4).
- No "Generated by AI" output label (spec row 6 open question 1, decided Nov 15). The Generative AI output label page says to avoid a label on every output in a group.
- No stop or regenerate button (spec row 6 open question 4, decided Nov 15). Both are optional on the Response regeneration page.
