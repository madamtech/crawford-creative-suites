// Lobby concierge FAQ: answers common questions from a fixed list, free to run.
//
// Each entry: id (its recording is audio/faq-<id>.mp3), suite (217, 305, 412,
// or null) for the "Take me there" button, match (all patterns must match the
// visitor's words), and the answer she shows and says. The first entry that
// matches wins, so specific questions come before general ones.
//
// Visitors can type, or tap the mic and speak (the browser's own free speech
// recognition, in Chrome, Edge and Safari).

const PRICE = /\b(how much|price|prices|pricing|cost|costs|charge|rate|rates|fee|fees)\b|\$/;

export const FAQ = [
  // ---------- Building and policies ----------
  { id: 'hello', suite: null, match: [/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b[^?]{0,20}$/],
    text: 'Hello, and welcome! Ask me about any of our three suites, or tell me what you are looking for.' },
  { id: 'owner', suite: null, match: [/\b(who (owns|runs|is behind|made)|owner|founder|tanika)\b/],
    text: 'All three suites are run by Tanika Crawford: a licensed cosmetologist and makeup artist, a maker, and an AI consultant.' },
  { id: 'visit', suite: null, match: [/\b(address|located|location|visit in person|come by|stop by|storefront|in person)\b/],
    text: 'Crawford Creative Suites is an online building, so there is no storefront to visit. You are welcome to explore all three suites right here.' },
  { id: 'hours', suite: null, match: [/\b(hours|open|close|closed|closing)\b/],
    text: 'The building is open online any time. Send a request whenever you like, and Tanika will reply by email.' },
  { id: 'consult', suite: null, desk: true, match: [/\b(consult|consultation|discovery call|strategy call|free call)\b/],
    text: 'Your first 30-minute discovery consultation is free. After that, consultation is $125 an hour, scheduled and paid in advance, and it is credited toward an ongoing engagement.' },
  { id: 'contact', suite: null, match: [/\b(contact|email|e-mail|reach|phone|call|talk to (someone|a person|tanika))\b/],
    text: 'Choose a suite and send a request; it goes straight to that business. You can also email Madam Allure at madamallure@gmail.com, Allure Fusions at allurefusions@gmail.com, or AI AuthoriTech at ai.authoritech@gmail.com.' },
  { id: 'deposit', suite: null, desk: true, match: [/\b(deposit|payment|pay|paid|upfront|up front|installment)\b/],
    text: 'For products, orders of $35 or less are paid in full, and orders over $35 start with a 60 percent deposit. The balance and shipping are paid before your order ships. AI AuthoriTech deposits are set in your written proposal.' },
  { id: 'shipping', suite: null, desk: true, match: [/\b(ship|ships|shipping|deliver|delivery|mail|pick ?up|local)\b/],
    text: 'Yes, we ship. Shipping is added to your final invoice, and local pickup is not offered.' },
  { id: 'timing', suite: null, desk: true, match: [/\b(how long|turnaround|timeline|how soon|rush|when will|ready by)\b/],
    text: 'Everything is made to order, so timing depends on the project. You will get a timeline when your request is reviewed, and work begins once the payment or deposit is received.' },
  { id: 'returns', suite: null, desk: true, match: [/\b(return|returns|refund|exchange|cancel|wrong|damaged|broken)\b/],
    text: 'For returns, changes, or a problem with an order, send a request to the suite you ordered from, and Tanika will help you directly.' },

  // ---------- Madam Allure (217) ----------
  { id: 'memorial', suite: '217', match: [/\b(memorial|funeral|repast|in loving memory|passed away|celebration of life|homegoing)\b/],
    text: 'Madam Allure creates memorial keepsakes: ribbons, plaques, fans, fan whiteboards, and towels. Allure Fusions can also make a memorial photo lamp from a favorite picture.' },
  { id: 'makeup', suite: '217', match: [/\b(makeup|make-up|make up artist|mua|cosmetolog\w*|hair ?style|stylist|lashes)\b/],
    text: 'Tanika is a licensed cosmetologist and makeup artist. To ask about makeup or styling for an event, send a request to Madam Allure.' },
  { id: 'gift-sets', suite: '217', match: [/\b(gift set|gift sets|gift box|bridal|bridesmaid|wedding gift|corporate|wellness box|gentleman|welcome home|wine glass|gift)\b/],
    text: 'Madam Allure gift sets include the Bridal Celebration Set and Corporate Wellness Box for $55, the Gentleman’s Set for $45, and the Welcome Home Set and Blinged Wine Glass for $35 each. Custom gifts are welcome too.' },
  { id: 'fragrance-price', suite: '217', match: [/\b(fragrance|perfume|roll-?on|cologne|scent)s?\b/, PRICE],
    text: 'Enticed by Madam Allure roll-on fragrance oils are $9 to $10 for 10 milliliters, in a moisturizing coconut-oil base with no alcohol.' },
  { id: 'fragrance', suite: '217', match: [/\b(fragrance|perfume|roll-?on|cologne|scent|smell)s?\b/],
    text: 'Enticed by Madam Allure offers roll-on fragrance oils for women, men, and gender-neutral scents, plus matching dry body oils. For the home there is room and linen spray and aroma beads.' },
  { id: 'body-oil', suite: '217', match: [/\b(body oil|dry oil|dry body)\b/],
    text: 'Dry body oils are $14 to $16 for 4 ounces. They are lightweight, absorb quickly, and pair with your fragrance.' },
  { id: 'beard', suite: '217', match: [/\b(beard|mustache|facial hair|grooming)\b/],
    text: 'For beards there is beard oil, from $10, and beard balm, from $10, made with natural butters and oils. The Powder Room on Floor 2 has a five-minute beard routine.' },
  { id: 'hair', suite: '217', match: [/\b(hair|scalp|shampoo|edges)\b/],
    text: 'For hair, Madam Allure makes a botanical hair oil from $10, an African black soap shampoo bar for $12, and whipped shea butter from $9 for skin and hair.' },
  { id: 'soap', suite: '217', match: [/\b(soap|soaps|cleanser|black soap)\b/],
    text: 'Handmade soaps are $8 for turmeric, $10 for turmeric with ginger or kaolin clay, $13 for Yoni Rose, and $14 for African black soap.' },
  { id: 'bath', suite: '217', match: [/\b(bath|soak|truffle|truffles|bath tea|bath salt|salts|scrub|scrubs)\b/],
    text: 'For the bath there are bath truffles from $14, bath tea from $9, bath salt for $10, body scrubs for $16, and foaming bath butter for $24.' },
  { id: 'skin', suite: '217', match: [/\b(skin|skincare|dry|moisturi[sz]e|moisturizer|shea|butter|serum|face|facial)\b/],
    text: 'For dry skin, try whipped shea butter from $9, a dry body oil from $14, or a facial serum from $8. The Powder Room on Floor 2 has easy at-home rituals.' },
  { id: 'sensitive', suite: '217', match: [/\b(allerg\w*|sensitive|reaction|irritat\w*|pregnan\w*|eczema|rash|medical)\b/],
    text: 'Every product lists its ingredients so you can check them first. Patch-test anything new, and talk with your doctor about allergies or medical concerns.' },
  { id: 'ingredients', suite: '217', match: [/\b(ingredient|ingredients|natural|herb|herbs|herbal|essential oil|essential oils|made with|chemicals)\b/],
    text: 'Madam Allure products are built on herbs chosen for hair and skin, natural oils, infused essential oils, and natural raw butters.' },

  // ---------- Allure Fusions (305) ----------
  { id: 'lithophane', suite: '305', match: [/\b(lithophane|lithophanes|photo lamp|picture lamp|memory lamp|lamp|lamps)\b/],
    text: 'A lithophane is a 3D printed panel that reveals your photo when it is lit from behind. Photo lamps are $45 to $85, depending on size and the number of panels.' },
  { id: 'photos', suite: '305', match: [/\b(photo|photos|picture|pictures|image)\b/, /\b(quality|best|good|which|send|resolution|blurry)\b/],
    text: 'Clear photos with good lighting, visible faces, and strong contrast give the best results. Dark, blurry, or small images may need extra preparation.' },
  { id: 'screen', suite: '305', match: [/\b(screen print\w*|t-?shirts?|shirts?|apparel|hoodies?|tees)\b/],
    text: 'Yes, Allure Fusions offers screen printing. Send a request with your design, the items, and the quantity for a quote.' },
  { id: 'school', suite: '305', match: [/\b(school|team|teams|organization|organizations|church|club|cheer|spirit|teacher|mascot|sorority|fraternity)\b/],
    text: 'Allure Fusions makes School and Organization Sets in your colors and mascot: badge reels, cheer accessories, pens, notebook covers, clipboards, NFC tags, lamps, and awards.' },
  { id: 'laser', suite: '305', match: [/\b(laser|engrave|engraved|engraving|engravings|cutting|slate|coasters?)\b/],
    text: 'Allure Fusions offers laser engraving and cutting: slate coaster sets of four for $20 to $30, engraved tags from $8, ornaments from $10, and custom signs and gifts from $18.' },
  { id: 'nfc', suite: '305', match: [/\b(nfc|tap tag|tap to)\b/],
    text: 'An NFC tag links a physical piece to something online. A tap of a phone can open music, a memorial page, a website, or contact details.' },
  { id: 'files', suite: '305', match: [/\b(stl|3mf|file only|design file|my own printer|digital file)\b/],
    text: 'If you have your own 3D printer, you can order a digital design file instead of a finished piece. Ask for a file-only quote.' },
  { id: 'artwork', suite: '305', match: [/\b(svg|dxf|vector|artwork|logo file|my logo|my design)\b/],
    text: 'Clean, high-contrast artwork works best. SVG or DXF files are ideal, and a clear PNG, JPG, or PDF can work for many projects.' },
  { id: 'material', suite: '305', match: [/\b(pla|petg|filament|material|materials|plastic)\b/],
    text: 'PLA is great for colorful, detailed decor. PETG is tougher and handles moisture and moderate heat better. Allure Fusions will help you choose for your project.' },
  { id: 'favors', suite: '305', match: [/\b(favor|favors|party|parties|event|events|bulk|wholesale|baby shower|birthday|ornament|ornaments)\b/],
    text: 'Event favors are $6 to $15 each, and ornaments are $8 to $18. For bulk orders, send a request with your quantity and date for a quote.' },
  { id: 'care', suite: '305', match: [/\b(clean|cleaning|care for|hot car|sunlight|melt|melting|heat)\b/],
    text: 'Dust printed pieces with a soft, dry or slightly damp cloth. Keep them away from hot cars, direct heat, and long hours of strong sun.' },
  { id: 'print-price', suite: '305', match: [/\b(3d|print|printed|printing)\b/, PRICE],
    text: '3D printed pieces start at $5 for bookmarks, with vases at $20 to $40 and photo lamps at $45 to $85. Custom projects are quoted after review.' },

  // ---------- AI AuthoriTech (412) ----------
  { id: 'replace', suite: '412', match: [/\b(replace|take (my|our) jobs?|take over)\b/],
    text: 'AI works best as a tool that supports people. Human judgment, accountability, and relationships stay essential, and AI AuthoriTech designs around that.' },
  { id: 'audit', suite: '412', match: [/\b(audit|readiness|assessment|ready for ai)\b/],
    text: 'The AI Readiness Audit starts at $350. It looks at your workflows, tools, data, and risks to find your best opportunities for AI.' },
  { id: 'start', suite: '412', match: [/\b(where (do|should) (i|we) start|get started|getting started|new to ai|beginner|first step)\b/],
    text: 'Start with a free 30-minute discovery consultation. From there, an AI Readiness Audit, starting at $350, shows where AI can help most.' },
  { id: 'agent', suite: '412', match: [/\b(chatbot|chat bot|agent|agents|assistant|assistants|bot|bots|gpt)\b/],
    text: 'Custom AI agents start at $1,500. They can handle customer support, internal knowledge, lead intake, or guided services.' },
  { id: 'automation', suite: '412', match: [/\b(automat\w*|workflow|workflows|n8n|zapier|make\.com|repetitive)\b/],
    text: 'An automation strategy starts at $750 and gives you a practical roadmap. Building connected workflows is quoted per project.' },
  { id: 'portal', suite: '412', match: [/\b(portal|portals|command center|command centers|dashboard|dashboards)\b/],
    text: 'AI AuthoriTech builds custom portals and business command centers that bring your tools and information into one place. Each one is quoted per project.' },
  { id: 'lms', suite: '412', match: [/\b(lms|learning management|docebo|netexam|workday|certification|certifications|learning systems?)\b/],
    text: 'Learning systems consulting starts at $125 an hour, covering LMS administration, reporting, certification workflows, and integrations.' },
  { id: 'training', suite: '412', match: [/\b(training|train|workshop|workshops|teach|class|classes)\b/],
    text: 'Team AI training starts at $500, with practical, role-focused sessions that help your team use AI responsibly and confidently.' },
  { id: 'privacy', suite: '412', match: [/\b(safe|safety|privacy|private|secure|security|confidential|data)\b/],
    text: 'Keep confidential or customer information out of AI tools unless your organization has approved them. AI AuthoriTech helps set those rules as part of responsible AI planning.' },
  { id: 'virtual', suite: '412', match: [/\b(virtual|virtually|remote|remotely|zoom|online)\b/],
    text: 'Yes, AI AuthoriTech services are delivered virtually, and documents, tools, and training materials are shared digitally.' },

  // ---------- General prices (last) ----------
  { id: 'prices', suite: null, match: [PRICE],
    text: 'Prices are listed inside each suite. Tell me what you are interested in, like fragrance, a photo lamp, or an AI audit, and I will give you the price.' },
];

