// Every fixed string that code (not Claude) shows. Source: docs/demo2-spec.md and Lisa's answers (Nov 16).
// Claude never writes these. Text that Claude writes is not in this file.

export const AWS_RESPONSIBLE_AI_POLICY_URL = 'https://aws.amazon.com/ai/responsible-ai/policy/';

export const COPY = {
  // Pages (frames 1 to 3)
  requestProduct: 'Request product',
  requestApproval: 'Request approval',
  explorePmp: 'Explore your Private Marketplace',
  discoverProducts: 'Discover products',
  viewPurchaseOptions: 'View purchase options',
  approvedBadge: 'Approved for purchase',
  requestsEnabled: 'Product request enabled',
  requestsDisabled: 'Product request disabled',
  productRequests: 'Product requests',

  // Frame 3 info Alert, one for each case
  alertNotApproved: "This product isn't approved for purchase in your Private Marketplace. You can request approval from your administrator.",
  alertPendingBefore: 'You requested approval for this product. View its status in ',
  alertPendingAfter: '.',
  alertRequestsOff: "This product isn't approved for purchase in your Private Marketplace. Product requests are turned off.",
  alertBlocked: "This product isn't approved for purchase in your Private Marketplace. This product can't be requested.",

  // Drawer shell
  drawerTitle: 'Product request assistant',
  triggerAriaLabel: 'Open product request assistant',
  closeAriaLabel: 'Close product request assistant',
  chatRegionLabel: 'Chat',
  assistantName: 'Generative AI assistant',
  promptPlaceholder: 'Ask a question',
  sendAriaLabel: 'Send message',
  constraintBefore: 'Use of this service is subject to the ',
  constraintLink: 'AWS Responsible AI Policy',
  constraintAfter: '.',
  generating: 'Generating a response',
  loadingProducts: 'Loading matching products',

  // Frame 2b: opened from "Request product"
  emptyRequestHeading: 'Request a product',
  emptyRequestDescription:
    "I'm a product request assistant powered by generative AI. Tell me which product you need. I'll check if it's already approved, and if it isn't, help you send a request to your administrator.",

  // Frame 4: opened from the trigger bar
  emptyAskHeading: 'Ask about products in your Private Marketplace',
  emptyAskDescription:
    "I'm a product request assistant powered by generative AI. I can check if a product is approved for purchase, find approved products that do the same job, or help you request a product from your administrator. Choose a prompt or enter your own.",
  emptyAskDescriptionRequestsOff:
    "I'm a product request assistant powered by generative AI. I can check if a product is approved for purchase or find approved products that do the same job. Choose a prompt or enter your own.",
  promptIsApproved: 'Is <product name> approved for purchase?',
  promptFindApproved: 'Find an approved product for <what you need>',

  // Frame 5 and the note ask (Q5: fixed in code, asked once per conversation, decision 66)
  noteAsk: 'Do you want to add a note or a PO number? Both are optional.',
  continueWithoutNote: 'Continue without a note',
  showAlternatives: 'Show approved alternatives',

  // Card (frames 11, 12)
  cardIntro: "Here's the request I'll send to your administrator.",
  cardDescription: "Your administrator will review this request. You can cancel it in Product requests while it's pending.",
  cardNote: 'Note',
  cardPoNumber: 'PO number',
  cardVendor: 'Vendor',
  cancel: 'Cancel',
  submitRequest: 'Submit request',
  submitted: 'Submitted',
  notSent: 'Not sent',
  cancelled: "Got it. I didn't send the request.",
  sending: 'Sending your request',
  sent: 'Sent your request',

  // Contact bubble (row 5)
  contactEmail: 'Email',
  contactSlack: 'Slack channel',
  copyEmailAriaLabel: 'Copy email address',
  emailCopied: 'Email address copied',
  emailCopyFailed: 'Email address failed to copy',

  // Errors (frames 8c, 12, 21, 22)
  tryAgain: 'Try again',
  alsoRequestForm: 'You can also use the request form.',
  errorConnection: "The response couldn't be generated because of a connection error.",
  errorBusy: 'The product request assistant is busy, so the response couldn\'t be generated. Try again in a few minutes.',
  errorUnavailableBefore: "The product request assistant isn't available right now. You can use the ",
  errorUnavailableLink: 'request form',
  errorUnavailableAfter: ' to send your request.',
  errorStopped: 'The response stopped before it was complete because of a connection error.',
  errorSearchStep: "Couldn't search your Private Marketplace",
  drawerCrashBefore: "The product request assistant couldn't load. Reload the page to try again. You can also use the ",
  drawerCrashLink: 'request form',
  drawerCrashAfter: '.',
  reloadPage: 'Reload page',
  errorDetails: 'Error details',
  errorDetailsCopied: 'Error details copied',
  errorDetailsCopyFailed: 'Error details failed to copy',

  // Backup request form
  formTitle: 'Request a product',
  formProduct: 'Product',
  formReason: 'Reason for request',
  formPoNumber: 'PO number',
  formOptional: 'optional',
};

