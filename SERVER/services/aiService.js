// ─────────────────────────────────────────────────────────────────────────────
// TOPIC BUCKET DETECTION
// Classifies the topic into a content domain so the right layout is chosen.
// ─────────────────────────────────────────────────────────────────────────────

const AI_MODEL_SIGNALS = [
  'claude', 'gpt', 'gemini', 'llama', 'mistral', 'copilot', 'deepseek',
  'openai', 'anthropic', 'opus', 'sonnet', 'haiku', 'phi', 'grok', 'perplexity',
  'ai model', 'llm', 'large language model', 'foundation model', 'multimodal',
];

const BUSINESS_AUTOMATION_SIGNALS = [
  'automation', 'workflow', 'crm', 'erp', 'roi', 'saas', 'b2b', 'lead generation',
  'sales funnel', 'email marketing', 'zapier', 'make.com', 'n8n', 'airtable',
  'productivity', 'business process', 'outsourcing', 'agency', 'client acquisition',
];

const WEB_DEV_SIGNALS = [
  'react', 'next.js', 'vue', 'angular', 'flutter', 'node', 'api', 'backend',
  'frontend', 'fullstack', 'typescript', 'javascript', 'tailwind', 'web app',
  'mobile app', 'pwa', 'ssr', 'seo', 'website', 'landing page', 'web development',
  'software development', 'microservices', 'serverless', 'devops', 'docker',
];

const DESIGN_SIGNALS = [
  'ui', 'ux', 'design system', 'figma', 'wireframe', 'prototype', 'typography',
  'branding', 'logo', 'color palette', 'user experience', 'conversion rate',
  'a/b test', 'accessibility', 'responsive design',
];

/**
 * Detects topic bucket from topic string and category.
 * @returns {'ai_model'|'business_automation'|'web_development'|'design'|'general_tech'}
 */