const norm = (s) => ' ' + s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim() + ' ';

const SUITES = {
  '217': { name: 'Madam Allure', floor: 2, offers: 'fragrance, bath and body care, gifts, and memorial keepsakes' },
  '305': { name: 'Allure Fusions', floor: 3, offers: '3D printing, laser engraving, screen printing, and photo lamps' },
  '412': { name: 'AI AuthoriTech', floor: 4, offers: 'AI strategy, automation, custom AI agents, and training' },
};
// Lobby reply to a business question that is not about one suite (payments,
// shipping, consultations...): she directs the visitor instead of answering.
const DIRECT = 'Each business handles that with you directly, so their receptionist can help. Madam Allure on Floor 2 offers beauty, fragrance, and gifts; Allure Fusions on Floor 3 offers 3D printing and laser work; and AI AuthoriTech on Floor 4 offers AI strategy and automation. Choose a suite on the board, and I will send you up.';
const say = (key, text, queue) => {
  if (window.ccsVoice && window.ccsVoice.sayKey) window.ccsVoice.sayKey(key, text, { queue });
};
const find = (question) => {
  const q = norm(question || '');
  if (q.trim().length < 2) return null;
  return FAQ.find((f) => f.match.every((re) => re.test(q))) || null;
};

// Lobby concierge: general questions and directions only. Questions about one
// business go to that suite's receptionist, who answers them on arrival; business
// policies (payments, shipping, consultations...) are left to the receptionists.
function answer(question) {
  const hit = find(question);
  if (!hit) return null;
  if (!hit.suite) {
    window.ccsPendingQuestion = null;
    if (hit.desk) {
      say('faq-direct', DIRECT);
      return { id: 'direct', suite: null, text: DIRECT };
    }
    say('faq-' + hit.id, hit.text);
    return hit;
  }
  const s = SUITES[hit.suite];
  const text = `${s.name} in Suite ${hit.suite} on Floor ${s.floor} offers ${s.offers}. Tap below, and their receptionist will answer your question when you arrive.`;
  window.ccsPendingQuestion = { suite: hit.suite, question };
  say('faq-send-' + hit.suite, text);
  return { id: 'send-' + hit.suite, suite: hit.suite, text };
}

