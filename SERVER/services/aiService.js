const ANGLE_INSTRUCTIONS = {
  contrarian: {
    instruction: `WRITING ANGLE — CONTRARIAN: Challenge conventional wisdom. Start with what most people believe, then flip it entirely. Be provocative but logical. Use phrases like "Everyone says X. They're wrong." Make bold counter-claims backed by solid reasoning. Every section should feel like you're dismantling a popular belief.`,
    hookPattern: `Open with a confident myth-busting statement (1 punchy line). Then 2 short lines on why everyone believes the myth. Then the flip — the uncomfortable truth. End with a bold claim that makes the reader question everything they thought they knew.`,
    sectionOrder: `
1. Hook — start with "Everyone believes X. They're wrong." (no heading)
2. 🚫 The Myth Everyone Believes (emoji h2) — explain what people wrongly assume and why it's so widespread
3. 🔍 Why That's Backwards (emoji h2) — dismantle the conventional approach with logic
4. ✅ What Actually Works (emoji h2, ul/li) — the counter-intuitive solution
5. Comparison table (emoji h2)
6. 🔄 When Playing It Safe Backfired: Two Companies Compared (emoji h2) — Company A did the "obvious" thing and paid the price. Company B did the opposite and won.
7. 🎯 The Contrarian Playbook for Your Business (emoji h2)
8. 🤔 But Wait — Common Objections Answered (emoji h2)
9. CodenixLabs CTA`,
    avbLabel: `🔄 When Playing It Safe Backfired: Two Companies Compared`,
  },

  datadriven: {
    instruction: `WRITING ANGLE — DATA-DRIVEN: Ground every claim in numbers, research, or industry data. Reference stats naturally ("companies that do X see 3x ROI", "73% of businesses report..."). Structure arguments as evidence chains — claim, stat, implication. Never make an assertion without backing it up with a number or study reference.`,
    hookPattern: `Open with a shocking, specific statistic (make it feel real and sourced). Then a question that makes it personal to the reader. Then what the data actually reveals vs. what most people assume. End with the key number or finding the whole post will unpack.`,
    sectionOrder: `
1. Hook — open with a surprising stat (no heading)
2. 📊 What the Data Actually Shows (emoji h2) — define the topic through numbers and research
3. 📉 The Cost of Getting This Wrong (emoji h2) — quantify the problem with stats
4. 📈 The Metrics That Matter (emoji h2, ul/li) — key KPIs and benchmarks
5. Comparison table (emoji h2)
6. 📊 The Numbers Don't Lie: Two Approaches Compared (emoji h2) — Company A's metrics vs Company B's results, told through data
7. 💡 What This Means for Your Bottom Line (emoji h2)
8. ⚠️ Data Pitfalls to Avoid (emoji h2)
9. CodenixLabs CTA`,
    avbLabel: `📊 The Numbers Don't Lie: Two Approaches Compared`,
  },

  storytelling: {
    instruction: `WRITING ANGLE — STORYTELLING: Lead with a vivid founder story or customer scenario. The hook is a micro-story, not a statement. Every concept is explained through a real-world character's journey. The A vs B section is a full narrative arc with conflict, turning point, and resolution. Make readers feel like they're watching real people, not reading a blog.`,
    hookPattern: `Open mid-scene with a character in a specific moment of pressure or failure (time, place, problem — e.g. "It was 11pm. Ravi's dashboard showed zero conversions again."). No abstractions. No definitions. Just story. Then zoom out to show this is a universal problem. Then promise the reader will know how to avoid it.`,
    sectionOrder: `
1. Hook — open mid-scene with a character under pressure (no heading)
2. 🎭 Why This Story Keeps Repeating (emoji h2) — connect the story to the broader problem
3. 💡 The Discovery That Changed Everything (emoji h2) — introduce the solution through the character's journey
4. 🛠️ How It Actually Works (emoji h2, ul/li) — the mechanics, told through the story lens
5. Comparison table (emoji h2)
6. 🎭 Two Founders, One Problem, Opposite Outcomes (emoji h2) — full narrative arc: setup, conflict, turning point, resolution for BOTH characters
7. 📖 What Their Stories Teach Your Business (emoji h2)
8. 🚧 The Plot Twists to Watch For (emoji h2)
9. CodenixLabs CTA`,
    avbLabel: `🎭 Two Founders, One Problem, Opposite Outcomes`,
  },

  beginner: {
    instruction: `WRITING ANGLE — BEGINNER'S GUIDE: Assume zero prior knowledge. Define every technical term on first use in plain language. Use simple analogies (compare complex concepts to everyday things). Break down ideas into numbered steps where possible. The tone is warm, encouraging, and clear — like a patient mentor, not a lecturer. Never use jargon without immediately explaining it.`,
    hookPattern: `Open with a relatable frustration or confusion the reader probably feels ("If you've ever Googled X and felt more confused after..."). Make them feel seen and not alone. Then promise: by the end of this post, they'll fully understand and know what to do next. Keep it warm and encouraging.`,
    sectionOrder: `
1. Hook — open with a relatable "I was confused too" moment (no heading)
2. 🧩 Let's Start From Scratch: What Is This, Really? (emoji h2) — plain-language definition with a simple analogy
3. 🤷 Why Should You Even Care? (emoji h2) — explain the real-world impact in simple terms
4. 📋 Step-by-Step: How It Actually Works (emoji h2, numbered ul/li)
5. Comparison table (emoji h2)
6. 👀 Let's Make This Real: Meet Sarah and Mike (emoji h2) — Sarah tried to figure it out alone and struggled; Mike used the right approach and thrived. Keep it simple and relatable.
7. 🧭 So What Should YOU Do? (emoji h2)
8. 😅 Common Beginner Mistakes to Skip (emoji h2)
9. CodenixLabs CTA`,
    avbLabel: `👀 Let's Make This Real: Meet Sarah and Mike`,
  },

  futurist: {
    instruction: `WRITING ANGLE — BOLD & FUTURIST: Write like it's 2 years from now looking back at this turning point. Make specific, confident predictions ("By 2026, businesses that haven't adopted X will lose Y% of market share"). Use forward-looking language throughout. Be decisive about trends. End every major section with what's at stake for businesses that act vs. those that don't.`,
    hookPattern: `Open with a specific prediction for 2026 or 2027. Make it bold and concrete, not vague. Then show early signs that it's already starting NOW. Then frame the reader's choice: adapt early and win, or wait and scramble. Create urgency without panic.`,
    sectionOrder: `
1. Hook — open with a bold specific future prediction (no heading)
2. 🔮 Where This Is All Heading (emoji h2) — the macro trend and why it's accelerating
3. ⚡ Why the Window Is Closing (emoji h2) — the cost of waiting, framed as a future retrospective
4. 🚀 The Tools Leading This Shift (emoji h2, ul/li)
5. Comparison table (emoji h2)
6. 🔮 2024 vs 2026: Two Business Timelines (emoji h2) — Company A ignored the trend; Company B moved early. Show what their worlds look like in 2026.
7. 📡 What Early Adopters Are Already Doing (emoji h2)
8. 🧱 The Obstacles Standing in Your Way (emoji h2)
9. CodenixLabs CTA`,
    avbLabel: `🔮 2024 vs 2026: Two Business Timelines`,
  },
};