// Fixed lines with a product name. "Product requests" is a link in each one that ends with it.
export const lines = {
  frame5: (name) =>
    `You're looking at ${name}. It isn't approved for purchase in your Private Marketplace. I can send a request for approval to your administrator. ${COPY.noteAsk}`,
  requestPrompt: (name) => `Request ${name}`,
  cardHeading: (name) => `Submit request for ${name}?`,
  duplicate: (name) => ({ before: `You already sent a request for ${name}. View its status in `, link: COPY.productRequests, after: '.' }),
  sent: (name) => ({ before: `I sent your request for ${name} to your administrator. You can see its status in `, link: COPY.productRequests, after: '.' }),
  saveFailed: (name) => `Your request for ${name} wasn't sent because of a connection error.`,

  // Hand-off bubbles (Lisa's answers, Nov 16, step 2 part 1 report, Q1). Code writes them, not Claude.
  // Frame 17 (requests off). Spec text: "... To ask about it, speak with your administrator." Only Sam
  // has requests off today, and Finance has no contact details, so the "contact" ending is never used yet.
  handOffRequestsOff: (name, hasContacts) =>
    `Product requests are turned off in your Private Marketplace, so I can't send a request for ${name}. To ask about it, ${hasContacts ? 'contact' : 'speak with'} your administrator.`,
  // Frame 18 (product can't be requested). Spec text: "... To ask about it, contact your administrator."
  handOffCantRequest: (hasContacts) =>
    `This product can't be requested. To ask about it, ${hasContacts ? 'contact' : 'speak with'} your administrator.`,
  // 2 or more products in one answer: 1 combined bubble (Lisa's answers, Nov 16, part 1b report).
  handOffRequestsOffMany: (hasContacts) =>
    `Product requests are turned off in your Private Marketplace, so I can't send a request for these products. To ask about them, ${hasContacts ? 'contact' : 'speak with'} your administrator.`,
  handOffCantRequestMany: (hasContacts) =>
    `These products can't be requested. To ask about them, ${hasContacts ? 'contact' : 'speak with'} your administrator.`,

  // Frame 16 (recheck at submit). The requests-off and D lines end with the hand-off (row 5, decided Nov 15).
  approvedNow: (name) => `${name} is now approved in your Private Marketplace, so I didn't send the request.`,
  requestsOffNotSent: (name, hasContacts) =>
    `Product requests are turned off in your Private Marketplace, so I didn't send the request. To ask about ${name}, ${hasContacts ? 'contact' : 'speak with'} your administrator.`,
  blockedNotSent: (hasContacts) =>
    `This product can't be requested, so I didn't send the request. To ask about it, ${hasContacts ? 'contact' : 'speak with'} your administrator.`,

  // Step lines (frames 6, 8a, 9, 17)
  searchHeader: (query) => `Searched your Private Marketplace for "${query}"`,
  searchLoading: (query) => `Searching your Private Marketplace for "${query}"`,
  searchDone: (count) => `Searched products. ${count} matched.`,
  alternativesHeader: (name) => `Checked approved products like ${name}`,
  alternativesDone: (category, count) => `Checked approved products in ${category}. ${count} found.`,
  // Drafts (step 1 guesses). The spec has only the finished step text for alternatives, and no copy
  // for the result of a frame 7 choice.
  alternativesLoading: (name) => `Checking approved products like ${name}`,
  choiceLoading: (label) => `Checking products for "${label}"`,
  choiceHeader: (label) => `Checked products for "${label}"`,
  choiceDone: (categories, count) => `Checked products in ${categories}. ${count} found.`,
};
