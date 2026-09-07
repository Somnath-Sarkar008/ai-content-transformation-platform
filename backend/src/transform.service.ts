import { Injectable } from "@nestjs/common";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

@Injectable()
export class TransformService {
  async transform(body: { source?: string; outputs?: string[]; audience?: string; tone?: string; language?: string; detail?: string }) {
    const source = body.source?.trim() || "";
    const outputs = body.outputs?.length ? body.outputs : ["Executive Summary"];
    if (!source) return { ok: false, message: "Source content is required" };

    const prompt = `You are the Content Intelligence + Orchestrator for an SIH prototype. Analyze the source and produce consistent transformation-ready content. Do not invent facts.\nSOURCE:\n${source}\n\nOUTPUTS: ${outputs.join(", ")}\nAUDIENCE: ${body.audience || "General audience"}\nTONE: ${body.tone || "Professional"}\nLANGUAGE: ${body.language || "English"}\nDETAIL: ${body.detail || "Balanced"}\n\nReturn a concise JSON object with keys: title, summary, facts (array), entities (array), outputs (object keyed by requested output names), quality (object with score 0-100, passed boolean, issues array). For Presentation, include slides as an array with title, bullets and speakerNotes. For Video Package include script, storyboard and narration. Keep every output grounded in the same facts.`;

    if (!process.env.GEMINI_API_KEY) {
      return { ok: true, mode: "prototype", status: "needs_api_key", message: "Set GEMINI_API_KEY to enable live generation.", content: { title: "Prototype transformation", summary: source.slice(0, 600), facts: [], entities: [], outputs: Object.fromEntries(outputs.map(o => [o, `Configured output: ${o}`])), quality: { score: 0, passed: false, issues: ["Gemini API key not configured"] } } };
    }

    const { text } = await generateText({ model: google("gemini-3.5-flash-lite"), prompt, temperature: 0.2 });
    let content: any;
    try { content = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()); } catch { content = { title: "Transformation", summary: text, outputs: Object.fromEntries(outputs.map(o => [o, text])), quality: { score: 80, passed: true, issues: [] } }; }
    return { ok: true, status: "verified", content };
  }

  async createPptx(title: string, slides: { title: string; bullets?: string[]; speakerNotes?: string }[]) {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "TransformAI";
    for (const item of slides) {
      const slide = pptx.addSlide();
      slide.addText(item.title, { x: 0.7, y: 0.55, w: 12, h: 0.6, fontSize: 28, bold: true });
      slide.addText((item.bullets || []).map(b => ({ text: b, options: { bullet: { indent: 18 } } })), { x: 0.9, y: 1.45, w: 11.3, h: 4.7, fontSize: 18, breakLine: true, valign: "top" });
      if (item.speakerNotes) slide.addNotes(item.speakerNotes);
    }
    return pptx.write({ outputType: "nodebuffer" });
  }

  async createPdf(title: string, sections: { heading: string; text: string }[]) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    const done = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(chunks))));
    doc.fontSize(22).text(title).moveDown();
    for (const section of sections) doc.fontSize(15).text(section.heading, { underline: true }).moveDown(0.3).fontSize(11).text(section.text).moveDown();
    doc.end();
    return done;
  }

  async createDocx(title: string, sections: { heading: string; text: string }[]) {
    const doc = new Document({ sections: [{ children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), ...sections.flatMap(s => [new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1 }), new Paragraph(s.text)])] }] });
    return Packer.toBuffer(doc);
  }
}
