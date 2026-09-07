import { Injectable } from "@nestjs/common";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

@Injectable()
export class TransformService {
  async transform(body: { source?: string; outputs?: string[]; audience?: string; tone?: string; language?: string; detail?: string; research?: boolean; model?: string; verify?: boolean }) {
    const source = body.source?.trim() || "";
    const outputs = body.outputs?.length ? body.outputs : ["Executive Summary"];
    if (!source) return { ok: false, message: "Source content is required" };
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return { ok: false, status: "needs_api_key", message: "GEMINI_API_KEY is not available to the NestJS process." };

    const google = createGoogleGenerativeAI({ apiKey });
    const model = body.model || "gemini-2.5-flash-lite";
    let researchSources: Array<{ title: string; url: string; snippet: string; score?: number }> = [];
    let researchAnswer = "";
    if (body.research && process.env.TAVILY_API_KEY?.trim()) {
      try {
        const rr = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: source.slice(0, 500), search_depth: "advanced", max_results: 5, include_answer: true }) });
        if (rr.ok) {
          const rd: any = await rr.json();
          researchAnswer = rd.answer || "";
          researchSources = (rd.results || []).map((r: any) => ({ title: r.title || "Untitled source", url: r.url || "", snippet: r.content || "", score: r.score })).filter((r: any) => r.url);
        }
      } catch (researchError) { console.warn("Research pass unavailable:", researchError); }
    }

    const evidence = researchSources.length ? `\n\nRESEARCH EVIDENCE (use only as supporting context; preserve source URLs):\n${researchAnswer}\n${researchSources.map(r => `- ${r.title}: ${r.snippet}\n  URL: ${r.url}`).join("\n")}` : "";
    const workingSource = `${source.slice(0, 60000)}${evidence}`;
    const prompt = `You are the Content Intelligence + Orchestrator for an SIH prototype. Analyze the source and produce consistent transformation-ready content. Do not invent facts. If research evidence is present, distinguish it from the original source and cite it in research_sources.
SOURCE:
${workingSource}

OUTPUTS: ${outputs.join(", ")}
AUDIENCE: ${body.audience || "General audience"}
TONE: ${body.tone || "Professional"}
LANGUAGE: ${body.language || "English"}
DETAIL: ${body.detail || "Balanced"}

Return ONLY a JSON object with keys: title, summary, facts (array of objects with id,text), entities (array of objects with name,description), outputs (object keyed by requested output names), research_sources (array of objects with title,url,snippet,score), quality (object with score 0-100, passed boolean, issues array). For Presentation, include slides as an array with title, bullets and speakerNotes. For Video Package include script, narration, storyboard (scene, visual, narration), subtitle_text and visual_recommendations. For Infographic include title, key_points and visual_elements_suggestion. Keep every output grounded in the same facts. Never omit a requested output.`;

    try {
      const { text } = await generateText({ model: google(model), prompt, temperature: 0.2 });
      let content: any;
      try { content = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()); }
      catch { content = { title: "Transformation", summary: text, facts: [], entities: [], outputs: Object.fromEntries(outputs.map(o => [o, text])), research_sources: researchSources, quality: { score: 70, passed: false, issues: ["Model returned text instead of strict JSON; normalized by the prototype parser."] } }; }

      if (!Array.isArray(content.research_sources) || !content.research_sources.length) content.research_sources = researchSources;
      const issues: string[] = Array.isArray(content.quality?.issues) ? [...content.quality.issues] : [];
      const generated = content.outputs && typeof content.outputs === "object" ? content.outputs : {};
      const missing = outputs.filter((name) => !generated[name] || (typeof generated[name] === "string" && !generated[name].trim()));
      if (missing.length) issues.push(`Missing requested outputs: ${missing.join(", ")}`);
      if (!content.title || !String(content.title).trim()) issues.push("Missing transformation title.");
      if (!content.summary || !String(content.summary).trim()) issues.push("Missing transformation summary.");

      let guardian: { score?: number; passed?: boolean; issues?: string[] } = {};
      if (body.verify !== false) {
        try {
          const verificationPrompt = `You are the Quality Guardian. Verify generated content against the ORIGINAL SOURCE and clearly marked RESEARCH EVIDENCE. Do not rewrite it. Flag only material unsupported claims, contradictions, missing requested outputs, or obvious format failures. Research claims are acceptable only when supported by the provided research URLs. Return ONLY JSON: {"score":0-100,"passed":true|false,"issues":["..."]}.
ORIGINAL SOURCE:
${source.slice(0, 45000)}
RESEARCH EVIDENCE:
${evidence.slice(0, 12000)}
REQUESTED OUTPUTS: ${outputs.join(", ")}
GENERATED:
${JSON.stringify(content).slice(0, 50000)}`;
          const { text: verificationText } = await generateText({ model: google(model), prompt: verificationPrompt, temperature: 0 });
          guardian = JSON.parse(verificationText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
          if (Array.isArray(guardian.issues)) issues.push(...guardian.issues);
        } catch (verificationError) { console.warn("Quality Guardian pass unavailable:", verificationError); }
      }

      const uniqueIssues = [...new Set(issues.filter(Boolean))];
      const passed = uniqueIssues.length === 0 && guardian.passed !== false;
      const modelScore = Number(content.quality?.score);
      const guardianScore = Number(guardian.score);
      const baseScore = Number.isFinite(guardianScore) ? guardianScore : (Number.isFinite(modelScore) ? modelScore : 70);
      const score = Math.max(0, Math.min(100, Math.round(baseScore)));
      content.quality = { score: passed ? score : Math.min(score, 69), passed, issues: uniqueIssues };
      return { ok: true, status: passed ? "verified" : "review_required", content, guardian: { enabled: body.verify !== false, score: guardian.score ?? null, issues: guardian.issues ?? [] } };
    } catch (error) {
      console.error("Gemini generation failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, status: "generation_failed", message: `Gemini generation failed: ${message}` };
    }
  }

  async createPptx(title: string, slides: { title: string; bullets?: string[]; speakerNotes?: string }[]) {
    const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE"; pptx.author = "TransformAI";
    for (const item of slides) { const slide = pptx.addSlide(); slide.addText(item.title, { x: 0.7, y: 0.55, w: 12, h: 0.6, fontSize: 28, bold: true }); slide.addText((item.bullets || []).map(b => ({ text: b, options: { bullet: { indent: 18 } } })), { x: 0.9, y: 1.45, w: 11.3, h: 4.7, fontSize: 18, breakLine: true, valign: "top" }); if (item.speakerNotes) slide.addNotes(item.speakerNotes); }
    return pptx.write({ outputType: "nodebuffer" });
  }

  async createPdf(title: string, sections: { heading: string; text: string }[]) {
    const doc = new PDFDocument({ margin: 50 }); const chunks: Buffer[] = []; doc.on("data", (chunk: Buffer) => chunks.push(chunk)); const done = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(chunks))));
    doc.fontSize(22).text(title).moveDown(); for (const section of sections) doc.fontSize(15).text(section.heading, { underline: true }).moveDown(0.3).fontSize(11).text(section.text).moveDown(); doc.end(); return done;
  }

  async createDocx(title: string, sections: { heading: string; text: string }[]) {
    const doc = new Document({ sections: [{ children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), ...sections.flatMap(s => [new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1 }), new Paragraph(s.text)])] }] });
    return Packer.toBuffer(doc);
  }
}
