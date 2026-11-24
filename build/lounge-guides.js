// What each lounge card's button opens: the ritual, explainer, or next step
// itself, shown right on the card. A second button then goes on to the
// products, project form, or consultation (the button's original route).
// Keyed by card title. General education only; no prices or medical claims.

export const GUIDES = {
  // ---------- Madam Allure: The Powder Room ----------
  'Use Body Oil on Slightly Damp Skin': {
    title: 'A simple body-oil ritual',
    steps: [
      'Shower or bathe in comfortably warm water, not hot.',
      'Pat your skin with a towel so it is still slightly damp.',
      'Warm a few drops of dry body oil between your palms.',
      'Smooth it over arms, legs, and shoulders using long, upward strokes. Add a little more only where skin feels dry.',
      'Give it a minute to absorb before dressing.',
    ],
    next: 'See the dry body oils',
  },
  'Body Oil or Fragrance Oil?': {
    title: 'Find your fragrance ritual',
    steps: [
      'Want soft scent and moisture all over? Use dry body oil after bathing.',
      'Want a stronger, personal scent? Roll fragrance oil on wrists, behind the ears, and at the base of the throat.',
      'Want both? Apply body oil first, then a light touch of the matching fragrance oil on pulse points.',
      'Layer the same scent family so the two blend instead of compete.',
    ],
    next: 'See fragrance options',
  },
  'A Better Bath-Tea Ritual': {
    title: 'A relaxing bath-tea ritual',
    steps: [
      'Run a comfortably warm bath.',
      'Add the bath tea as the product directions say, and let it steep a few minutes.',
      'Soak for 15 to 20 minutes and breathe slowly.',
      'Rinse, pat dry, and finish with body oil or shea butter while skin is still damp.',
      'Stop using it if any irritation occurs.',
    ],
    next: 'See bath rituals',
  },
  'Hyaluronic Acid and Hydration': {
    title: 'Where a hydrating serum fits',
    steps: [
      'Cleanse your face gently.',
      'Apply a few drops of hydrating serum to slightly damp skin.',
      'Follow right away with moisturizer to help hold the hydration in.',
      'In the morning, finish with sunscreen.',
    ],
    next: 'See facial care',
  },
  'Niacinamide in a Simple Routine': {
    title: 'Build a simple ritual',
    steps: [
      'Morning: gentle cleanser, serum, moisturizer, sunscreen.',
      'Evening: cleanser, serum, moisturizer.',
      'Add only one new product at a time, and give it a couple of weeks before adding another.',
      'Patch-test new products and keep the routine short.',
    ],
    next: 'See facial care',
  },
  'African Black Soap Care': {
    title: 'Using African black soap gently',
    steps: [
      'Lather the soap in your hands first instead of rubbing the bar on your skin.',
      'Massage lightly, then rinse well with lukewarm water.',
      'Start with a few times a week and see how your skin feels.',
      'Follow with moisture, such as body oil or whipped shea butter.',
    ],
    next: 'See cleansing care',
  },
  'Shea Butter for Skin and Hair': {
    title: 'Ways to use whipped shea butter',
    steps: [
      'Skin: warm a small amount in your palms and press it into dry areas like elbows, knees, and heels.',
      'Hair: smooth a little over the ends after your leave-in to help seal in moisture.',
      'Night ritual: apply to hands and feet before bed.',
      'Start small; a little goes a long way.',
    ],
    next: 'See shea butter',
  },
  'Botanical Oil Care': {
    title: 'A botanical oil routine',
    steps: [
      'Scalp: part the hair and apply a few drops along the parts, then massage gently with your fingertips.',
      'Ends: smooth a drop or two over the ends to help with dryness.',
      'Beard: work a few drops through the beard and onto the skin underneath.',
      'Use a light hand and adjust to how your hair and skin respond.',
    ],
    next: 'See botanical care',
  },
  'Beard Oil Versus Beard Balm': {
    title: 'Choosing oil or balm',
    steps: [
      'Beard oil: best for short beards and the skin underneath. Use a few drops daily after washing.',
      'Beard balm: best for longer beards that need light hold and shaping.',
      'Many men use both: oil first for the skin, then balm to style.',
      'Comb or brush through to spread it evenly.',
    ],
    next: 'See grooming',
  },
  'Fragrance Sensitivity': {
    title: 'If you are sensitive to fragrance',
    steps: [
      'Patch-test first: apply a small amount to the inner arm and wait 24 hours.',
      'Choose lighter application: one pulse point instead of several.',
      'Apply fragrance to clothing or hair ends rather than skin if skin reacts.',
      'Stop using a product that causes irritation, and ask a professional about allergies.',
    ],
    next: 'See fragrance options',
  },

  // ---------- Allure Fusions: The Maker's Lounge ----------
  'From Idea to Object': {
    title: 'How a custom piece is made',
    steps: [
      'You share your idea, photos, measurements, and how the piece will be used.',
      'Tanika reviews it and confirms what is possible, the materials, and a quote.',
      'A design or digital preview is prepared for your approval.',
      'After approval and payment or deposit, the piece is printed or engraved, finished, and inspected.',
      'It ships to you once the balance is paid.',
    ],
    next: 'Start my custom project',
  },
  'What Makes Dimensional Art Different?': {
    title: 'What dimensional art can be',
    steps: [
      'Raised lettering and layered names that you can see and feel.',
      'Lithophanes that show a photo when light passes through.',
      'Multicolor pieces that combine several materials or colors in one build.',
      'Engraved or cut details on wood, acrylic, and other materials.',
    ],
    next: 'Explore dimensional art',
  },
  'PLA Product Care': {
    title: 'Caring for PLA pieces',
    steps: [
      'Keep pieces out of hot cars, direct sun in hot windows, and dishwashers. PLA can soften with heat.',
      'Dust with a soft, dry brush or cloth.',
      'For smudges, use a slightly damp cloth and dry right away.',
      'Avoid harsh cleaners and solvents.',
    ],
    next: 'Start a project',
  },
  'PLA or PETG?': {
    title: 'Help choosing a filament',
    compare: [
      ['PLA', 'Rigid, crisp detail, widest color range, smooth finish. Best for decor, signs, keychains, lithophanes, and gifts kept indoors. Softens with heat, so keep it out of hot cars and dishwashers.'],
      ['PETG', 'Tougher and slightly flexible, so it is less likely to snap. Better resistance to moisture and moderate heat. Best for functional parts, outdoor-adjacent items, holders, and pieces handled every day.'],
      ['Specialty PLA', 'Silk, matte, and other finishes change the look (shine, sheen, texture) while keeping PLA\'s detail. Good for display and gifts.'],
      ['Flexible (TPU)', 'Rubber-like and bendable. Used for bumpers, grips, and straps. Ask whether your piece is a fit.'],
    ],
    note: 'Not sure? Describe where the piece will live and how it will be used, and Tanika will recommend the material. 3D-printed pieces are not recommended for food or drink contact.',
    next: 'Start my project',
  },
  'How a Lithophane Works': {
    title: 'Planning a lithophane lamp',
    steps: [
      'Choose a clear, well-lit photo with the face or subject large in the frame.',
      'Pick a shape: flat panel, curved panel, cylinder lamp, or a lamp with several photos.',
      'Add optional text, such as a name or date.',
      'The image only shows clearly when light shines through, so lamps include a light source.',
    ],
    next: 'Plan a lithophane lamp',
  },
  'Why Photo Quality Matters': {
    title: 'Preparing your photos',
    steps: [
      'Send the original file, not a screenshot or a photo of a photo.',
      'Choose good, even lighting and a sharp focus.',
      'Crop close to the subject; small faces lose detail.',
      'High contrast helps; very dark or washed-out photos may not translate well.',
      'Send several options if you are not sure.',
    ],
    next: 'Start my project',
  },
  'NFC-Enabled Creations': {
    title: 'What an NFC tag can do',
    steps: [
      'A tiny chip inside the piece opens a link when a phone taps it.',
      'Use it for a business card, social profile, website, menu, playlist, or memorial page.',
      'The link can usually be changed later without changing the piece.',
      'Most modern phones read NFC without an app.',
    ],
    next: 'Explore NFC options',
  },
  'STL Versus 3MF': {
    title: 'Which file you need',
    steps: [
      'STL: the most common 3D file. Shape only, no colors or print settings.',
      '3MF: a newer file that can carry colors, multiple parts, and print settings.',
      'Printing multicolor at home? Ask for 3MF.',
      'Sending to a print service or another program? STL works almost everywhere.',
    ],
    next: 'Request a digital design file',
  },
  'Why Multicolor Printing Can Cost More': {
    title: 'What affects a multicolor quote',
    steps: [
      'Each color change takes extra time and creates some waste material.',
      'More colors and more color changes per layer mean longer print times.',
      'Larger pieces and finer detail add time too.',
      'Fewer colors, or colors in separate layers, can lower the cost.',
    ],
    next: 'Configure my project',
  },
  'School and Organization Creations': {
    title: 'Planning a school or group order',
    steps: [
      'Share your logo, colors, and mascot, plus permission to use them.',
      'Decide the items: keychains, badge reels, signs, awards, or spirit pieces.',
      'Estimate quantities and your deadline; larger orders need more lead time.',
      'A sample can be approved before the full run.',
    ],
    next: 'Plan a school or organization project',
  },
  'File-Only Design Service': {
    title: 'How a file-only design works',
    steps: [
      'You describe the item and how you will print or cut it.',
      'Tanika designs it and sends a preview for approval.',
      'You receive the final digital file (such as STL, 3MF, or SVG) to make yourself.',
      'No physical piece is shipped.',
    ],
    next: 'Request a file-only quote',
  },
  'Caring for Dimensional Art': {
    title: 'Full care instructions',
    steps: [
      'Display away from heat sources and strong, direct sunlight to protect colors and shape.',
      'Dust gently with a soft brush.',
      'Clean with a slightly damp cloth only; dry right away.',
      'Lamps: use the included or recommended light source and keep cords untangled.',
      'Engraved wood: keep dry; acrylic: wipe with a soft cloth to avoid scratches.',
    ],
    next: 'Start a project',
  },
  'Laser Engraving or Laser Cutting?': {
    title: 'Engraving or cutting',
    steps: [
      'Engraving marks the surface: names, logos, and photos on wood, acrylic, slate, and coated metals.',
      'Cutting goes all the way through to make shapes, letters, layered signs, and ornaments.',
      'Many pieces combine both: cut a shape, then engrave details on it.',
    ],
    next: 'Explore laser services',
  },
  'Preparing Artwork for Laser Work': {
    title: 'Getting artwork ready',
    steps: [
      'Best: vector files (SVG, PDF, AI, or EPS) with clean lines.',
      'Photos and images: send the highest resolution you have.',
      'Keep very thin lines and tiny text to a minimum; they may not hold up.',
      'Tell us the finished size so the detail can be checked.',
    ],
    next: 'Start my project',
  },

  // ---------- AI AuthoriTech: The AI Clarity Lounge ----------
  'Myth: AI Will Replace Everyone': {
    title: 'What AI really changes',
    steps: [
      'AI handles repetitive, rules-based tasks: drafting, sorting, summarizing, and data entry.',
      'People keep the judgment, relationships, and decisions.',
      'The goal is to give your team time back, not take their place.',
    ],
    next: 'See human-centered AI services',
  },
  'Myth: AI Knows Everything': {
    title: 'Why human review matters',
    steps: [
      'AI can sound confident and still be wrong.',
      'Check facts, numbers, and names before anything goes out.',
      'Keep a person responsible for final decisions, especially on customers, money, and people.',
    ],
    next: 'Learn about human review',
  },
  'Myth: Automation Means Losing Control': {
    title: 'Keeping control of automation',
    steps: [
      'You decide which steps run automatically and which wait for approval.',
      'Every automation can log what it did, so you can review it.',
      'Start small, and add more once you trust the results.',
    ],
    next: 'Analyze my process',
  },
  'Start With the Process, Not the Tool': {
    title: 'A quick readiness check',
    steps: [
      'Write down one task your team repeats every week.',
      'List each step, who does it, and how long it takes.',
      'Mark where information is copied, retyped, or waited on.',
      'Those spots are where AI or automation can help first.',
    ],
    next: 'Run the readiness check',
  },
  'Good First Automation Projects': {
    title: 'Good places to start',
    steps: [
      'Sorting and answering common emails or form submissions.',
      'Turning meeting notes into action items.',
      'Moving data between apps you already use.',
      'Weekly reports that are copied together by hand.',
    ],
    next: 'Find an automation opportunity',
  },
  'Chatbot, AI Agent, or Workflow?': {
    title: 'Which one fits',
    steps: [
      'Chatbot: answers questions from your information, such as FAQs and policies.',
      'Workflow: runs the same steps every time, such as routing a form or sending a reminder.',
      'AI agent: works toward a goal across several steps and tools, with limits you set.',
    ],
    next: 'Explore AI agent options',
  },
  'AI Readiness Is More Than Software': {
    title: 'What readiness includes',
    steps: [
      'Clear goals: what problem you are solving.',
      'Data: is the information organized and accessible?',
      'People: who will own it, and who needs training?',
      'Policies: what is allowed, and how is information protected?',
    ],
    next: 'Check my organization\'s readiness',
  },
  'Protect Sensitive Information': {
    title: 'Simple safety habits',
    steps: [
      'Never paste passwords, personal IDs, or confidential client details into public AI tools.',
      'Use business accounts with data protections turned on.',
      'Write a short AI-use policy so everyone follows the same rules.',
    ],
    next: 'Explore responsible AI planning',
  },
  'Pilot Before You Scale': {
    title: 'How to run a pilot',
    steps: [
      'Pick one process and a small group of users.',
      'Decide how you will measure success: time saved, errors, or satisfaction.',
      'Run it for a few weeks and collect feedback.',
      'Expand only what worked.',
    ],
    next: 'Plan a pilot',
  },
  'AI for Customer Experience': {
    title: 'Customer-facing ideas',
    steps: [
      'An assistant that answers common questions any time of day.',
      'Faster replies to emails and messages, reviewed by your team.',
      'Personalized follow-ups after a purchase or visit.',
    ],
    next: 'Explore customer-facing AI',
  },
  'AI for Internal Knowledge': {
    title: 'A knowledge assistant',
    steps: [
      'Gather your policies, guides, and FAQs in one place.',
      'An assistant answers staff questions from those documents, with links to the source.',
      'Keep the documents current, and the answers stay current.',
    ],
    next: 'Explore a knowledge assistant',
  },
  'AI for Learning and Training': {
    title: 'Learning ideas',
    steps: [
      'Turn existing materials into short lessons and quizzes.',
      'Give learners a practice assistant for questions.',
      'Use reports to see where people get stuck.',
    ],
    next: 'Explore learning solutions',
  },
  'The Purpose of an AI Audit': {
    title: 'What an AI audit covers',
    steps: [
      'Which AI tools are already in use, officially or not.',
      'Where data goes and who can see it.',
      'Risks, gaps, and quick wins.',
      'A short, prioritized plan for what to do next.',
    ],
    next: 'Request an AI readiness conversation',
  },
};
