/* Events for PortalLux Lounge. Rule: no more than ONE live a week.
   The weekly live is the Lounge Live for the class of the week (screen share, camera optional).
   On-camera specials are rare, and they replace that week's Lounge Live instead of adding a second one.
   Everything else is recorded ahead (screen and voice, no face needed) or a post you answer in your own time.
   No dates yet. Both the Instructor Guide and the Events Plan read this file. */
window.EVENTS = {
  formats: {
    camera:   { label: 'Live on camera', short: 'On camera', hint: 'You on video, live' },
    voice:    { label: 'Live, camera optional', short: 'Live, camera optional', hint: 'Screen share and voice; turn your camera on only if you want' },
    recorded: { label: 'Recorded ahead', short: 'Recorded', hint: 'Screen and voice, recorded when it suits you; Grok edits it' },
    async:    { label: 'Post, no live', short: 'Post', hint: 'A post or thread you answer in your own time' }
  },
  types: {
    live: 'Lounge Live', welcome: 'Class Welcome Video', review: 'Show Your Build Thread', thread: 'Lounge Thread',
    qa: 'Open Q&A', hot: 'Hot Seat Review', challenge: 'Challenge', celebrate: 'Celebration', workshop: 'Workshop'
  },
  /* What every class gets. Only the Lounge Live is live. */
  standard: [
    { type: 'welcome', format: 'recorded', title: '{title}: Class Welcome', mins: 3, when: 'Posted when the class opens',
      agenda: [[1, 'What we are building this week and why it matters'], [1, 'Quick look at it working in your portal'], [1, 'Where to start: first lesson and the Class Studio']] },
    { type: 'workshop', format: 'recorded', title: '{title}: Build-Along Video', mins: 15, when: 'Recorded ahead and posted with the lessons',
      agenda: [[2, 'What we are building and the finished result'], [10, 'Build the challenge step by step in the example portal'], [3, 'Common mistakes and what to post in Show Your Build']] },
    { type: 'live', format: 'voice', title: 'Lounge Live: {title}', mins: 30, when: 'Your one live this week (same day and time every week)',
      agenda: [[5, 'Welcome and wins from the week'], [20, 'Open help: members bring questions or share their screen'], [5, 'Wrap-up and what’s next']] },
    { type: 'review', format: 'async', title: '{title}: Show Your Build Thread', mins: 30, when: 'End of the week, one pass through the comments',
      agenda: [[25, 'Reply to member screenshots with quick feedback'], [5, 'Pick one build to spotlight next week']] }
  ],
  /* Extra ideas per class, all non-live: Lounge Threads (posts) or short recorded tips. They can also be a segment inside that week's Lounge Live. */
  classEvents: {
    start: [{ type: 'thread', format: 'async', title: 'Introduce Yourself Thread', mins: 15, note: 'Pinned thread; reply to each introduction once a week.' }],
    map: [{ type: 'thread', format: 'async', title: 'Hat Count Thread', mins: 15, note: 'Members post their job totals; you sort a few in the comments.' }],
    gather: [{ type: 'thread', format: 'async', title: 'Essentials Check-In Thread', mins: 15, note: 'Members share which essentials they gathered; you point out anything missing.' }],
    m1: [{ type: 'thread', format: 'recorded', title: 'My Tool Stack Tour', mins: 6, note: 'Short recording: the tools behind your businesses and what each sends to your portals.' }],
    first: [{ type: 'thread', format: 'async', title: 'First Portal Show and Tell Thread', mins: 20, note: 'Suite members post their first portal; you give one tip each.' }],
    look: [{ type: 'thread', format: 'async', title: 'Brand Kit Share Thread', mins: 15, note: 'Members post their brand cards; you react and give one tip each.' }],
    today: [{ type: 'workshop', format: 'recorded', title: 'From Plan to Portal: Suite Preview', mins: 10, note: 'Recorded: a finished Portal Plan next to the portal it becomes in the Suite, ending with the Suite invitation.' }],
    m2: [{ type: 'thread', format: 'async', title: 'Skill Card Swap Thread', mins: 15, note: 'Members share their best skill card.' }],
    m3: [{ type: 'thread', format: 'recorded', title: 'Schedule One Task with Me', mins: 6, note: 'Short recording of setting up one scheduled task.' }],
    m4: [{ type: 'thread', format: 'async', title: 'Brand Card Makeover Thread', mins: 20, note: 'Members post brand cards; you suggest one fix each.' }],
    m5: [{ type: 'thread', format: 'async', title: 'Order Form Check Thread', mins: 15, note: 'Members post their intake fields for quick feedback.' }],
    m6: [{ type: 'thread', format: 'recorded', title: 'Pipeline Rescue', mins: 8, note: 'Recording: moving a messy example order list onto a board.' }],
    m7: [{ type: 'thread', format: 'async', title: 'Export Help Desk Thread', mins: 20, note: 'Answer export questions for Wave, Clover, GoHighLevel, Etsy and Shopify.' }],
    m8: [{ type: 'thread', format: 'recorded', title: 'Print QR Labels with Me', mins: 6, note: 'Short recording of printing QR spool labels.' }],
    m9: [{ type: 'thread', format: 'async', title: 'Install Party Thread', mins: 10, note: 'Members post their installed app on phone or laptop.' }],
    m10: [{ type: 'thread', format: 'async', title: 'Message Makeover Thread', mins: 20, note: 'Members post one stiff template; you rewrite a few in their voice.' }],
    m11: [{ type: 'thread', format: 'async', title: 'Automation Show and Tell Thread', mins: 15, note: 'Members show one thing that now runs on its own.' }],
    m12: [{ type: 'thread', format: 'async', title: 'Price It Right Thread', mins: 20, note: 'Members post one product and price; you suggest adjustments.' }],
    m13: [{ type: 'celebrate', format: 'camera', title: 'Build Season Graduation Showcase', mins: 60, note: 'Replaces that week’s Lounge Live. Members present their finished portals.' }],
    b1: [{ type: 'thread', format: 'async', title: 'Building Map Review Thread', mins: 20, note: 'Review members’ floor plans in the comments.' }],
    b2: [{ type: 'thread', format: 'recorded', title: 'Scene Studio', mins: 10, note: 'Recording: generating a lobby scene with a style lock.' }],
    b3: [{ type: 'thread', format: 'async', title: 'Click Test Thread', mins: 15, note: 'Members post links; you test on a phone and reply.' }],
    b4: [{ type: 'thread', format: 'recorded', title: 'Voice Casting', mins: 8, note: 'Recording: comparing voices and speeds for a concierge.' }],
    b5: [{ type: 'thread', format: 'recorded', title: 'Publish with Me', mins: 12, note: 'Recording: preview, approve and publish, hidden from search.' }],
    b6: [{ type: 'celebrate', format: 'async', title: 'Front Door Open House Thread', mins: 20, note: 'Members share their finished websites and tour each other’s.' }]
  },
  /* Whole-community events. Only the camera ones are live, and each replaces that week's Lounge Live. */
  community: [
    { type: 'celebrate', format: 'camera', title: 'Founding Members Launch Party', mins: 45, tier: 'lobby', how: 'Once, at launch (replaces that week’s Lounge Live)', note: 'Welcome the first members, tour the Lounge, announce founding prices.' },
    { type: 'live', format: 'voice', title: 'Lounge Live (weekly)', mins: 30, tier: 'suite', how: 'Weekly, one set day and time', note: 'Drop-in help for the class of the week. The teaching is pre-recorded, so this is questions and screen shares only.' },
    { type: 'qa', format: 'voice', title: 'Open Lounge Q&A', mins: 45, tier: 'lobby', how: 'Monthly: one Lounge Live a month is opened to free members', note: 'Not an extra live. That week’s Lounge Live is open to everyone, and ends with your Suite invitation.' },
    { type: 'celebrate', format: 'camera', title: 'Build Season Graduation Showcase', mins: 60, tier: 'suite', how: 'Every season, Graduation week (replaces that week’s Lounge Live)', note: 'Members present their portals.' },
    { type: 'challenge', format: 'recorded', title: 'PortalLux Week: 5-Day Portal Challenge', mins: 10, tier: 'lobby', how: 'Quarterly: 5 short recorded daily lessons', note: 'Day 1 map, Day 2 first portal, Day 3 brand card, Day 4 Today page, Day 5 showcase thread. Your main growth event, with no extra lives.' },
    { type: 'celebrate', format: 'camera', title: 'PortalLux Week Finale', mins: 30, tier: 'lobby', how: 'Quarterly, last day of the challenge (replaces that week’s Lounge Live)', note: 'Celebrate challenge builds and open founding spots.' },
    { type: 'hot', format: 'recorded', title: 'Penthouse Hot Seat Review', mins: 30, tier: 'penthouse', how: 'Monthly, recorded', note: 'You record fixes for 3 or 4 Penthouse members’ builds, screen and voice.' },
    { type: 'welcome', format: 'recorded', title: 'New Member Welcome Video', mins: 5, tier: 'lobby', how: 'Recorded once, pinned', note: 'Tour of the Lounge and how to start. Update when tiers change.' },
    { type: 'thread', format: 'async', title: 'Wins Friday', mins: 15, tier: 'lobby', how: 'Weekly post', note: 'Celebrate wins; spotlight one member portal.' },
    { type: 'thread', format: 'async', title: 'Template Drop', mins: 15, tier: 'suite', how: 'Monthly post', note: 'Share the new vault template and how to use it.' },
    { type: 'thread', format: 'recorded', title: 'Build Season Sneak Peek', mins: 2, tier: 'lobby', how: 'Weekly short clip', note: 'Grok cuts a 1 to 2 minute clip from the Lounge Live replay for free members.' },
    { type: 'thread', format: 'recorded', title: 'New AI Tool Talk', mins: 8, tier: 'lobby', how: 'When something new launches', note: 'Short recording on what changed in free AI tools.' },
    { type: 'workshop', format: 'recorded', title: 'Holiday Rush Prep', mins: 25, tier: 'suite', how: 'Yearly, October', note: 'Inventory, order caps, message templates and shipping deadlines.' },
    { type: 'workshop', format: 'recorded', title: 'New Year Business Reset', mins: 20, tier: 'lobby', how: 'Yearly, January', note: 'Year-end reports, new goals, a fresh rhythm.' },
    { type: 'workshop', format: 'recorded', title: 'Tax-Time Finances Tidy-Up', mins: 20, tier: 'suite', how: 'Yearly, February', note: 'Export finances and reports for your accountant.' }
  ],
  /* What must be ready before each weekly Lounge Live, and who prepares it. */
  prep: [
    ['Run of show (minute-by-minute plan)', 'Claude', 'Instructor Guide'],
    ['Talking points, one page', 'Claude', 'Instructor Guide'],
    ['Demo portal with example data, ready to share on screen', 'Claude', 'Portal Proof folder'],
    ['Class prompts filled in with an example business', 'Claude', 'Class Studio'],
    ['Training doc for the class', 'Claude drafts, you upload to Skool', 'Training Docs'],
    ['Class Welcome video (3 minutes)', 'You record, Grok edits', 'Video clips'],
    ['Social teaser clip', 'Grok', 'Social platforms'],
    ['Week’s engagement posts', 'Claude drafts, you post', 'Engagement Posts'],
    ['Lounge Live event on the Skool calendar', 'You', 'Skool Calendar'],
    ['Replay posted, plus Sneak Peek clip', 'You upload, Grok cuts the clip', 'Skool Classroom and feed']
  ]
};
