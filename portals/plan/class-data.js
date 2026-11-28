/* One source for the whole curriculum. The Instructor Guide, Class Studio, Events Plan and Engagement Posts all read this file.
   To rename the community, change COMMUNITY. Free (Lobby) classes are preparation only; all building happens in the Suite.
   Each class: id, tier, n, title, design (cover), outcome, lessons [title, minutes, what to show], exercise, challenge, quiz [q, answers, correct], notes, docs, proof. */
window.CURRICULUM = {
 "COMMUNITY": "PortalLux Lounge",
 "tiers": {
  "lobby": "Lobby (free)",
  "suite": "Suite (Builder)",
  "penthouse": "Penthouse (premium)"
 },
 "passMark": 0.75,
 "freePerks": [
  [
   "Community feed",
   "Post, ask for help and share wins with other builders."
  ],
  [
   "Starter tools and worksheets",
   "A guided tool, a worksheet and a checklist for every free class, so members can work the way they prefer."
  ],
  [
   "Class Studio",
   "Exercises, checklists and completion codes for every free class."
  ],
  [
   "Monthly Open Lounge Q&A",
   "One Lounge Live a month opened to everyone."
  ],
  [
   "PortalLux Week",
   "The quarterly 5-day challenge, free to join."
  ],
  [
   "Wins Friday spotlight",
   "Any member can be featured."
  ],
  [
   "Weekly Build Season sneak peek",
   "A short clip from each week’s Suite build, so free members see what’s next."
  ],
  [
   "A finished Portal Plan",
   "Everything ready to build on day one of the Suite."
  ]
 ],
 "upgradeHook": "Free members finish fully prepared: a blueprint, their essentials, a connections map, a brand kit and a Portal Plan. The Suite is where that plan becomes their portal, built week by week.",
 "classes": [
  {
   "id": "start",
   "tier": "lobby",
   "n": "L1",
   "title": "Welcome to the Lounge",
   "design": "Tower",
   "outcome": "Members know how the community works, pick their track and post an introduction.",
   "lessons": [
    [
     "Welcome to the building",
     5,
     "Walk through the Lobby, Suite and Penthouse tiers using your Tower cover. Show where classes, live builds and wins live."
    ],
    [
     "What you will build",
     6,
     "Screen-share your real portals: Today page, Orders, Filament library, Reports. Blur customer names."
    ],
    [
     "Pick your track",
     4,
     "Print and Laser (Allure Fusions), Handmade and Beauty (Madam Allure), Any Small Shop. Show one page from each."
    ],
    [
     "How to get help and post wins",
     3,
     "The Ask for Help and Wins categories, and the weekly live build time."
    ]
   ],
   "exercise": "Fill in your Business Snapshot in the Class Studio: business name, what you sell, your track, your three biggest time drains.",
   "challenge": [
    "Complete your Skool profile with a photo or logo",
    "Pick your track",
    "Post your introduction using the template",
    "Save your Business Snapshot"
   ],
   "quiz": [
    [
     "What is the main thing this community helps you build?",
     [
      "A social media following",
      "A branded portal that runs your business",
      "An online store",
      "A logo"
     ],
     1
    ],
    [
     "Which track fits a 3D printing and laser engraving shop?",
     [
      "Handmade and Beauty",
      "Any Small Shop",
      "Print and Laser",
      "Service business"
     ],
     2
    ],
    [
     "Where do you post a screenshot of something you built?",
     [
      "Wins or Show Your Build",
      "Direct message to the host",
      "Nowhere",
      "The About page"
     ],
     0
    ],
    [
     "What do you need to pay for to take the core classes?",
     [
      "Paid AI subscriptions",
      "Website hosting",
      "Nothing beyond your membership: the tools are free",
      "Design software"
     ],
     2
    ]
   ],
   "notes": "Keep this under 20 minutes total. Energy over detail. End every video by pointing to Map Your Business. Record once and reuse; update only when tiers change.",
   "docs": [
    "Welcome checklist (1 page)",
    "Introduction post template",
    "Track guide: which track is mine?"
   ],
   "proof": "Morning Dashboard and the four portals; the website lobby and elevator for the \"building\" idea."
  },
  {
   "id": "map",
   "tier": "lobby",
   "n": "L2",
   "title": "The Blueprint",
   "design": "Hub",
   "outcome": "Members list every job they do and see which ones a portal and automation can take over.",
   "lessons": [
    [
     "The hats you wear",
     6,
     "Every job in a small business: making, selling, shipping, messages, money, marketing."
    ],
    [
     "Your job inventory",
     8,
     "Fill in the job inventory live. Show your own: Madam Allure, Allure Fusions and AI AuthoriTech."
    ],
    [
     "Automate, Assist or Keep",
     7,
     "Sort each job. Show your automations board (Running, Ready to Build, Planned)."
    ]
   ],
   "exercise": "Build your Job Inventory in the Class Studio: list at least 12 jobs, mark how often you do each, and sort them into Automate, Assist or Keep.",
   "challenge": [
    "List at least 12 jobs",
    "Mark how often each happens (daily, weekly, monthly)",
    "Sort every job into Automate, Assist or Keep",
    "Post your top 3 Automate jobs"
   ],
   "quiz": [
    [
     "A job you do the same way every day, like checking low stock, is usually:",
     [
      "Keep",
      "Automate",
      "Assist",
      "Delete"
     ],
     1
    ],
    [
     "Writing a personal reply to an upset customer is best marked:",
     [
      "Automate",
      "Assist: AI drafts, you edit and send",
      "Ignore",
      "Keep, and never use AI"
     ],
     1
    ],
    [
     "Why list jobs before building anything?",
     [
      "So the portal shows what you actually need",
      "Skool requires it",
      "To fill time",
      "It is not needed"
     ],
     0
    ],
    [
     "Which of these is a \"money\" job?",
     [
      "Posting on Instagram",
      "Packing an order",
      "Logging an expense receipt",
      "Weighing a filament spool"
     ],
     2
    ]
   ],
   "notes": "Members map their business the way you would map a building before it is built. The Blueprint plugin (or the worksheet) shows them where a portal can take over. No building yet.",
   "docs": [
    "Job inventory worksheet",
    "Automate, Assist or Keep guide with examples for each track"
   ],
   "proof": "The automations pages in each portal and the Today checklist."
  },
  {
   "id": "gather",
   "tier": "lobby",
   "n": "L3",
   "title": "The Essentials",
   "design": "Hub",
   "outcome": "Members gather everything their portal will need: products, prices, policies, suppliers and where orders come from, in one place.",
   "lessons": [
    [
     "What your portal needs to know",
     6,
     "Show the information behind your own portals: catalog, price list, policies, suppliers."
    ],
    [
     "Products, prices and policies",
     8,
     "Collect every product or service with sizes and prices, plus deposit, shipping and return rules."
    ],
    [
     "Customers, suppliers and order sources",
     6,
     "Where orders come in today, who you buy from, and where your customer list lives. Never share real customer details in AI chats."
    ]
   ],
   "exercise": "Fill in the Essentials checklist in the Class Studio and keep everything in one folder called My Portal Essentials.",
   "challenge": [
    "Create a My Portal Essentials folder",
    "List every product or service with prices",
    "Write down your order, deposit and shipping rules",
    "List your suppliers and where orders come in"
   ],
   "quiz": [
    [
     "Why gather your essentials before building?",
     [
      "So the portal is built around real information",
      "Skool requires it",
      "To slow things down",
      "It is not needed"
     ],
     0
    ],
    [
     "Where should your essentials live?",
     [
      "One synced folder",
      "Scattered across your phone",
      "In a group chat",
      "Nowhere"
     ],
     0
    ],
    [
     "Customer names and addresses in an AI chat are:",
     [
      "Never shared; use example data",
      "Fine to paste",
      "Required",
      "Optional"
     ],
     0
    ]
   ],
   "notes": "Calm and practical. Members who finish this are ready for the build, which is the point. Show your own folders as the example.",
   "docs": [
    "Essentials checklist",
    "Product and price list template",
    "Policies starter (orders, deposits, shipping, returns)"
   ],
   "proof": "Your price lists, catalog data and order rules behind Madam Allure and Allure Fusions."
  },
  {
   "id": "m1",
   "tier": "lobby",
   "n": "L4",
   "title": "Connections Check",
   "design": "Hub",
   "outcome": "Members list the tools they already use, decide what needs to connect to their portal, and set up a free AI assistant safely.",
   "lessons": [
    [
     "Your tools today",
     6,
     "Sales, payments, invoices, email, social, storage. Show the tools behind your businesses: Wave, Clover, GoHighLevel, OneDrive."
    ],
    [
     "What needs to sync",
     8,
     "Which information should flow into the portal, and how often. Exports now, automatic syncing later in the Suite."
    ],
    [
     "Your AI assistant, set up safely",
     8,
     "Pick a free AI tool and learn the ground rules: no passwords or keys, example data only, you approve everything."
    ]
   ],
   "exercise": "Fill in your Connections map in the Class Studio: each tool, what it holds, and whether it should sync with your portal.",
   "challenge": [
    "List every tool you use",
    "Mark what each one should send to your portal",
    "Set up one free AI assistant",
    "Save the ground rules card"
   ],
   "quiz": [
    [
     "A connections map shows:",
     [
      "Each tool and what it should send to your portal",
      "Your passwords",
      "Your social posts",
      "Nothing"
     ],
     0
    ],
    [
     "Is it safe to paste an API key into an AI chat?",
     [
      "No, never",
      "Yes",
      "Only on weekends",
      "Only in one tool"
     ],
     0
    ],
    [
     "Before anything goes public you:",
     [
      "Preview and approve it yourself",
      "Publish and fix later",
      "Skip the check",
      "Ask a stranger"
     ],
     0
    ]
   ],
   "notes": "Beginner friendly: no technical setup. The point is knowing what connects, not connecting it. Connecting happens in the Suite.",
   "docs": [
    "Connections map worksheet",
    "AI assistant setup guide",
    "Ground rules card"
   ],
   "proof": "Your own connections: Wave, Clover and GoHighLevel imports, OneDrive data saving, the Dazz’l sync plan."
  },
  {
   "id": "look",
   "tier": "lobby",
   "n": "L5",
   "title": "Signature Style",
   "design": "Compact",
   "outcome": "Members gather their brand kit: colors, fonts, logo files and a brand card they will paste into every build later.",
   "lessons": [
    [
     "Your colors and fonts",
     6,
     "Pick three colors and two fonts. Show how each of your businesses has its own accent."
    ],
    [
     "Your logo files",
     6,
     "What files you need (a transparent logo, a square icon) and where to keep them."
    ],
    [
     "Your brand card",
     8,
     "Use the brand card builder in the Class Studio. It is ready for the first build in the Suite."
    ]
   ],
   "exercise": "Fill in the brand card builder in the Class Studio and save the card in your Essentials folder.",
   "challenge": [
    "Choose your three colors and two fonts",
    "Collect your logo files (transparent PNG if you have one)",
    "Complete and save your brand card",
    "Post your brand card in the community"
   ],
   "quiz": [
    [
     "Where will your brand card go?",
     [
      "At the top of every build prompt",
      "In your email signature only",
      "Nowhere",
      "In a PDF"
     ],
     0
    ],
    [
     "How many fonts does a clean brand need?",
     [
      "One or two",
      "Seven",
      "As many as possible",
      "None"
     ],
     0
    ],
    [
     "The best logo file for a portal is:",
     [
      "A transparent PNG",
      "A blurry screenshot",
      "A photo of a sign",
      "None"
     ],
     0
    ]
   ],
   "notes": "Gathering only: nothing gets styled in the free tier. Members leave with a brand card ready for the Suite.",
   "docs": [
    "Brand card template",
    "Logo file checklist"
   ],
   "proof": "Your four portals in rose gold, sapphire and teal, in light and dark mode."
  },
  {
   "id": "today",
   "tier": "lobby",
   "n": "L6",
   "title": "The Portal Plan",
   "design": "Tower",
   "outcome": "Members turn their blueprint, essentials, connections and brand kit into one portal plan: the pages they need and what their Today page should show.",
   "lessons": [
    [
     "The pages your portal needs",
     6,
     "Pick main pages from your blueprint. Show the left menu and sub-pages of your own portals."
    ],
    [
     "What Today should show you",
     6,
     "Due, late, low, unanswered: choose your top five."
    ],
    [
     "Your finished plan and what comes next",
     6,
     "Everything is ready to build. Show what the Suite builds with this plan, one week at a time, starting with the first portal."
    ]
   ],
   "exercise": "Complete your Portal Plan in the Class Studio: pages, Today cards and your top three things to automate.",
   "challenge": [
    "Choose your main pages",
    "Pick five Today cards",
    "Name the three things you most want automated",
    "Post your Portal Plan"
   ],
   "quiz": [
    [
     "Your Portal Plan lists:",
     [
      "The pages and Today cards your portal needs",
      "Your passwords",
      "Every order ever",
      "Nothing"
     ],
     0
    ],
    [
     "What happens in the Suite?",
     [
      "Your plan is built into a real portal, week by week",
      "Nothing",
      "You start over",
      "You buy software"
     ],
     0
    ],
    [
     "A Today page shows:",
     [
      "What needs your attention now",
      "Ads",
      "Only charts",
      "Old orders"
     ],
     0
    ]
   ],
   "notes": "This is the upgrade class. Celebrate the finished plan: members are fully prepared. Invite them to the Suite, where the plan becomes their portal starting in week 1. Mention founding pricing.",
   "docs": [
    "Portal Plan template",
    "What the Suite builds (one page)"
   ],
   "proof": "Your four portals and Morning Dashboard as the finished version of a plan."
  },
  {
   "id": "first",
   "tier": "suite",
   "n": "1",
   "title": "The First Portal",
   "design": "Laptop",
   "outcome": "Members make a working one-page HTML portal with free AI and open it in their browser.",
   "lessons": [
    [
     "What a portal is",
     4,
     "A private web page on your computer that shows your business at a glance. No hosting, no code skills."
    ],
    [
     "Build it with one prompt",
     12,
     "Paste the starter prompt into ChatGPT, Claude or Gemini. Save the reply as portal.html and open it."
    ],
    [
     "Make it yours with your brand card",
     8,
     "Paste the brand card from Signature Style so it is in their colors from the start."
    ],
    [
     "Save it safely",
     5,
     "Put it in a OneDrive or Google Drive folder and pin a shortcut. Never paste customer names into a shared chat."
    ]
   ],
   "exercise": "Use the starter prompt in the Class Studio, fill in your business details, and paste the result into a file called portal.html.",
   "challenge": [
    "Generate your portal with the starter prompt",
    "Save it as portal.html and open it in your browser",
    "Change the colors to your brand",
    "Post a screenshot in Show Your Build"
   ],
   "quiz": [
    [
     "What file type is your first portal?",
     [
      "A PDF",
      "An HTML file that opens in a browser",
      "A Word document",
      "An app from the app store"
     ],
     1
    ],
    [
     "Where should you save your portal file?",
     [
      "A synced folder like OneDrive or Google Drive",
      "Your Downloads folder",
      "An email to yourself",
      "A sticky note"
     ],
     0
    ],
    [
     "What should you never paste into an AI chat?",
     [
      "Your brand colors",
      "Your business name",
      "Customer names, addresses or payment details",
      "Your product list"
     ],
     2
    ],
    [
     "Which tools can build the portal for free?",
     [
      "Only paid tools",
      "ChatGPT, Claude, Gemini or Copilot free plans",
      "Only Photoshop",
      "None"
     ],
     1
    ]
   ],
   "notes": "Week 1 of the Build Season. Members arrive with a Portal Plan and brand card, so they build fast. In the Build-Along video, make one mistake on purpose to show that fixing it with a follow-up prompt is normal.",
   "docs": [
    "Starter portal prompt card",
    "How to save and open an HTML file (Windows and Mac)",
    "Privacy rules for AI chats"
   ],
   "proof": "Your first portal versions in the versions folder show how it grew from one page."
  },
  {
   "id": "m4",
   "tier": "suite",
   "n": "2",
   "title": "The Grand Lobby",
   "design": "Compact",
   "outcome": "Members build a real portal shell in their brand and save a brand card they reuse in every build.",
   "lessons": [
    [
     "Your brand card",
     8,
     "Colors, fonts, logo, light and dark mode, glow trim. Show your own: rose gold, sapphire, teal."
    ],
    [
     "The portal shell",
     12,
     "Left menu of main pages, sub-pages across the top, even cards. Use the Prompt Book \"Portal shell\" prompt."
    ],
    [
     "One look, many businesses",
     8,
     "Show how each of your portals uses its own accent color with one shared design."
    ],
    [
     "Automate It: brand card in every prompt",
     6,
     "Paste the brand card at the top of every build so every page matches."
    ]
   ],
   "exercise": "Fill in the Brand Card builder in the Class Studio, copy the card, then generate your portal shell with it.",
   "challenge": [
    "Complete your brand card",
    "Generate the portal shell with your brand card",
    "Add light and dark mode",
    "Post before-and-after screenshots"
   ],
   "quiz": [
    [
     "Where does the brand card go in a build prompt?",
     [
      "At the very end",
      "At the top of every build prompt",
      "Only in the first prompt",
      "Nowhere"
     ],
     1
    ],
    [
     "In your portal shell, main pages go:",
     [
      "In the left menu, with related pages across the top",
      "All on one long page",
      "In a PDF",
      "In separate apps"
     ],
     0
    ],
    [
     "Why give each business its own accent color?",
     [
      "So you always know which business you are in",
      "It is required",
      "To use more ink",
      "No reason"
     ],
     0
    ],
    [
     "A brand card should include:",
     [
      "Colors, fonts, logo and mode settings",
      "Only your logo",
      "Customer list",
      "Prices only"
     ],
     0
    ]
   ],
   "notes": "Your strongest class visually. Show the rose gold, sapphire and teal portals side by side. Keep the brand card on screen the whole time.",
   "docs": [
    "Brand card template",
    "Portal shell prompt card",
    "Light and dark mode checklist"
   ],
   "proof": "All four portals and the Morning Dashboard; Prompt Book \"Brand setup\" and \"Portal shell\"."
  },
  {
   "id": "m2",
   "tier": "suite",
   "n": "3",
   "title": "The Skills Vault",
   "design": "Compact",
   "outcome": "Members turn what they have already done in AI chats into reusable skill cards.",
   "lessons": [
    [
     "Find your best past chats",
     8,
     "Search your ChatGPT history for work you redo."
    ],
    [
     "Write a skill card",
     10,
     "Goal, inputs, steps, output, rules."
    ],
    [
     "Automate It: one library for every AI",
     7,
     "Keep cards in one Google Doc and paste them into any tool."
    ]
   ],
   "exercise": "Write three skill cards from your own past chats.",
   "challenge": [
    "Find 3 chats you repeat",
    "Turn each into a skill card",
    "Test one card in a different AI tool"
   ],
   "quiz": [
    [
     "A skill card should include:",
     [
      "Only a title",
      "Goal, inputs, steps, output and rules",
      "Your password",
      "A picture"
     ],
     1
    ],
    [
     "Why keep skills in one document?",
     [
      "They work in any AI tool",
      "It looks nice",
      "Skool requires it",
      "No reason"
     ],
     0
    ],
    [
     "A good first skill is one you:",
     [
      "Never do",
      "Repeat every week",
      "Do once a year",
      "Paid someone for"
     ],
     1
    ]
   ],
   "notes": "Show your own custom GPTs as the advanced version.",
   "docs": [
    "Skill card template",
    "10 starter skill cards by track"
   ],
   "proof": "Your custom GPT library."
  },
  {
   "id": "m3",
   "tier": "suite",
   "n": "4",
   "title": "The Daily Rhythm",
   "design": "Gear",
   "outcome": "Every daily, weekly and monthly task is on a calendar and marked Automate, Assist or Keep.",
   "lessons": [
    [
     "Daily, weekly, monthly",
     8,
     "Turn the job inventory into a rhythm."
    ],
    [
     "Put it on a calendar",
     8,
     "Time blocks for making, selling and admin."
    ],
    [
     "Automate It: your first scheduled task",
     10,
     "Show your 6:30 AM daily refresh and Monday snapshot."
    ]
   ],
   "exercise": "Build your weekly rhythm in the Class Studio.",
   "challenge": [
    "List daily, weekly and monthly tasks",
    "Block them on your calendar",
    "Pick the one task to schedule first"
   ],
   "quiz": [
    [
     "Your daily refresh runs:",
     [
      "When you remember",
      "On a schedule, before you start work",
      "Once a year",
      "Never"
     ],
     1
    ],
    [
     "Which tool schedules tasks on Windows for free?",
     [
      "Task Scheduler",
      "Paint",
      "Notepad",
      "Calculator"
     ],
     0
    ],
    [
     "A weekly snapshot is useful because:",
     [
      "It saves a record of the week automatically",
      "It deletes data",
      "It sends ads",
      "It is required by law"
     ],
     0
    ]
   ],
   "notes": "Open Task Scheduler on screen and show the Crawford Portals tasks.",
   "docs": [
    "Business rhythm planner",
    "Task Scheduler step by step"
   ],
   "proof": "Crawford Portals Refresh and Weekly tasks."
  },
  {
   "id": "m5",
   "tier": "suite",
   "n": "5",
   "title": "The Front Desk",
   "design": "Laptop",
   "outcome": "A custom order form with lead times that lands new orders on the board.",
   "lessons": [
    [
     "What every order needs",
     8,
     "Fields, deposits and due dates."
    ],
    [
     "Build the form",
     12,
     "Show your New order page with deposit math."
    ],
    [
     "Automate It: confirmation message",
     8,
     "Auto-filled first name, branded email."
    ]
   ],
   "exercise": "List your order fields and build the form.",
   "challenge": [
    "Define your order fields",
    "Build the form",
    "Send yourself a test confirmation"
   ],
   "quiz": [
    [
     "A deposit field helps you:",
     [
      "Track what is paid and what is due",
      "Hide prices",
      "Delete orders",
      "Nothing"
     ],
     0
    ],
    [
     "Lead time means:",
     [
      "How long the order takes to make and ship",
      "Your logo size",
      "Font weight",
      "Store hours"
     ],
     0
    ],
    [
     "A confirmation message should use:",
     [
      "The customer first name",
      "All caps",
      "No greeting",
      "Your password"
     ],
     0
    ]
   ],
   "notes": "Show Madam Allure New order with deposit math.",
   "docs": [
    "Order fields worksheet",
    "Confirmation email template"
   ],
   "proof": "Orders > New order in Madam Allure and Allure Fusions."
  },
  {
   "id": "m6",
   "tier": "suite",
   "n": "6",
   "title": "The Order Runway",
   "design": "Gear",
   "outcome": "Every order moves from Inquiry to Shipped on one board.",
   "lessons": [
    [
     "Stages every order moves through",
     8,
     "Inquiry to Shipped."
    ],
    [
     "Build the pipeline",
     15,
     "Show your pipeline and shipping log."
    ],
    [
     "Automate It: 7 AM late-order check",
     10,
     "Flag at-risk orders every morning."
    ]
   ],
   "exercise": "Put your last 10 orders on the board.",
   "challenge": [
    "Define your stages",
    "Add 10 orders",
    "Turn on the late-order check"
   ],
   "quiz": [
    [
     "The pipeline shows:",
     [
      "Where every order is",
      "Only finished orders",
      "Social posts",
      "Nothing"
     ],
     0
    ],
    [
     "A late-order check runs:",
     [
      "Every morning automatically",
      "Once a year",
      "Never",
      "Only when asked"
     ],
     0
    ],
    [
     "The shipping log records:",
     [
      "Carrier and tracking",
      "Recipes",
      "Passwords",
      "Fonts"
     ],
     0
    ]
   ],
   "notes": "Use example orders, never real names.",
   "docs": [
    "Pipeline stage guide",
    "Status message templates"
   ],
   "proof": "Orders pipeline and Shipping log."
  },
  {
   "id": "m7",
   "tier": "suite",
   "n": "7",
   "title": "Plugged In",
   "design": "Hub",
   "outcome": "Shop exports and sheets feed one data file that refreshes daily.",
   "lessons": [
    [
     "Where your data lives",
     8,
     "Wave, Clover, GoHighLevel, Etsy, Shopify."
    ],
    [
     "Import with CSV",
     12,
     "Show the customer import."
    ],
    [
     "Automate It: daily refresh and synced folder",
     12,
     "Save data to OneDrive and refresh on a schedule."
    ]
   ],
   "exercise": "Export one list from your shop and import it.",
   "challenge": [
    "Export a CSV",
    "Import it into your portal",
    "Connect your synced folder"
   ],
   "quiz": [
    [
     "CSV files are:",
     [
      "Spreadsheet data you can import",
      "Images",
      "Videos",
      "Fonts"
     ],
     0
    ],
    [
     "Saving data to a synced folder means:",
     [
      "It follows you to every computer",
      "It is deleted",
      "It is public",
      "Nothing"
     ],
     0
    ],
    [
     "An \"as of\" time tells you:",
     [
      "How fresh the data is",
      "Your age",
      "Store hours",
      "Shipping cost"
     ],
     0
    ]
   ],
   "notes": "Show the \"Save data to OneDrive\" button.",
   "docs": [
    "Export guides for Wave, Clover, GoHighLevel",
    "Synced folder setup"
   ],
   "proof": "Customers import; OneDrive data saving."
  },
  {
   "id": "m8",
   "tier": "suite",
   "n": "8",
   "title": "The Stockroom",
   "design": "Tower",
   "outcome": "A stock list for filament, ingredients or supplies with low-stock alerts.",
   "lessons": [
    [
     "What to track",
     8,
     "Materials, packaging, equipment."
    ],
    [
     "Build the inventory",
     15,
     "Show the filament library with QR spool stickers and ingredients list."
    ],
    [
     "Automate It: reorder alert",
     8,
     "Low stock shows on Today."
    ]
   ],
   "exercise": "Add 10 items you use most.",
   "challenge": [
    "Add 10 items",
    "Set low-stock levels",
    "Print one QR label or tag"
   ],
   "quiz": [
    [
     "A low-stock level is:",
     [
      "The amount that triggers a reorder",
      "Your price",
      "A color",
      "A date"
     ],
     0
    ],
    [
     "QR spool stickers help you:",
     [
      "Open the spool record by scanning",
      "Print faster",
      "Hide stock",
      "Nothing"
     ],
     0
    ],
    [
     "Equipment care logs track:",
     [
      "Maintenance done and due",
      "Customer names",
      "Fonts",
      "Prices"
     ],
     0
    ]
   ],
   "notes": "Show Print and Laser and Handmade versions.",
   "docs": [
    "Inventory starter sheet",
    "QR label guide",
    "Equipment care log template"
   ],
   "proof": "Filament library, ingredients and packaging, equipment for 12 machines."
  },
  {
   "id": "m9",
   "tier": "suite",
   "n": "9",
   "title": "The Lounge View",
   "design": "Laptop",
   "outcome": "Members build their Today page and morning dashboard from their Portal Plan and install it as an app on phone and desktop.",
   "lessons": [
    [
     "Your Today page",
     10,
     "Build the Today cards chosen in the Portal Plan: due, late, low, unanswered."
    ],
    [
     "The full dashboard",
     12,
     "Show your Morning Dashboard across businesses."
    ],
    [
     "Automate It: install as an app",
     8,
     "Install from Chrome or Edge, Add to Home Screen."
    ]
   ],
   "exercise": "Choose your five Today cards.",
   "challenge": [
    "Pick 5 Today cards",
    "Build the page",
    "Install it as an app"
   ],
   "quiz": [
    [
     "The Today page shows:",
     [
      "What needs attention now",
      "Everything ever",
      "Only charts",
      "Ads"
     ],
     0
    ],
    [
     "To install a portal as an app you:",
     [
      "Use Install in Chrome or Edge",
      "Buy it",
      "Email it",
      "Print it"
     ],
     0
    ],
    [
     "A stale-data warning means:",
     [
      "The data has not refreshed",
      "You are offline forever",
      "It is broken",
      "Nothing"
     ],
     0
    ]
   ],
   "notes": "Open it on your phone on camera.",
   "docs": [
    "Today page planner",
    "Install as an app guide"
   ],
   "proof": "Morning Dashboard."
  },
  {
   "id": "m10",
   "tier": "suite",
   "n": "10",
   "title": "The Concierge Desk",
   "design": "Compact",
   "outcome": "A message library in their voice, branded email, and a follow-up survey.",
   "lessons": [
    [
     "Your voice in templates",
     10,
     "Rewrite templates with personality."
    ],
    [
     "Branded email and signature",
     10,
     "Logo, closing, name, business, tagline, phone."
    ],
    [
     "Automate It: survey 12 days after delivery",
     8,
     "6 questions, wish list, referrals."
    ]
   ],
   "exercise": "Write 5 templates and your signature.",
   "challenge": [
    "Write 5 templates in your voice",
    "Set your signature",
    "Build a 6-question survey"
   ],
   "quiz": [
    [
     "A good signature includes:",
     [
      "Closing, name, business, tagline, phone",
      "Every social link",
      "Your services list",
      "Nothing"
     ],
     0
    ],
    [
     "When should the survey go out?",
     [
      "10 to 14 days after delivery",
      "Before the order",
      "A year later",
      "Never"
     ],
     0
    ],
    [
     "First-name auto-fill makes messages:",
     [
      "Personal",
      "Longer",
      "Slower",
      "Public"
     ],
     0
    ]
   ],
   "notes": "Show the Messages page and copied branded email in Gmail.",
   "docs": [
    "Message template pack",
    "Signature guide",
    "Survey questions"
   ],
   "proof": "Email kit, surveys."
  },
  {
   "id": "m11",
   "tier": "suite",
   "n": "11",
   "title": "After Hours",
   "design": "Gear",
   "outcome": "The full daily and weekly schedule runs on its own after hours, tracked on an automations board.",
   "lessons": [
    [
     "Your automations board",
     8,
     "Running, Ready to Build, Planned."
    ],
    [
     "Chain the schedule",
     15,
     "Daily refresh, weekly snapshot, reports."
    ],
    [
     "Automate It: AI assistant on social",
     10,
     "Muse working your Instagram and Facebook goals."
    ]
   ],
   "exercise": "Move three items to Running.",
   "challenge": [
    "Build your automations board",
    "Schedule 3 tasks",
    "Run a weekly snapshot"
   ],
   "quiz": [
    [
     "\"Ready to Build\" means:",
     [
      "Planned and next in line",
      "Already running",
      "Cancelled",
      "Unknown"
     ],
     0
    ],
    [
     "A weekly snapshot:",
     [
      "Saves the week automatically",
      "Deletes data",
      "Posts online",
      "Costs money"
     ],
     0
    ],
    [
     "You check automations:",
     [
      "Weekly with a health check",
      "Never",
      "Yearly",
      "Only if broken"
     ],
     0
    ]
   ],
   "notes": "Headline class. Show everything running.",
   "docs": [
    "Automations board template",
    "Weekly health check"
   ],
   "proof": "Automations pages, scheduled tasks."
  },
  {
   "id": "m12",
   "tier": "suite",
   "n": "12",
   "title": "The Rate Card",
   "design": "Compact",
   "outcome": "Members build a rate card: costs, pricing that covers their time, and a weekly business summary with exports.",
   "lessons": [
    [
     "Know your costs",
     10,
     "Materials, time, packaging."
    ],
    [
     "Price with confidence",
     10,
     "Show the formula builder costs and time pricing at $125 an hour."
    ],
    [
     "Automate It: Monday one-pager",
     10,
     "Reports with Excel, PDF and Word exports."
    ]
   ],
   "exercise": "Price one product or service.",
   "challenge": [
    "Cost one product",
    "Set a price",
    "Export your first one-pager"
   ],
   "quiz": [
    [
     "Price should cover:",
     [
      "Materials, time and profit",
      "Only materials",
      "Only shipping",
      "Nothing"
     ],
     0
    ],
    [
     "Revenue minus expenses is:",
     [
      "Profit",
      "Inventory",
      "Tax",
      "Deposit"
     ],
     0
    ],
    [
     "The one-pager is built:",
     [
      "Every Monday automatically",
      "Never",
      "By hand daily",
      "Once"
     ],
     0
    ]
   ],
   "notes": "Use professional terms: revenue, expenses, finances.",
   "docs": [
    "Pricing worksheet",
    "One-pager template"
   ],
   "proof": "Reports, budgets, formula builder, service pricing."
  },
  {
   "id": "m13",
   "tier": "suite",
   "n": "13",
   "title": "The Back Office",
   "design": "Tower",
   "outcome": "Members set up their back office: SOPs, a settings or formula library, a helper handoff and a maintenance routine.",
   "lessons": [
    [
     "Write your SOPs",
     10,
     "Step-by-step for repeat work."
    ],
    [
     "Hand it off",
     10,
     "What a helper or VA needs."
    ],
    [
     "Automate It: health check and skills refresh",
     8,
     "Weekly and monthly upkeep."
    ]
   ],
   "exercise": "Write 3 SOPs.",
   "challenge": [
    "Write 3 SOPs",
    "Record a 3-minute portal walkthrough",
    "Schedule your monthly refresh"
   ],
   "quiz": [
    [
     "An SOP is:",
     [
      "A step-by-step guide for repeat work",
      "A logo",
      "A price",
      "A font"
     ],
     0
    ],
    [
     "A handoff should include:",
     [
      "Steps, logins handled safely, and who approves",
      "Your passwords in plain text",
      "Nothing",
      "Only photos"
     ],
     0
    ],
    [
     "Maintenance should be:",
     [
      "Scheduled",
      "Random",
      "Skipped",
      "Yearly only"
     ],
     0
    ]
   ],
   "notes": "Graduation class: celebrate finished builds.",
   "docs": [
    "SOP template",
    "Handoff checklist"
   ],
   "proof": "Owner Portal Guide, Prompt Book, member guide."
  },
  {
   "id": "b1",
   "tier": "penthouse",
   "n": "B1",
   "title": "The Floor Plan",
   "design": "Tower",
   "outcome": "Members plan an interactive website as a building: lobby, a suite for each business, lounges.",
   "lessons": [
    [
     "From pages to places",
     10,
     "Show the Crawford Creative Suites entrance, lobby and suites."
    ],
    [
     "Map your building",
     12,
     "Floors, desks, lounges for each brand."
    ]
   ],
   "exercise": "Sketch your building map.",
   "challenge": [
    "Name your floors",
    "Choose a lounge for education",
    "Write the lobby welcome line"
   ],
   "quiz": [
    [
     "Each business gets:",
     [
      "Its own suite",
      "Nothing",
      "A pop-up",
      "An ad"
     ],
     0
    ],
    [
     "Lounges are for:",
     [
      "Education and tips",
      "Checkout",
      "Passwords",
      "Nothing"
     ],
     0
    ],
    [
     "The lobby should:",
     [
      "Welcome and direct visitors",
      "Sell everything at once",
      "Be empty",
      "Hide links"
     ],
     0
    ]
   ],
   "notes": "Your website is the demo.",
   "docs": [
    "Building map worksheet"
   ],
   "proof": "Crawford Creative Suites website."
  },
  {
   "id": "b2",
   "tier": "penthouse",
   "n": "B2",
   "title": "Set the Scene",
   "design": "Tower",
   "outcome": "Consistent lobby, desk and lounge images made in ChatGPT in brand colors.",
   "lessons": [
    [
     "Style lock prompts",
     12,
     "Keep every scene matching."
    ],
    [
     "Desk and lounge scenes",
     12,
     "Names on desks, check-in tablets."
    ]
   ],
   "exercise": "Write your style lock.",
   "challenge": [
    "Write a style lock",
    "Make a lobby image",
    "Make one desk image"
   ],
   "quiz": [
    [
     "A style lock keeps images:",
     [
      "Consistent",
      "Random",
      "Small",
      "Black and white"
     ],
     0
    ],
    [
     "Start a new chat when:",
     [
      "The AI repeats the last design",
      "Never",
      "Always",
      "At night"
     ],
     0
    ],
    [
     "Scenes should avoid:",
     [
      "Real customer names",
      "Brand colors",
      "Light",
      "Furniture"
     ],
     0
    ]
   ],
   "notes": "Use the Course cover plan as a second example.",
   "docs": [
    "Style lock template"
   ],
   "proof": "Website images and your icon batches."
  },
  {
   "id": "b3",
   "tier": "penthouse",
   "n": "B3",
   "title": "The Elevator",
   "design": "Laptop",
   "outcome": "Elevator floors, check-in tablets and product buttons that open shop pages.",
   "lessons": [
    [
     "Elevator and floors",
     12,
     "Show the elevator choosing a floor."
    ],
    [
     "Check-in and product buttons",
     12,
     "Tablet opens options; buttons jump to products."
    ]
   ],
   "exercise": "List your clickable spots.",
   "challenge": [
    "Add an elevator or menu",
    "Add a check-in tablet",
    "Link 3 product buttons"
   ],
   "quiz": [
    [
     "Product buttons should:",
     [
      "Open the exact product page",
      "Open the home page",
      "Do nothing",
      "Download files"
     ],
     0
    ],
    [
     "On phones, tap targets should be:",
     [
      "Larger",
      "Tiny",
      "Hidden",
      "Text only"
     ],
     0
    ],
    [
     "Test interactions at:",
     [
      "Phone, tablet and laptop sizes",
      "One size",
      "No size",
      "Print size"
     ],
     0
    ]
   ],
   "notes": "Show phone and desktop.",
   "docs": [
    "Interaction checklist"
   ],
   "proof": "Elevator, kiosk, Powder Room links."
  },
  {
   "id": "b4",
   "tier": "penthouse",
   "n": "B4",
   "title": "The Concierge Voice",
   "design": "Hub",
   "outcome": "A concierge and receptionists with natural voices and lobby music.",
   "lessons": [
    [
     "Choosing voices",
     10,
     "Speed, warmth, license limits."
    ],
    [
     "Recording the lines",
     12,
     "Greeting, replies, elevator lines; music from Suno."
    ]
   ],
   "exercise": "Write your concierge script.",
   "challenge": [
    "Write 5 lines",
    "Pick a voice and speed",
    "Add sound that is off until the visitor turns it on"
   ],
   "quiz": [
    [
     "Before business use, check:",
     [
      "The voice tool license",
      "Nothing",
      "Your font",
      "The weather"
     ],
     0
    ],
    [
     "Sound should start:",
     [
      "Only after the visitor turns it on",
      "Automatically and loud",
      "Never",
      "At night"
     ],
     0
    ],
    [
     "Voices that feel too slow can be:",
     [
      "Sped up slightly",
      "Deleted",
      "Ignored",
      "Doubled"
     ],
     0
    ]
   ],
   "notes": "Play Veda Sky clips.",
   "docs": [
    "Voice script template"
   ],
   "proof": "Website audio, voice recording script."
  },
  {
   "id": "b5",
   "tier": "penthouse",
   "n": "B5",
   "title": "Grand Opening",
   "design": "Laptop",
   "outcome": "Free hosting with a preview-and-approve routine and hide-from-search until ready.",
   "lessons": [
    [
     "Free hosting",
     12,
     "GitHub Pages."
    ],
    [
     "Preview, approve, publish",
     10,
     "Your publishing workflow; rollback tags."
    ]
   ],
   "exercise": "Write your publishing checklist.",
   "challenge": [
    "Set up hosting",
    "Preview locally",
    "Publish hidden from search"
   ],
   "quiz": [
    [
     "Before publishing you:",
     [
      "Preview locally and approve",
      "Publish blindly",
      "Ask strangers",
      "Skip"
     ],
     0
    ],
    [
     "Hide from search means:",
     [
      "Reachable by link but not listed",
      "Deleted",
      "Private forever",
      "Paid"
     ],
     0
    ],
    [
     "A rollback tag lets you:",
     [
      "Go back to the last good version",
      "Delete history",
      "Change colors",
      "Nothing"
     ],
     0
    ]
   ],
   "notes": "Never handle members' tokens.",
   "docs": [
    "Publishing workflow"
   ],
   "proof": "publishing-workflow.md, the live site."
  },
  {
   "id": "b6",
   "tier": "penthouse",
   "n": "B6",
   "title": "The Private Entrance",
   "design": "Hub",
   "outcome": "Website orders and forms flow into the portal built in the Suite.",
   "lessons": [
    [
     "Forms to portal",
     12,
     "Project forms feed Orders."
    ],
    [
     "Keep it private",
     8,
     "Public site shows counts, portal holds names."
    ]
   ],
   "exercise": "Map one form to one portal page.",
   "challenge": [
    "Connect one form",
    "Test an order end to end",
    "Check nothing private is public"
   ],
   "quiz": [
    [
     "The public site should show:",
     [
      "No customer names",
      "Every order",
      "Passwords",
      "Addresses"
     ],
     0
    ],
    [
     "Test with:",
     [
      "Example data",
      "Real customer data",
      "Nothing",
      "Passwords"
     ],
     0
    ],
    [
     "The portal is:",
     [
      "Private to you",
      "Public",
      "Shared with all",
      "Printed"
     ],
     0
    ]
   ],
   "notes": "Close the bonus track with the full system tour.",
   "docs": [
    "Form-to-portal map"
   ],
   "proof": "Portals plus website."
  }
 ]
};