// Receptionists: answer their own business's questions and building questions.
function answerAt(suite, question) {
  const hit = find(question);
  if (!hit) {
    const text = 'I do not have that answer here yet. Send us a request, and Tanika will answer you personally.';
    say('faq-unknown-' + suite, text);
    return text;
  }
  if (hit.suite && hit.suite !== suite) {
    const s = SUITES[hit.suite];
    const text = `${s.name} handles that, in Suite ${hit.suite} on Floor ${s.floor}. Take the elevator up, and their receptionist will help you.`;
    say('faq-other-' + hit.suite, text);
    return text;
  }
  say('faq-' + hit.id, hit.text);
  return hit.text;
}
window.ccsFaq = { answer, answerAt, list: FAQ, suites: SUITES };

// ---------- Speak instead of type ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const MIC_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/></svg>';
function setInput(input, value) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function makeMic(form, input, who) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'concierge-mic';
  btn.setAttribute('aria-label', 'Speak to the ' + who);
  btn.title = 'Speak to the ' + who;
  btn.innerHTML = MIC_SVG;
  let rec = null;
  btn.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new Recognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    btn.classList.add('listening');
    btn.setAttribute('aria-label', 'Listening… tap to stop');
    rec.onresult = (e) => {
      setInput(input, e.results[0][0].transcript);
      setTimeout(() => form.requestSubmit(), 50);
    };
    rec.onend = () => {
      rec = null;
      btn.classList.remove('listening');
      btn.setAttribute('aria-label', 'Speak to the ' + who);
    };
    try { rec.start(); } catch { rec = null; btn.classList.remove('listening'); }
  });
  return btn;
}
function addLobbyMic() {
  if (!Recognition) return;
  const form = document.querySelector('.concierge-card .concierge-search');
  if (!form || form.querySelector('.concierge-mic')) return;
  form.insertBefore(makeMic(form, form.querySelector('input'), 'concierge'), form.querySelector('button'));
}

