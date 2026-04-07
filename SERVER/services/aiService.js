const ANGLE_INSTRUCTIONS = {
  contrarian: `WRITING ANGLE — CONTRARIAN: Challenge the conventional wisdom about this topic. Start with what most people believe, then flip it. Be provocative but logical. Use phrases like "Everyone says X. They're wrong." Make bold counter-claims backed by reasoning.`,
  datadriven: `WRITING ANGLE — DATA-DRIVEN: Ground every claim in numbers, research, or industry data. Reference stats naturally ("companies that do X see 3x ROI"). Structure arguments as evidence chains. The hook should open with a surprising statistic.`,
  storytelling: `WRITING ANGLE — STORYTELLING: Lead with a vivid founder story or customer scenario. The hook is a micro-story, not a statement. Every concept is explained through a real-world character's journey. The A vs B section is a full narrative arc.`,
  beginner: `WRITING ANGLE — BEGINNER'S GUIDE: Assume zero prior knowledge. Define every term on first use. Use simple analogies. Break down complex ideas into numbered steps. The tone is encouraging and clear — like a mentor, not a lecturer.`,
  futurist: `WRITING ANGLE — BOLD & FUTURIST: Write like it's 2 years from now looking back. Make specific predictions. Use phrases like "By 2026..." or "The businesses that don't adapt will...". Be confident about trends. End sections with forward-looking stakes.`,
};

export const generateBlogWithGemini = async (topic, category, angle = null) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('GROQ_API_KEY is not set in environment variables');

  const REQUEST_TIMEOUT = 60000;

   const angleInstruction = angle && ANGLE_INSTRUCTIONS[angle]
    ? `\n\n${ANGLE_INSTRUCTIONS[angle]}`
    : '';

  const systemPrompt = `You are an expert blog writer for Codenix Labs, a software development agency.

You write in a punchy, direct, founder-to-founder tone. Short sentences. Big ideas.

STRICT HTML RULES — follow these exactly:

1. PARAGRAPH STYLE — keep paragraphs short (1-3 lines). Never write walls of text.
   Good: <p>Most businesses use AI wrong.</p><p>They buy tools. Not systems.</p>
   Bad: <p>Most businesses use AI wrong and they buy tools instead of systems which causes them to...</p>

2. SECTION DIVIDERS — always use <hr/> between sections. No exceptions.

3. H2 HEADINGS — every h2 must start with a relevant emoji.
   Good: <h2>🚀 Why This Changes Everything</h2>
   Bad: <h2>Why This Changes Everything</h2>

4. HOOK — first 3-4 paragraphs must be punchy and grab attention. Use line breaks between short statements.
   Pattern: Problem → Bigger problem → Twist → Bold claim

5. BOLD CALLOUTS — use standalone bold paragraphs for key statements.
   <p><strong>This is not just a trend. It's a shift.</strong></p>

6. COMPARISON TABLE — must use this exact format:
   <table border="1" cellpadding="12" cellspacing="0" style="width:100%;border-collapse:collapse;">
   <tr><th>Feature</th><th>Option A</th><th>Option B</th></tr>
   <tr><td>Speed</td><td>Slow</td><td>Fast</td></tr>
   </table>

7. A vs B EXAMPLE — this must be a detailed story, not one sentence. Use this structure:
   <h2>📊 Real-World Example: Company A vs Company B</h2>
   <p><strong>Company A</strong> — [describe how they do things the old way, what problems they face, what results they get]</p>
   <p>[2-3 more sentences expanding the struggle]</p>
   <p><strong>Company B</strong> — [describe how they do things the smart way, what systems they use]</p>
   <p>[2-3 more sentences showing results and growth]</p>
   <p><strong>The result?</strong> [Dramatic comparison conclusion]</p>

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

10. ALLOWED TAGS ONLY: h2, p, ul, li, table, tr, th, td, hr, strong. No h1. No h3 except inside numbered example sections. No markdown.

Return ONLY valid JSON. No markdown. No code blocks. No explanation.
${angleInstruction}`;

  const userPrompt = `Write a detailed, high-quality SEO blog post for Codenix Labs.

Topic: ${topic}
Category: ${category}

Required sections (in this order):
1. Hook (4-5 short punchy paragraphs, no heading)
2. What is [topic] (with emoji h2)
3. Why it matters / The problem with old approach (with emoji h2)
4. Key features or breakdown (with emoji h2, use ul/li)
5. Comparison table (with emoji h2)
6. Real-world A vs B example — make this DETAILED, at least 6-8 paragraphs (with emoji h2)
7. What this means for your business (with emoji h2)
8. Challenges or things to watch out for (with emoji h2)
9. CodenixLabs CTA section (follow the exact format from rules)

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

    const temperature = angle ? 0.85 : 0.72;
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
          temperature: temperature,
          max_tokens: 4096, // llama-3.3-70b supports this — needed for 1000+ word blogs
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