const STYLE_VARIANTS = [
  "Use a rhetorical question as one of your h2 section headings.",
  "Include one 3-word sentence as its own standalone paragraph for maximum impact.",
  "In one section, use a numbered list (1. 2. 3.) instead of bullet points for variety.",
  "Add one bold standalone callout paragraph that could work as a pull-quote.",
  "Start one section with a one-sentence paragraph that directly addresses 'you', the reader.",
];

const ANGLE_TEMPERATURES = {
  contrarian: 0.95,
  storytelling: 0.92,
  futurist: 0.90,
  beginner: 0.75,
  datadriven: 0.70,
};

export const generateBlogWithGemini = async (topic, category, angle = null) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('GROQ_API_KEY is not set in environment variables');

  const REQUEST_TIMEOUT = 60000;

  const angleData = angle && ANGLE_INSTRUCTIONS[angle] ? ANGLE_INSTRUCTIONS[angle] : null;
  const angleInstruction = angleData?.instruction ?? '';
  const hookPattern = angleData?.hookPattern ?? `Problem → Bigger problem → Twist → Bold claim. Each on its own short paragraph.`;
  const avbLabel = angleData?.avbLabel ?? `📊 Real-World Example: Company A vs Company B`;
  const temperature = angle ? (ANGLE_TEMPERATURES[angle] ?? 0.85) : 0.72;

  const randomVariant = STYLE_VARIANTS[Math.floor(Math.random() * STYLE_VARIANTS.length)];

  const sectionOrder = angleData?.sectionOrder ?? `
1. Hook (4-5 short punchy paragraphs, no heading)
2. What is [topic] (with emoji h2)
3. Why it matters / The problem with old approach (with emoji h2)
4. Key features or breakdown (with emoji h2, use ul/li)
5. Comparison table (with emoji h2)
6. Real-world A vs B example — make this DETAILED, at least 6-8 paragraphs (with emoji h2)
7. What this means for your business (with emoji h2)
8. Challenges or things to watch out for (with emoji h2)
9. CodenixLabs CTA section`;

  const systemPrompt = `You are an expert blog writer for Codenix Labs, a software development agency.

You write in a punchy, direct, founder-to-founder tone. Short sentences. Big ideas.
${angleInstruction ? `\n${angleInstruction}\n` : ''}
STRICT HTML RULES — follow these exactly:

1. PARAGRAPH STYLE — keep paragraphs short (1-3 lines). Never write walls of text.
   Good: <p>Most businesses use AI wrong.</p><p>They buy tools. Not systems.</p>
   Bad: <p>Most businesses use AI wrong and they buy tools instead of systems which causes them to...</p>

2. SECTION DIVIDERS — always use <hr/> between sections. No exceptions.

3. H2 HEADINGS — every h2 must start with a relevant emoji.
   Good: <h2>🚀 Why This Changes Everything</h2>
   Bad: <h2>Why This Changes Everything</h2>

4. HOOK — follow this exact hook pattern for this angle:
   ${hookPattern}

5. BOLD CALLOUTS — use standalone bold paragraphs for key statements.
   <p><strong>This is not just a trend. It's a shift.</strong></p>

6. COMPARISON TABLE — must use this exact format:
   <table border="1" cellpadding="12" cellspacing="0" style="width:100%;border-collapse:collapse;">
   <tr><th>Feature</th><th>Option A</th><th>Option B</th></tr>
   <tr><td>Speed</td><td>Slow</td><td>Fast</td></tr>
   </table>

7. A vs B EXAMPLE — this must be a detailed story, not one sentence. Use this EXACT heading label:
   <h2>${avbLabel}</h2>
   Then write at least 6-8 paragraphs exploring both sides in depth. Use <strong> for company/character names.
   End with: <p><strong>The result?</strong> [Dramatic comparison conclusion]</p>

8. CODENIXLABS CTA — end with exactly this format:
   <h2>🤝 How Codenix Labs Helps</h2>
   <p>At Codenix Labs, we don't just give you tools.</p>
   <p>We build complete systems that [relevant outcome].</p>
   <ul>
   <li>[Service 1 relevant to topic]</li>
   <li>[Service 2 relevant to topic]</li>
   <li>[Service 3 relevant to topic]</li>
   <li>[Service 4 relevant to topic]</li>
   </ul>
   <p>So your business doesn't just work faster — it works smarter.</p>
   <hr/>
   <p><strong>Ready to [topic-relevant action]?</strong></p>
   <p>👉 Let's build it together with Codenix Labs.</p>

9. LENGTH — minimum 900 words of content. Aim for 1000-1100 words. Do NOT cut short.

10. STYLE VARIATION — apply this to make the post feel unique: ${randomVariant}

11. ALLOWED TAGS ONLY: h2, p, ul, li, table, tr, th, td, hr, strong. No h1. No h3 except inside numbered example sections. No markdown.

Return ONLY valid JSON. No markdown. No code blocks. No explanation.`;

  const userPrompt = `Write a detailed, high-quality SEO blog post for Codenix Labs.

Topic: ${topic}
Category: ${category}

Follow this EXACT section order for this angle:
${sectionOrder}

The A vs B section heading must be exactly: "${avbLabel}"

Return this exact JSON:
{
  "title": "attention-grabbing title with a power word or number",
  "slug": "url-friendly-slug-here",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "excerpt": "Two punchy sentences that make someone stop scrolling and want to read more.",
  "content": "FULL HTML content here — minimum 900 words",
  "seo": {
    "metaTitle": "SEO title under 60 characters",
    "metaDescription": "Compelling meta description under 155 characters with a call to action",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
}`;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );

    const response = await Promise.race([
      fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      }),
      timeoutPromise,
    ]);

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

    return blogData;

  } catch (error) {
    console.error('Error generating blog:', error);
    throw error;
  }
};