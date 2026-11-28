// What each lounge card's button opens: the ritual, explainer, or next step
// itself, shown right on the card. A second button then goes on to the
// products, project form, or consultation (the button's original route).
// Keyed by card title. General education only; no prices or medical claims.
// show: product names the second button jumps to in the price list (Nov 25:
// owner asked that visitors land on the products, not the top of the list).
// cta: the card's own button wording (replaces "Explore ...").

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
    next: "See the dry body oils & prices",
    show: ["Dry Body Oil — Women", "Dry Body Oil — Men", "Dry Body Oil — Unisex"],
    cta: "Show me the ritual",
  },
  'Body Oil or Fragrance Oil?': {
    title: 'Find your fragrance ritual',
    steps: [
      'Want soft scent and moisture all over? Use dry body oil after bathing.',
      'Want a stronger, personal scent? Roll fragrance oil on wrists, behind the ears, and at the base of the throat.',
      'Want both? Apply body oil first, then a light touch of the matching fragrance oil on pulse points.',
      'Layer the same scent family so the two blend instead of compete.',
    ],
    next: "See fragrance & body oils",
    show: ["Women Fragrance Oil", "Men Fragrance Oil", "Unisex Fragrance Oil", "Dry Body Oil — Women", "Dry Body Oil — Men", "Dry Body Oil — Unisex"],
    cta: "Find my fragrance ritual",
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
    next: "See Bath Tea & price",
    show: ["Bath Tea"],
    cta: "Show me the ritual",
  },
  'Hyaluronic Acid and Hydration': {
    title: 'Where a hydrating serum fits',
    steps: [
      'Cleanse your face gently.',
      'Apply a few drops of hydrating serum to slightly damp skin.',
      'Follow right away with moisturizer to help hold the hydration in.',
      'In the morning, finish with sunscreen.',
    ],
    next: "See the Hydrating Facial Serum",
    show: ["Hydrating Facial Serum"],
    cta: "Show me where it fits",
  },
  'Niacinamide in a Simple Routine': {
    title: 'Build a simple ritual',
    steps: [
      'Morning: gentle cleanser, serum, moisturizer, sunscreen.',
      'Evening: cleanser, serum, moisturizer.',
      'Add only one new product at a time, and give it a couple of weeks before adding another.',
      'Patch-test new products and keep the routine short.',
    ],
    next: "See the facial serums",
    show: ["Facial Serum", "Hydrating Facial Serum"],
    cta: "Build a simple ritual",
  },
  'African Black Soap Care': {
    title: 'Using African black soap gently',
    steps: [
      'Lather the soap in your hands first instead of rubbing the bar on your skin.',
      'Massage lightly, then rinse well with lukewarm water.',
      'Start with a few times a week and see how your skin feels.',
      'Follow with moisture, such as body oil or whipped shea butter.',
    ],
    next: "See African Black Soap & prices",
    show: ["African Black Soap", "African Black Soap Shampoo Bar"],
    cta: "Show me how",
  },
  'Shea Butter for Skin and Hair': {
    title: 'Ways to use whipped shea butter',
    steps: [
      'Skin: warm a small amount in your palms and press it into dry areas like elbows, knees, and heels.',
      'Hair: smooth a little over the ends after your leave-in to help seal in moisture.',
      'Night ritual: apply to hands and feet before bed.',
      'Start small; a little goes a long way.',
    ],
    next: "See Whipped Shea Butter & price",
    show: ["Whipped Shea Butter"],
    cta: "Show me how",
  },
  'Botanical Oil Care': {
    title: 'A botanical oil routine',
    steps: [
      'Scalp: part the hair and apply a few drops along the parts, then massage gently with your fingertips.',
      'Ends: smooth a drop or two over the ends to help with dryness.',
      'Beard: work a few drops through the beard and onto the skin underneath.',
      'Use a light hand and adjust to how your hair and skin respond.',
    ],
    next: "See the botanical oils & prices",
    show: ["Hair Growth Oil", "Beard Oil", "Beard Balm", "Facial Serum"],
    cta: "Show me how",
  },
  'Beard Oil Versus Beard Balm': {
    title: 'Choosing oil or balm',
    steps: [
      'Beard oil: best for short beards and the skin underneath. Use a few drops daily after washing.',
      'Beard balm: best for longer beards that need light hold and shaping.',
      'Many men use both: oil first for the skin, then balm to style.',
      'Comb or brush through to spread it evenly.',
    ],
    next: "See Beard Oil & Beard Balm",
    show: ["Beard Oil", "Beard Balm"],
    cta: "Compare oil and balm",
  },
  'Fragrance Sensitivity': {
    title: 'If you are sensitive to fragrance',
    steps: [
      'Patch-test first: apply a small amount to the inner arm and wait 24 hours.',
      'Choose lighter application: one pulse point instead of several.',
      'Apply fragrance to clothing or hair ends rather than skin if skin reacts.',
      'Stop using a product that causes irritation, and ask a professional about allergies.',
    ],
    next: "See the fragrance oils",
    show: ["Women Fragrance Oil", "Men Fragrance Oil", "Unisex Fragrance Oil"],
    cta: "Show me how",
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
    to: 'project',
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
    to: 'services',
    next: 'See products & pricing',
  },
  'PLA Product Care': {
    title: 'Caring for PLA pieces',
    steps: [
      'Keep pieces out of hot cars, direct sun in hot windows, and dishwashers. PLA can soften with heat.',
      'Dust with a soft, dry brush or cloth.',
      'For smudges, use a slightly damp cloth and dry right away.',
      'Avoid harsh cleaners and solvents.',
    ],
    to: 'services',
    next: 'See products & pricing',
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
    to: 'services',
    next: 'See products & pricing',
  },
  'How a Lithophane Works': {
    title: 'Planning a lithophane lamp',
    steps: [
      'Choose a clear, well-lit photo with the face or subject large in the frame.',
      'Pick a shape: flat panel, curved panel, cylinder lamp, or a lamp with several photos.',
      'Add optional text, such as a name or date.',
      'The image only shows clearly when light shines through, so lamps include a light source.',
    ],
    to: 'project',
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
    to: 'project',
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
    to: 'services',
    next: 'See products & pricing',
  },
  'STL Versus 3MF': {
    title: 'Which file you need',
    steps: [
      'STL: the most common 3D file. Shape only, no colors or print settings.',
      '3MF: a newer file that can carry colors, multiple parts, and print settings.',
      'Printing multicolor at home? Ask for 3MF.',
      'Sending to a print service or another program? STL works almost everywhere.',
    ],
    to: 'project',
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
    to: 'project',
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
    to: 'project',
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
    to: 'project',
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
    to: 'services',
    next: 'See products & pricing',
  },
  'Laser Engraving or Laser Cutting?': {
    title: 'Engraving or cutting',
    steps: [
      'Engraving marks the surface: names, logos, and photos on wood, acrylic, slate, and coated metals.',
      'Cutting goes all the way through to make shapes, letters, layered signs, and ornaments.',
      'Many pieces combine both: cut a shape, then engrave details on it.',
    ],
    to: 'services',
    next: 'See laser products & pricing',
  },
  'Preparing Artwork for Laser Work': {
    title: 'Getting artwork ready',
    steps: [
      'Best: vector files (SVG, PDF, AI, or EPS) with clean lines.',
      'Photos and images: send the highest resolution you have.',
      'Keep very thin lines and tiny text to a minimum; they may not hold up.',
      'Tell us the finished size so the detail can be checked.',
    ],
    to: 'project',
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

  // ---------- Added Nov 23, 2026: every topic has at least three cards ----------
  // Madam Allure: at-home self-care built on herbs, natural oils, infused essential oils, and raw butters.
  'Raw Butters for Dry Skin': {
    title: 'A raw-butter softening ritual',
    steps: [
      'After a warm shower, pat skin so it is still slightly damp.',
      'Scoop a small amount of butter and warm it between your palms until it melts.',
      'Press and smooth it into dry spots: elbows, knees, heels, and hands.',
      'For extra-dry hands or feet, apply at night and slip on cotton gloves or socks.',
      'A little goes a long way; add more only where skin still feels tight.',
    ],
    next: "See Whipped Shea Butter & price",
    show: ["Whipped Shea Butter"],
  },
  'An Herbal Bath Soak': {
    title: 'Steep a bath like a cup of tea',
    steps: [
      'Run a comfortably warm bath.',
      'Place the herbal bath blend in a muslin bag or tea strainer so petals and leaves stay contained.',
      'Let it steep in the water for a few minutes, gently squeezing the bag.',
      'Soak 15 to 20 minutes and breathe slowly.',
      'Rinse, pat dry, and seal in moisture with a natural body oil.',
      'Stop using it if any irritation occurs.',
    ],
    next: "See Bath Tea & price",
    show: ["Bath Tea"],
  },
  'An Oil-Infused Moisture Bath': {
    title: 'A bath for very dry skin',
    steps: [
      'Fill the tub with comfortably warm water, not hot.',
      'Add about a tablespoon of natural body oil and swirl it in.',
      'Soak 10 to 15 minutes so the oil can soften skin.',
      'Step out carefully: oil makes the tub slippery.',
      'Pat dry gently instead of rubbing, so a light layer of oil stays on the skin.',
    ],
    next: "See the bath products & prices",
    show: ["Bath Salt", "Bath Truffles", "Foaming Bath Butter"],
  },
  'A Warm Herbal Oil Scalp Treatment': {
    title: 'A pre-wash herbal oil treatment',
    steps: [
      'Warm a little herb-infused hair oil by setting the bottle in a cup of warm water. Test it on your wrist first.',
      'Part hair into sections and apply the oil along the scalp.',
      'Massage with your fingertips for 3 to 5 minutes to relax the scalp.',
      'Smooth what is left over the ends, then cover with a shower cap for 20 to 30 minutes.',
      'Shampoo and condition as usual.',
    ],
    next: "See Hair Growth Oil & price",
    show: ["Hair Growth Oil"],
  },
  'Essential Oils Need a Carrier': {
    title: 'Using essential oils safely',
    steps: [
      'Essential oils are concentrated, so they are always blended into a carrier such as a natural oil or butter before touching skin.',
      'Patch-test a new blend on the inner arm and wait 24 hours.',
      'Keep them away from the eyes, and wash your hands after applying.',
      'Some citrus essential oils can make skin more sensitive to the sun; apply them where clothing will cover.',
      'Store blends in dark bottles, away from heat and light.',
    ],
    next: "See the fragrance oils",
    show: ["Women Fragrance Oil", "Men Fragrance Oil", "Unisex Fragrance Oil"],
  },
  'How Herbs Are Infused Into Oil': {
    title: 'From herb to oil',
    steps: [
      'Dried herbs chosen for hair and skin are covered with a natural oil.',
      'They steep slowly with gentle warmth, sometimes for weeks.',
      'The oil is strained, leaving the herbs behind and keeping what they release.',
      'The infused oil becomes the base for hair oils, body oils, butters, and balms.',
      'Keep infused products cool and out of direct sun so they stay fresh.',
    ],
    next: "See the herbal oils & balm",
    show: ["Hair Growth Oil", "Beard Oil", "Beard Balm"],
  },
  'A Five-Minute Beard Routine': {
    title: 'A quick daily beard routine',
    steps: [
      'Rinse or wash the beard and pat it almost dry.',
      'Warm 3 to 5 drops of beard oil in your palms.',
      'Work it into the skin first, then through the beard.',
      'Comb or brush from the roots down.',
      'For longer beards, finish with a little butter-based beard balm to soften and shape.',
    ],
    next: "See Beard Oil & Beard Balm",
    show: ["Beard Oil", "Beard Balm"],
  },
  'Soothe the Skin Under Your Beard': {
    title: 'Care for the skin, not just the hair',
    steps: [
      'Cleanse gently a few times a week, lathering the soap in your hands first.',
      'Rinse thoroughly so nothing is left on the skin.',
      'Pat dry, then massage an herb-infused beard oil into the skin underneath.',
      'Brush daily to lift flakes and spread the oil.',
      'See a professional if itching or irritation continues.',
    ],
    next: "See Beard Oil & Beard Balm",
    show: ["Beard Oil", "Beard Balm"],
  },

  // Allure Fusions
  'What to Send With Your Request': {
    title: 'A request checklist',
    steps: [
      'What the piece is and who it is for.',
      'Size or measurements, if it needs to fit something.',
      'Colors, names, dates, or text to include, spelled exactly.',
      'Photos, logos, or artwork as original files.',
      'Your deadline, and whether it will be a gift, display piece, or used every day.',
    ],
    to: 'project',
    next: 'Start my project',
  },
  'How Timing Works for Custom Pieces': {
    title: 'What affects your timeline',
    steps: [
      'Design time: original designs take longer than catalog items.',
      'Approval: the piece is made after you approve the preview.',
      'Print or engraving time: larger, multicolor, and detailed pieces take longer.',
      'Finishing and inspection before packing.',
      'Shipping time is added after the balance is paid. Your quote confirms the timeline.',
    ],
    to: 'services',
    next: 'See products & pricing',
  },
  'Caring for Engraved Slate and Wood': {
    title: 'Keep engraved pieces looking new',
    steps: [
      'Slate coasters: wipe with a damp cloth and dry; avoid soaking or the dishwasher.',
      'Wood signs and ornaments: dust with a soft dry cloth; keep away from water and heat.',
      'Keep wood out of strong direct sun to protect the color.',
      'Display away from humid spots, like over a kettle.',
    ],
    to: 'services',
    next: 'See products & pricing',
  },
  'Choosing Colors That Print Well': {
    title: 'Picking colors for a printed piece',
    steps: [
      'High contrast reads best: light on dark or dark on light.',
      'Raised names and lettering stand out when they differ in color from the base.',
      'Very thin details in a light color can be hard to see.',
      'School and brand colors are matched as closely as the available filaments allow.',
      'Ask for a preview so you can approve colors before printing.',
    ],
    to: 'services',
    next: 'See products & pricing',
  },
  'Indoor or Outdoor?': {
    title: 'Choosing for where it will live',
    steps: [
      'Indoors, away from heat: PLA gives the crispest detail and widest color choice.',
      'Near sunny windows, in cars, or outside: ask about PETG, which handles moisture and moderate heat better.',
      'Items handled every day: a tougher material helps prevent snapping.',
      'Tell us where the piece will live, and the material will be recommended for it.',
    ],
    to: 'services',
    next: 'See products & pricing',
  },
  'Choosing a Lithophane Shape': {
    title: 'Which lithophane style fits',
    steps: [
      'Flat panel: simple and classic, great on a shelf with a light behind it.',
      'Curved panel: a soft wraparound look that shows well from several angles.',
      'Cylinder lamp: the photo wraps all the way around a lamp.',
      'Multi-photo lithophane lamp: several photos around one lamp for families and memorials.',
    ],
    to: 'services',
    next: 'See lithophane lamps & pricing',
  },
  'Files for Laser Cutting': {
    title: 'Files that work for laser work',
    steps: [
      'SVG, PDF, AI, or EPS vector files give the cleanest cuts and lines.',
      'Convert text to outlines, or send the font name.',
      'Photos for engraving: send the original, highest-resolution file.',
      'Not sure what you have? Send it anyway and it will be checked.',
    ],
    to: 'project',
    next: 'Start my project',
  },
  'Why Size Changes the Price': {
    title: 'How size affects a 3D-printed piece',
    steps: [
      'Bigger pieces use more material.',
      'Print time grows quickly with height and width.',
      'Very large pieces may be printed in parts and assembled.',
      'A slightly smaller size can lower the cost without losing the look.',
    ],
    to: 'services',
    next: 'See products & pricing',
  },
  'What Are Layer Lines?': {
    title: 'Understanding the 3D-printed look',
    steps: [
      '3D printers build a piece one thin layer at a time.',
      'Fine lines on the surface are normal and part of the handmade look.',
      'Finer layers look smoother but take longer to print.',
      'Some finishes and angles hide layer lines better; this is considered in the design.',
    ],
    to: 'services',
    next: 'See products & pricing',
  },
  'Engraving on Different Materials': {
    title: 'How engraving looks on each surface',
    steps: [
      'Wood: warm, darker engraving with the natural grain showing through.',
      'Slate: a light gray engraving with strong contrast on the dark stone.',
      'Each natural piece is a little different, so results vary slightly.',
      'Ask about other materials; each is tested before your piece is made.',
    ],
    to: 'services',
    next: 'See laser products & pricing',
  },

  // AI AuthoriTech
  'Map a Workflow in Ten Minutes': {
    title: 'A quick workflow map',
    steps: [
      'Pick one process with a clear start and finish, such as a new customer inquiry.',
      'List every step in order on sticky notes or in a document.',
      'Mark who does each step and the tool they use.',
      'Circle the steps that are repeated, retyped, or waited on.',
      'Those circles are your first automation candidates.',
    ],
    next: 'See automation services',
  },
  'Automate Reminders and Follow-Ups': {
    title: 'Simple follow-ups that run themselves',
    steps: [
      'Appointment reminders a day before.',
      'A thank-you and next-steps email after a purchase or meeting.',
      'A gentle nudge when a form or invoice is not completed.',
      'Start with one, measure replies, then add more.',
    ],
    next: 'See automation services',
  },
  'What an AI Agent Needs to Work Well': {
    title: 'Ingredients for a useful agent',
    steps: [
      'A clear job with a defined finish line.',
      'Accurate, current information to work from.',
      'Access only to the tools it truly needs.',
      'Limits on what it can do without approval.',
      'A person who reviews its work and owns the results.',
    ],
    next: 'See AI agent services',
  },
  'Keep a Human in the Loop': {
    title: 'Where people should stay involved',
    steps: [
      'Anything that sends money, signs, or commits your business.',
      'Messages to customers about sensitive topics.',
      'Decisions about people, like hiring or eligibility.',
      'Let the agent draft, and have a person approve and send.',
    ],
    next: 'See AI agent services',
  },
  'Write a One-Page AI Use Policy': {
    title: 'What to put on one page',
    steps: [
      'Which AI tools are approved for work.',
      'What information must never be entered.',
      'When AI output must be reviewed by a person.',
      'How to label or disclose AI-assisted work.',
      'Who to ask with questions.',
    ],
    next: 'See responsible AI services',
  },
  'Check AI Output Before You Use It': {
    title: 'A quick review checklist',
    steps: [
      'Facts and numbers: verify against a trusted source.',
      'Names, dates, and quotes: confirm they are real.',
      'Tone: does it sound like your business?',
      'Fairness: does it treat all customers and people equally?',
      'Privacy: does it include anything that should not be shared?',
    ],
    next: 'See responsible AI services',
  },
};

