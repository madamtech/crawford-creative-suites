/* Weekly engagement posts for PortalLux Lounge. No dates yet.
   The season runs: 6 Lobby weeks (launch and onboarding), then the 12-week Build Season, then Graduation week.
   Each week has 7 posts built from the class of the week. Wording follows Tanika's voice: warm, direct, no dashes. */
window.ENGAGE = {
  order: ['start', 'map', 'gather', 'm1', 'look', 'today', 'first', 'm4', 'm2', 'm3', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13'],
  /* Conversation starter and a poll for each class week */
  talk: {
    start: { q: 'Tell us what you make and the one task that eats most of your week.', poll: ['Answering messages', 'Tracking orders', 'Keeping up with stock', 'Money and receipts'] },
    map: { q: 'How many different "hats" did you count in your business this week?', poll: ['Under 10', '10 to 15', '16 to 20', 'More than 20'] },
    gather: { q: 'Which essential is hardest to pin down: prices, policies or suppliers?', poll: ['Prices', 'Policies', 'Suppliers', 'Where orders come from'] },
    m1: { q: 'How many different apps do you use to run your business?', poll: ['1 to 3', '4 to 6', '7 to 10', 'I lost count'] },
    first: { q: 'Post your first portal! What did you put on it first?', poll: ['Orders', 'Today checklist', 'Low stock', 'Something else'] },
    look: { q: 'Describe your brand in three words. Go!', poll: ['Dark and dramatic', 'Light and airy', 'Bold and bright', 'Soft and natural'] },
    today: { q: 'What is the one thing you most want your portal to run for you?', poll: ['My orders', 'My inventory', 'My finances', 'My messages'] },
    m2: { q: 'What is a task you have asked AI to help with more than once?', poll: ['Product descriptions', 'Customer replies', 'Social captions', 'Pricing'] },
    m3: { q: 'What is your most productive time of day for making?', poll: ['Early morning', 'Midday', 'Evening', 'Late night'] },
    m4: { q: 'Show us your portal colors! Which one is your favorite accent?', poll: ['Rose gold', 'Teal', 'Sapphire', 'Something else'] },
    m5: { q: 'Where do most of your custom orders come in today?', poll: ['DMs', 'Email', 'Text messages', 'Website or shop'] },
    m6: { q: 'Which stage do orders get stuck in most?', poll: ['Waiting on a deposit', 'In production', 'Waiting on approval', 'Ready to ship'] },
    m7: { q: 'Where does your sales data live right now?', poll: ['Etsy or Shopify', 'Square or Clover', 'Wave', 'A notebook'] },
    m8: { q: 'What material do you run out of at the worst possible moment?', poll: ['Filament or blanks', 'Ingredients', 'Packaging', 'Labels'] },
    m9: { q: 'What is the first thing you check every morning?', poll: ['Messages', 'Orders', 'Sales', 'Social'] },
    m10: { q: 'Share a sentence you write to customers all the time.', poll: ['Order confirmation', 'Shipping update', 'Thank you and review ask', 'Price quote'] },
    m11: { q: 'What is one thing in your business that now runs without you?', poll: ['Daily refresh', 'Reorder alerts', 'Weekly report', 'Not yet, but soon'] },
    m12: { q: 'Be honest: are you charging enough for your time?', poll: ['Yes', 'Not yet', 'Not sure', 'Never counted my time'] },
    m13: { q: 'What would you hand off first if you had a helper tomorrow?', poll: ['Packing and shipping', 'Messages', 'Social posting', 'Bookkeeping'] }
  },
  /* Feed category for each post type (matches the Skool setup map) */
  days: [
    ['Monday', 'Build Drop', 'Announcements'],
    ['Tuesday', 'Prompt Tuesday', 'Show Your Build'],
    ['Wednesday', 'Lounge Live', 'Live Build Replays'],
    ['Thursday', 'Behind the Build', 'Welcome and Introductions'],
    ['Friday', 'Wins Friday', 'Wins'],
    ['Saturday', 'Weekend Poll', 'Ask for Help'],
    ['Sunday', 'Sunday Reset', 'Announcements']
  ],
  graduation: [
    ['Monday', 'Graduation Week', 'Announcements', 'Graduation week in the Lounge! Twelve weeks ago a lot of us had orders in our DMs and stock on sticky notes. This week we celebrate what you built. Post your portal in Show Your Build, and the Showcase live is on the calendar.'],
    ['Wednesday', 'Showcase Live', 'Live Build Replays', 'The Build Season Showcase is live today. Bring your portal, share your screen for two minutes, and let us cheer you on.'],
    ['Friday', 'Wins Friday', 'Wins', 'Graduation wins! Tell us the one thing your portal does now that saves you the most time.'],
    ['Sunday', 'New Season', 'Announcements', 'A new Build Season starts next week. New members begin at Start Here, and graduates can take the Penthouse Front Door track or repeat any build with a new business.']
  ]
};