function detectTopicBucket(topic, category) {
  const haystack = `${topic} ${category}`.toLowerCase();
  const score = (signals) => signals.filter((s) => haystack.includes(s)).length;

  const scores = {
    ai_model: score(AI_MODEL_SIGNALS),
    business_automation: score(BUSINESS_AUTOMATION_SIGNALS),
    web_development: score(WEB_DEV_SIGNALS),
    design: score(DESIGN_SIGNALS),
  };

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : 'general_tech';
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT TEMPLATES
// Each bucket has multiple layout variants — one is randomly selected per call.
// needsComparisonTable / needsAvB are content signals, not absolute mandates.
// The prompt tells the model to omit them if they feel forced for the topic.
// ─────────────────────────────────────────────────────────────────────────────

const LAYOUT_TEMPLATES = {
  ai_model: [
    {
      id: 'ai_deep_dive',
      needsComparisonTable: true,
      needsAvB: false,
      comparisonTableHint: 'Compare this model vs 2–3 direct competitors (e.g. GPT-4o, Gemini 1.5 Pro) across: context window, speed, cost per token, key strengths, best use case.',
      sections: `
1. Hook — open with the most striking capability or benchmark result of this model. No definitions yet. Lead with impact. (no heading)
2. 🤖 What Is [topic], Really? (emoji h2) — what the model is, who built it, what generation/family it belongs to, what genuinely differentiates it.
3. ⚡ Core Strengths (emoji h2) — 5–6 specific capabilities with brief real-world examples. Use ul/li.
4. 📊 How It Compares (emoji h2) — benchmark table vs relevant competitors.
5. 🎯 Where It Shines: Best Use Cases (emoji h2) — specific tasks: coding, long-context analysis, agentic workflows, multimodal, etc. Use ul/li.
6. ⚠️ Honest Limitations (emoji h2) — what it still can't do well. Be direct.
7. 🏆 Verdict: Who Should Use It — and When (emoji h2) — opinionated recommendation by audience type.
8. CodenixLabs CTA`,
    },
    {
      id: 'ai_use_case_focus',
      needsComparisonTable: false,
      needsAvB: false,
      sections: `
1. Hook — open with a concrete scenario: a developer or product team using this model to solve a real problem. Specific task, specific outcome. (no heading)
2. 🧠 What Makes [topic] a Step Change (emoji h2) — the key capability or architectural leap that sets it apart.
3. 🛠️ What You Can Actually Build With It (emoji h2) — practical use cases with brief examples. ul/li.
4. 🔬 Deep Dive: Three Tasks It Handles Exceptionally (emoji h2) — pick 3 high-value tasks and walk through how the model handles each.
5. 🚧 What to Know Before You Ship With It (emoji h2) — rate limits, pricing, hallucination patterns, latency profile.
6. 💡 Getting the Most Out of It (emoji h2) — prompting strategies, system prompt tips, context window management. ul/li.
7. 🏁 Bottom Line (emoji h2) — direct verdict: who should adopt now vs. who should wait.
8. CodenixLabs CTA`,
    },
  ],

  business_automation: [
    {
      id: 'automation_roi',
      needsComparisonTable: true,
      needsAvB: true,
      comparisonTableHint: 'Manual approach vs automated approach: time per task, error rate, monthly cost, team capacity freed, scalability ceiling.',
      avbLabel: '🏢 Two Businesses, One Problem — Who Came Out Ahead?',
      avbHint: 'Business A kept their manual process. Business B automated it. Six months later — show the gap in costs, team output, client capacity, and growth trajectory.',
      sections: `
1. Hook — open with a specific, jarring number: time wasted, revenue lost, or headcount burned on a task that should be automated. (no heading)
2. 🤔 Why Most Teams Are Still Bleeding Time Here (emoji h2) — name the exact bottleneck this automation solves.
3. ⚙️ How [topic] Actually Works (emoji h2) — clear, jargon-free explanation of the mechanism and tooling.
4. 📊 Manual vs Automated: What the Numbers Say (emoji h2) — comparison table.
5. 🏢 Two Businesses, One Problem — Who Came Out Ahead? (emoji h2) — A vs B narrative with specific operational and financial outcomes.
6. 🚀 Implementation Roadmap (emoji h2) — step-by-step: process audit → tool selection → integration → team training. Use numbered ol/li.
7. ⚠️ Where Automation Projects Fail (emoji h2) — common failure modes and how to sidestep them.
8. CodenixLabs CTA`,
    },
    {
      id: 'automation_workflow',
      needsComparisonTable: false,
      needsAvB: false,
      sections: `
1. Hook — open mid-scene: a founder still manually doing a task at 10pm that should have been automated six months ago. (no heading)
2. 🔍 The Hidden Tax on Your Business (emoji h2) — frame repetitive manual work as a compounding cost, not just an inconvenience.
3. 🗺️ The Stack That Actually Handles This (emoji h2) — specific tool recommendations for this workflow. ul/li.
4. 🔄 Building the Workflow Step by Step (emoji h2) — numbered implementation guide.
5. 📈 What Changes After You Automate (emoji h2) — team capacity, output quality, scalability, morale.
6. 🧱 The Real Blockers — and How to Handle Them (emoji h2) — budget, stakeholder buy-in, legacy systems, technical debt.
7. ✅ Your 30-Day Automation Kickstart (emoji h2) — concrete first actions to take this week.
8. CodenixLabs CTA`,
    },
  ],

  web_development: [
    {
      id: 'webdev_technical',
      needsComparisonTable: true,
      needsAvB: false,
      comparisonTableHint: 'Compare the core technology/approach in this topic vs common alternatives across: performance, developer experience, scalability, learning curve, ecosystem maturity.',
      sections: `
1. Hook — open with a performance benchmark, a common developer mistake, or a "you're probably doing X wrong" opener. (no heading)
2. 🏗️ What [topic] Is — and What It Isn't (emoji h2) — precise definition, common misconceptions cleared up.
3. ⚡ Why It Matters in Production (emoji h2) — adoption data, real-world impact, who's using it and why.
4. 🔬 How It Works (emoji h2) — technical depth explained accessibly. Use an analogy if helpful.
5. 📊 [topic] vs The Alternatives (emoji h2) — comparison table.
6. 🛠️ What Good Implementation Looks Like (emoji h2) — architecture decisions, common pitfalls, best practices. ul/li.
7. ⚠️ Where Developers Go Wrong (emoji h2) — top 3–4 mistakes with fixes.
8. CodenixLabs CTA`,
    },
    {
      id: 'webdev_business_case',
      needsComparisonTable: false,
      needsAvB: true,
      avbLabel: '🚀 Two Projects, Same Budget — Very Different Outcomes',
      avbHint: 'Project A chose the wrong stack or skipped this approach. Project B used the approach in this topic. Compare: time to ship, performance results, client satisfaction, ongoing maintenance cost.',
      sections: `
1. Hook — open from the client's perspective: they asked for something fast and got something slow and expensive to maintain. (no heading)
2. 💸 Why Tech Decisions Are Business Decisions (emoji h2) — connect stack choices to commercial outcomes.
3. 🎯 What [topic] Makes Possible That Other Approaches Don't (emoji h2) — concrete business outcomes. ul/li.
4. 🚀 Two Projects, Same Budget — Very Different Outcomes (emoji h2) — A vs B narrative with real project dynamics and outcomes.
5. 📋 How to Evaluate If This Is the Right Fit (emoji h2) — decision checklist for product teams.
6. 🔑 Keys to Getting the Implementation Right (emoji h2) — team structure, timelines, vendor signals to look for.
7. ❌ Red Flags to Walk Away From (emoji h2) — warning signs in proposals or dev partners.
8. CodenixLabs CTA`,
    },
  ],

  design: [
    {
      id: 'design_ux',
      needsComparisonTable: false,
      needsAvB: false,
      sections: `
1. Hook — open with a UX failure moment: a user hitting a wall and leaving. Make it vivid and specific. (no heading)
2. 🧠 Why This Design Problem Costs You More Than You Think (emoji h2) — connect UX friction to conversion loss, churn, or support overhead.
3. 🎨 What Good [topic] Actually Looks Like (emoji h2) — principles illustrated with vivid examples.
4. 🔍 Five Patterns That Kill User Trust (emoji h2) — specific, named anti-patterns. ul/li.
5. ✅ The Fix: What to Do Instead (emoji h2) — matched solutions for each anti-pattern. ul/li.
6. 📐 Implementing This Without a Full Design Team (emoji h2) — practical steps for lean teams and agencies.
7. 🧪 How to Know It's Working (emoji h2) — metrics, lightweight user testing, tools.
8. CodenixLabs CTA`,
    },
    {
      id: 'design_system',
      needsComparisonTable: true,
      needsAvB: false,
      comparisonTableHint: 'Ad-hoc design vs design system: consistency score, dev speed, onboarding time for new hires, brand coherence, scalability across products.',
      sections: `
1. Hook — open with the chaos of a product that has 12 button styles across 6 screens and nobody knows which one is "correct." (no heading)
2. 🏛️ What [topic] Is — and Why It's a Business Asset (emoji h2) — not just aesthetics; a system that ships faster and breaks less.
3. ⚡ What You Actually Gain (emoji h2) — speed, consistency, brand trust, dev-design alignment, onboarding speed. ul/li.
4. 📊 Ad-Hoc vs Systematic Design (emoji h2) — comparison table.
5. 🧱 The Building Blocks (emoji h2) — what goes into a solid [topic]: tokens, components, documentation, governance. ul/li.
6. 🗺️ Rolling It Out Without Blowing Up Your Roadmap (emoji h2) — phased adoption approach.
7. ⚠️ Traps Most Teams Fall Into (emoji h2) — over-engineering, lack of ownership, documentation debt.
8. CodenixLabs CTA`,
    },
  ],

  general_tech: [
    {
      id: 'general_explainer',
      needsComparisonTable: false,
      needsAvB: false,
      sections: `
1. Hook — open with the gap between what people think this topic means and what it actually involves. (no heading)
2. 🔍 What [topic] Really Means (emoji h2) — strip the jargon. Give a clear, useful definition.
3. 💡 Why It's Becoming Impossible to Ignore (emoji h2) — adoption curve, market pressure, real-world signals.
4. 🛠️ How It Works in Practice (emoji h2) — mechanism explained with a real-world analogy.
5. 🎯 Who This Is Actually For (emoji h2) — specific audience types and their use cases. ul/li.
6. ⚠️ What People Consistently Get Wrong About It (emoji h2) — 2–3 common misconceptions with corrections.
7. 🧭 Your Realistic Next Step (emoji h2) — how to evaluate and start without overcommitting.
8. CodenixLabs CTA`,
    },
    {
      id: 'general_trends',
      needsComparisonTable: false,
      needsAvB: true,
      avbLabel: '📡 Early Movers vs Late Adopters: What the Gap Looks Like',
      avbHint: 'Teams that adopted this early vs teams still ignoring it — show what their operations, competitive position, and financials look like 12 months later.',
      sections: `
1. Hook — open with a bold industry shift and one concrete signal showing it's already underway. (no heading)
2. 📡 The Shift That's Already Happening (emoji h2) — macro context, adoption signals, industry data.
3. 🔬 What's Actually Driving This (emoji h2) — root causes, not surface-level trends.
4. 📡 Early Movers vs Late Adopters: What the Gap Looks Like (emoji h2) — A vs B narrative with real operational and competitive consequences over 12 months.
5. 🧰 Tools and Approaches Leading the Charge (emoji h2) — what's emerging and why. ul/li.
6. 🗺️ How to Position Ahead of the Curve (emoji h2) — practical moves for the next 90 days.
7. 🚧 Barriers — and How to Clear Them (emoji h2) — budget, org readiness, technical complexity.
8. CodenixLabs CTA`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ANGLE DEFINITIONS
// Tone + hook modifier + temperature only.
// Angles do NOT dictate section structure — that's the layout's job.
// ─────────────────────────────────────────────────────────────────────────────

const ANGLE_DEFINITIONS = {
  contrarian: {
    instruction: `WRITING ANGLE — CONTRARIAN: Challenge what most people assume about this topic. Identify the prevailing belief, then dismantle it with logic. Be provocative but grounded. Every major section should push back on something assumed to be true. Don't hedge — commit to the counter-claim.`,
    hookModifier: `Open by naming the dominant belief. Then in one brutal line, flip it. Don't explain yet — just drop the counter-claim and let it land.`,
    temperature: 0.95,
  },
  datadriven: {
    instruction: `WRITING ANGLE — DATA-DRIVEN: Every claim needs a number or research finding behind it. Reference stats naturally throughout — not as citations, but woven into the argument. Structure each section as: assertion → evidence → implication. The hook must open with a specific, surprising number.`,
    hookModifier: `Open with a specific, striking statistic. Then ask the question that makes it personal. Then reveal what the data says vs. what most people assume.`,
    temperature: 0.70,
  },
  storytelling: {
    instruction: `WRITING ANGLE — STORYTELLING: Lead with a vivid micro-story. A real person, a specific moment, a clear problem. Avoid abstract statements — show what things look like in practice through a character the reader can identify with. Every concept should be illustrated through narrative, not explained as theory.`,
    hookModifier: `Drop the reader mid-scene. Specific time, specific person, specific problem — no preamble. "It was Tuesday. Priya had 40 tabs open and zero answers."`,
    temperature: 0.92,
  },
  beginner: {
    instruction: `WRITING ANGLE — BEGINNER'S GUIDE: Assume zero prior knowledge. Define every term on first use in plain English. Use everyday analogies for abstract ideas. The tone is warm, clear, and encouraging — a knowledgeable friend explaining something over coffee, not a textbook.`,
    hookModifier: `Open with a relatable moment of confusion or frustration. Make the reader feel seen. Promise them clarity and a clear path forward by the end.`,
    temperature: 0.75,
  },
  futurist: {
    instruction: `WRITING ANGLE — FUTURIST: Write with the confidence of someone who's already watched this play out. Make specific, dated predictions. Ground them in early signals visible right now. Frame inaction as a compounding risk. Every section should leave the reader with a sense of urgency — not panic.`,
    hookModifier: `Open with a bold, specific prediction 12–24 months out. Then immediately point to one signal happening RIGHT NOW that makes it credible.`,
    temperature: 0.90,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CTA TEMPLATES — topic-aware so every blog doesn't end identically
// ─────────────────────────────────────────────────────────────────────────────

const CTA_TEMPLATES = {
  ai_model: {
    headline: 'How Codenix Labs Helps You Ship With AI',
    body: "At Codenix Labs, we don't just experiment with AI models.",
    valueStatement: 'We integrate them into production systems that deliver real outcomes for your product and your users.',
    services: [
      'AI feature integration into existing web and mobile apps',
      'Custom prompt engineering and evaluation pipelines',
      'LLM-powered backend APIs built to scale',
      'Model selection and cost-optimisation consulting',
    ],
    closingAction: 'integrate AI into your product',
  },
  business_automation: {
    headline: 'How Codenix Labs Builds Your Automation Engine',
    body: "At Codenix Labs, we don't hand you a SaaS subscription and call it done.",
    valueStatement: 'We design and build automation systems tailored to how your business actually operates.',
    services: [
      'End-to-end workflow automation design and build',
      'CRM, ERP, and third-party tool integration',
      'Custom internal tooling and dashboards',
      'Ongoing automation maintenance and iteration',
    ],
    closingAction: "automate what's slowing you down",
  },
  web_development: {
    headline: 'How Codenix Labs Builds What You Actually Need',
    body: "At Codenix Labs, we don't just write code.",
    valueStatement: 'We architect systems that are fast to ship, easy to scale, and built to last.',
    services: [
      'Full-stack web and mobile app development',
      'Performance audits and architecture reviews',
      'API design and backend engineering',
      'Technical due diligence for product teams',
    ],
    closingAction: 'build your product right',
  },
  design: {
    headline: 'How Codenix Labs Turns Design Into Results',
    body: 'At Codenix Labs, we treat design as a business function — not a decoration layer.',
    valueStatement: 'We build interfaces that convert, retain, and impress the users that matter most.',
    services: [
      'UX audit and conversion-focused redesign',
      'Design system creation and documentation',
      'User testing and iterative refinement',
      'Design-to-development handoff and implementation',
    ],
    closingAction: 'turn your design into a growth lever',
  },
  general_tech: {
    headline: 'How Codenix Labs Helps You Stay Ahead',
    body: "At Codenix Labs, we build for where the industry is going — not where it's been.",
    valueStatement: 'We help forward-thinking teams adopt new approaches fast, without the trial-and-error tax.',
    services: [
      'Technology strategy and stack consulting',
      'Rapid prototyping and proof-of-concept builds',
      'Custom software development and integration',
      'Ongoing technical partnership and support',
    ],
    closingAction: 'get ahead of the curve',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLE MICRO-VARIANTS — one randomly injected per generation
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_VARIANTS = [
  'Use a rhetorical question as one of your section h2 headings.',
  'Include one standalone 3–4 word sentence as its own paragraph for emphasis.',
  'In exactly one section, use a numbered list (ol/li) instead of bullet points.',
  'Add one standalone bold paragraph that works as a pull-quote — make it memorable.',
  'Address the reader directly as "you" in the opening sentence of one section.',
  'Open one section with a one-sentence counterpoint, then immediately resolve it in the next line.',
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function selectLayout(topicBucket) {
  const variants = LAYOUT_TEMPLATES[topicBucket] || LAYOUT_TEMPLATES.general_tech;
  return variants[Math.floor(Math.random() * variants.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildCTAHtml(cta) {
  return `<h2>🤝 ${cta.headline}</h2>
<p>${cta.body}</p>
<p>${cta.valueStatement}</p>
<ul>
${cta.services.map((s) => `<li>${s}</li>`).join('\n')}
</ul>
<p>So your business doesn't just move faster — it moves smarter.</p>
<hr/>
<p><strong>Ready to ${cta.closingAction}?</strong></p>
<p>👉 Let's build it together — <strong>Codenix Labs.</strong></p>`;
}

function buildPrompts({ topic, category, topicBucket, layout, angleData, styleVariant }) {
  const cta = CTA_TEMPLATES[topicBucket] || CTA_TEMPLATES.general_tech;
  const ctaHtml = buildCTAHtml(cta);

  const angleInstruction = angleData?.instruction ?? '';
  const hookModifier = angleData?.hookModifier
    ?? 'Open with the single most important or surprising thing about this topic. Make it punchy. No definitions yet.';

  const tableRule = layout.needsComparisonTable
    ? `COMPARISON TABLE — include exactly one table. ${layout.comparisonTableHint ?? ''}
   Format:
   <table border="1" cellpadding="12" cellspacing="0" style="width:100%;border-collapse:collapse;">
   <tr><th>Dimension</th><th>Option A</th><th>Option B</th></tr>
   <tr><td>...</td><td>...</td><td>...</td></tr>
   </table>`
    : `COMPARISON TABLE — do NOT include a comparison table. It does not fit this topic naturally. Skip it entirely.`;

  const avbRule = layout.needsAvB
    ? `A vs B SECTION — include the "${layout.avbLabel}" section as specified in the section plan. Write at least 6 substantial paragraphs. ${layout.avbHint ?? ''} Use <strong> for names/labels. End with: <p><strong>The result?</strong> [conclusion]</p>`
    : `A vs B SECTION — do NOT include any "Company A vs Company B" or side-by-side comparison narrative. It does not fit this topic. Follow the section plan as written.`;

  const systemPrompt = `You are an expert blog writer for Codenix Labs, a software development agency that serves international clients.

Tone: punchy, direct, founder-to-founder. Short sentences. Big ideas. No corporate filler.
${angleInstruction ? `\n${angleInstruction}\n` : ''}
━━━ HTML RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARAGRAPHS — keep short. 1–3 lines max. Never write walls of text.
  ✓ <p>Most teams use AI wrong.</p><p>They buy tools. Not systems.</p>
  ✗ <p>Most teams use AI wrong because they focus on buying individual tools rather than thinking about how to build integrated systems that...</p>

SECTION DIVIDERS — use <hr/> between every major section. No exceptions.

H2 HEADINGS — every h2 must open with a contextually relevant emoji.
  ✓ <h2>🚀 Why This Changes Everything</h2>
  ✗ <h2>Why This Changes Everything</h2>

HOOK — ${hookModifier}

BOLD CALLOUTS — use standalone bold paragraphs for statements that deserve to stand alone.
  <p><strong>This isn't a feature update. It's a category shift.</strong></p>

${tableRule}

${avbRule}

CTA — end the blog with EXACTLY this HTML block. Do not paraphrase or modify it:
${ctaHtml}

LENGTH — 900–1100 words. Don't pad. Don't cut short.

STYLE VARIATION — apply this technique to make the post feel distinct: ${styleVariant}

ALLOWED HTML TAGS: h2, p, ul, ol, li, table, tr, th, td, hr, strong.
No h1. No h3. No markdown. No code fences. No inline styles except on table tags.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No markdown. No code blocks. No text before or after the JSON.`;

  const userPrompt = `Write a high-quality SEO blog post for Codenix Labs.

Topic: ${topic}
Category: ${category}
Topic type: ${topicBucket}

Follow this section plan exactly — in this order, with these headings:
${layout.sections}

The CTA section must use the exact HTML provided in the system prompt. Do not rewrite it.

Return this exact JSON:
{
  "title": "Specific, compelling title — include the exact topic name and a power word or number",
  "slug": "url-friendly-slug-no-spaces",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "excerpt": "Two punchy sentences. First makes the problem vivid. Second promises a solution.",
  "content": "FULL HTML content — 900 to 1100 words",
  "seo": {
    "metaTitle": "Under 60 characters — include topic name",
    "metaDescription": "Under 155 characters — state the benefit, include a CTA",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
}`;

  return { systemPrompt, userPrompt };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// API shape is identical to the original — no breaking changes.
// ─────────────────────────────────────────────────────────────────────────────

export const generateBlogWithGemini = async (topic, category, angle = null) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('GROQ_API_KEY is not set in environment variables');

  const REQUEST_TIMEOUT = 60000;

  // Classify the topic
  const topicBucket = detectTopicBucket(topic, category);

  // Pick a random layout variant for this bucket
  const layout = selectLayout(topicBucket);

  // Resolve angle config
  const angleData = angle && ANGLE_DEFINITIONS[angle] ? ANGLE_DEFINITIONS[angle] : null;
  const temperature = angleData?.temperature ?? 0.80;

  // Pick a style micro-variant
  const styleVariant = STYLE_VARIANTS[Math.floor(Math.random() * STYLE_VARIANTS.length)];

  // Build the prompts
  const { systemPrompt, userPrompt } = buildPrompts({
    topic,
    category,
    topicBucket,
    layout,
    angleData,
    styleVariant,
  });

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout after 60s')), REQUEST_TIMEOUT)
    );

    const fetchPromise = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message) {
      throw new Error('Invalid response structure from Groq API');
    }

    const textContent = data.choices[0].message.content;

    let blogData;
    try {
      blogData = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\{[\s\S]*\}(?=\s*$)/);
      if (jsonMatch) {
        blogData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Groq response as JSON');
      }
    }

    if (!blogData.title || !blogData.slug || !blogData.content || !blogData.excerpt) {
      throw new Error('Generated blog data is missing required fields');
    }

    // Attach generation metadata — useful for debugging, analytics, and A/B testing
    blogData._meta = {
      topicBucket,
      layoutId: layout.id,
      angle: angle ?? 'default',
      styleVariant,
    };

    return blogData;

  } catch (error) {
    console.error('Blog generation error:', error);
    throw error;
  }
};