// New cards, added to each lounge so every topic has at least three
// (build/patch.mjs appends window.ccsExtraCards to the lounge's own cards).
export const EXTRA_CARDS = {
  powder: [
    { category: 'Skin & Body', title: 'Raw Butters for Dry Skin', body: 'Natural raw butters are rich and protective, perfect for skin that feels tight or rough. Warmed in your hands, they melt in and leave skin soft.', related: 'Body butters made with natural raw butters', cta: 'Show me the ritual' },
    { category: 'Bath Rituals', title: 'An Herbal Bath Soak', body: 'Herbs chosen for the skin can turn a plain bath into a calming, fragrant soak. Steep them like tea so the water does the work.', related: 'Herbal bath blends', cta: 'Show me the ritual' },
    { category: 'Bath Rituals', title: 'An Oil-Infused Moisture Bath', body: 'A spoonful of natural oil in warm bath water helps soften very dry skin while you relax.', related: 'Natural body oils', cta: 'Show me the ritual' },
    { category: 'Hair & Scalp', title: 'A Warm Herbal Oil Scalp Treatment', body: 'Herb-infused oils massaged into the scalp before wash day help hair feel soft and the scalp feel cared for.', related: 'Herb-infused hair oil', cta: 'Show me how' },
    { category: 'Fragrance', title: 'Essential Oils Need a Carrier', body: 'Essential oils bring natural scent and character to a blend, but they are concentrated. They are always paired with a carrier oil or butter.', related: 'Products with infused essential oils', cta: 'Show me how' },
    { category: 'Ingredient Spotlights', title: 'How Herbs Are Infused Into Oil', body: 'Many Madam Allure products start as herbs slowly steeped in natural oils, capturing what the herbs offer for hair and skin.', related: 'Herbal oils, butters, and balms', cta: 'Learn how' },
    { category: 'Beard & Grooming', title: 'A Five-Minute Beard Routine', body: 'A healthy-looking beard comes from a short, steady routine: clean, oil, comb, and shape. It takes about five minutes.', related: 'Beard oil and beard balm', cta: 'Show me the routine' },
    { category: 'Beard & Grooming', title: 'Soothe the Skin Under Your Beard', body: 'Itch and flakes often start with the skin underneath, not the hair. Gentle cleansing and an herb-infused oil help keep that skin comfortable.', related: 'Herb-infused beard oil', cta: 'Show me how' },
  ],
  maker: [
    { category: 'Design Process', title: 'What to Send With Your Request', body: 'A complete request gets an accurate quote faster. A few details up front save back-and-forth later.', cta: 'See the checklist' },
    { category: 'Design Process', title: 'How Timing Works for Custom Pieces', body: 'Every custom piece moves through design, approval, making, and finishing. Knowing the steps helps you plan around a gift date or event.', cta: 'See what affects timing' },
    { category: 'Product Care', title: 'Caring for Engraved Slate and Wood', body: 'Engraved slate coasters and wood pieces are made to last with a little simple care.', cta: 'See care tips' },
    { category: 'Materials', title: 'Choosing Colors That Print Well', body: 'Color choices change how readable and striking a printed piece is. Contrast matters as much as the colors themselves.', cta: 'See color tips' },
    { category: 'Materials', title: 'Indoor or Outdoor?', body: 'Where a piece will live is the biggest clue to the right material.', cta: 'Help me choose' },
    { category: 'Lithophanes', title: 'Choosing a Lithophane Shape', body: 'The same photo can become a flat panel, a curved panel, or a glowing lamp. Each shape suits a different space.', cta: 'Compare shapes' },
    { category: 'Digital Files', title: 'Files for Laser Cutting', body: 'Clean files make clean cuts. Knowing what to send makes laser projects faster and more accurate.', cta: 'See file tips' },
    { category: '3D Printing', title: 'Why Size Changes the Price', body: 'Two pieces with the same design can be priced differently because of size alone.', cta: 'Learn why' },
    { category: '3D Printing', title: 'What Are Layer Lines?', body: 'Fine horizontal lines are a natural part of 3D printing. Here is what they are and how they are kept to a minimum.', cta: 'Learn more' },
    { category: 'Laser Design', title: 'Engraving on Different Materials', body: 'The same design looks different on wood and on slate. Each surface has its own character.', cta: 'Compare materials' },
  ],
  clarity: [
    { category: 'Automation', title: 'Map a Workflow in Ten Minutes', body: 'You do not need software to find automation opportunities. A quick map of one process shows where time is lost.', cta: 'Show me how' },
    { category: 'Automation', title: 'Automate Reminders and Follow-Ups', body: 'Reminders and follow-ups are some of the easiest, highest-value tasks to automate.', cta: 'See examples' },
    { category: 'AI Agents', title: 'What an AI Agent Needs to Work Well', body: 'An agent is only as good as its instructions, information, and limits.', cta: 'See the essentials' },
    { category: 'AI Agents', title: 'Keep a Human in the Loop', body: 'The safest agents draft and recommend while people approve what matters.', cta: 'See where' },
    { category: 'Responsible AI', title: 'Write a One-Page AI Use Policy', body: 'A short, clear policy helps your whole team use AI the same safe way.', cta: 'See what to include' },
    { category: 'Responsible AI', title: 'Check AI Output Before You Use It', body: 'A one-minute review catches most AI mistakes before they reach a customer.', cta: 'See the checklist' },
  ],
};