// ---------- Ask the receptionist (each suite) ----------
function addReceptionAsk() {
  const scene = document.querySelector('.reception-scene');
  if (!scene || !scene.dataset.suite) return;
  const suite = scene.dataset.suite;
  let box = scene.querySelector('.reception-ask');
  if (box && box.dataset.suite !== suite) { box.remove(); box = null; }
  if (!box) {
    box = document.createElement('aside');
    box.className = 'reception-ask';
    box.dataset.suite = suite;
    box.setAttribute('aria-label', 'Ask the receptionist');
    box.innerHTML = '<small>RECEPTIONIST</small><strong>Questions? Just ask.</strong><form class="concierge-search reception-ask-form"><label class="sr-only" for="reception-query">Ask the receptionist</label>'
      + '<input id="reception-query" autocomplete="off" placeholder="Ask about products, prices or services">'
      + '<button>Ask</button></form><p class="concierge-reply reception-answer" aria-live="polite" hidden></p>';
    const form = box.querySelector('form');
    const input = box.querySelector('input');
    const out = box.querySelector('.reception-answer');
    if (Recognition) form.insertBefore(makeMic(form, input, 'receptionist'), form.querySelector('button'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      out.textContent = answerAt(suite, q);
      out.hidden = false;
    });
    scene.appendChild(box);
  }
  // A question asked in the lobby is answered here on arrival, after the welcome.
  const pending = window.ccsPendingQuestion;
  if (pending && pending.suite === suite) {
    window.ccsPendingQuestion = null;
    const hit = find(pending.question);
    if (!hit) return;
    box.querySelector('input').value = pending.question;
    const out = box.querySelector('.reception-answer');
    out.textContent = hit.text;
    out.hidden = false;
    say('faq-' + hit.id, hit.text, true);
  }
}

let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; addLobbyMic(); addReceptionAsk(); });
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-suite'] });
