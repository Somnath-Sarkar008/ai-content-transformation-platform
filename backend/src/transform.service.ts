import { Injectable } from "@nestjs/common";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { AgentOrchestratorService } from "./agents/agent-orchestrator.service";

@Injectable()
export class TransformService {
  constructor(private readonly agentOrchestrator: AgentOrchestratorService) {}

  async transform(body: { source?: string; outputs?: string[]; audience?: string; tone?: string; language?: string; detail?: string; research?: boolean; researchEvidence?: string; researchSources?: Array<{title:string;url:string;snippet:string;score?:number}>; model?: string; verify?: boolean }) {
    const source = body.source?.trim() || "";
    const outputs = body.outputs?.length ? body.outputs : ["Executive Summary"];
    if (!source) return { ok: false, message: "Source content is required" };
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return { ok: false, status: "needs_api_key", message: "GEMINI_API_KEY is not available to the NestJS process." };
    const google = createGoogleGenerativeAI({ apiKey });
    const model = body.model || "gemini-2.5-flash-lite";

    let researchSources = body.researchSources || [];
    let researchAnswer = body.researchEvidence || "";
    if (body.research && !body.researchEvidence && process.env.TAVILY_API_KEY?.trim()) {
      try {
        const rr = await fetch("https://api.tavily.com/search", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ api_key:process.env.TAVILY_API_KEY, query:source.slice(0,500), search_depth:"advanced", max_results:5, include_answer:true }) });
        if (rr.ok) { const rd:any=await rr.json(); researchAnswer=rd.answer||""; researchSources=(rd.results||[]).map((r:any)=>({title:r.title||"Untitled source",url:r.url||"",snippet:r.content||"",score:r.score})).filter((r:any)=>r.url); }
      } catch (e) { console.warn("Research pass unavailable:",e); }
    }
    const evidence = researchSources.length || researchAnswer ? `\n\nRESEARCH EVIDENCE (supporting context only):\n${researchAnswer}\n${researchSources.map(r=>`- ${r.title}: ${r.snippet}\n  URL: ${r.url}`).join("\n")}` : "";
    const workingSource = `${source.slice(0,60000)}${evidence}`;

    try {
      const base = await this.buildIntelligence(google, model, workingSource, outputs, body);
      const agentResult = await this.agentOrchestrator.run({ source: workingSource, title:base.title, summary:base.summary, facts:base.facts, entities:base.entities, audience:body.audience, tone:body.tone, language:body.language, detail:body.detail }, outputs, model);
      const content:any = { ...base, outputs: { ...base.outputs, ...agentResult.outputs }, research_sources:researchSources, agents:agentResult.agents, quality:{score:100,passed:true,issues:[]} };
      const issues:string[]=[];
      const missing=outputs.filter(name=>!content.outputs[name] || (typeof content.outputs[name]==="string"&&!content.outputs[name].trim()));
      if(missing.length) issues.push(`Missing requested outputs: ${missing.join(", ")}`);
      let guardian:any={};
      if(body.verify!==false){
        try{
          const p=`You are the Quality Guardian. Verify generated content against ORIGINAL SOURCE and RESEARCH EVIDENCE. Flag only material unsupported claims, contradictions, missing requested outputs, or obvious format failures. Return ONLY JSON {"score":0-100,"passed":true|false,"issues":["..."]}.\nORIGINAL SOURCE:\n${source.slice(0,45000)}\nRESEARCH:\n${evidence.slice(0,12000)}\nREQUESTED:${outputs.join(", ")}\nGENERATED:\n${JSON.stringify(content).slice(0,50000)}`;
          const {text}=await generateText({model:google(model),prompt:p,temperature:0}); guardian=JSON.parse(text.replace(/^```json\s*/i,"").replace(/```$/i,"").trim()); if(Array.isArray(guardian.issues)) issues.push(...guardian.issues);
        }catch(e){console.warn("Quality Guardian pass unavailable:",e);}
      }
      const unique=[...new Set(issues.filter(Boolean))]; const passed=unique.length===0&&guardian.passed!==false; const score=Math.max(0,Math.min(100,Math.round(Number.isFinite(Number(guardian.score))?Number(guardian.score):100)));
      content.quality={score:passed?score:Math.min(score,69),passed,issues:unique};
      return {ok:true,status:passed?"verified":"review_required",content,guardian:{enabled:body.verify!==false,score:guardian.score??null,issues:guardian.issues??[]}};
    }catch(error){const message=error instanceof Error?error.message:String(error);console.error("Transformation failed:",error);return {ok:false,status:"generation_failed",message:`Transformation failed: ${message}`};}
  }

  private async buildIntelligence(google:any, model:string, source:string, outputs:string[], body:any){
    const prompt=`You are the Content Intelligence Agent. Analyze the source and return ONLY JSON {"title":"...","summary":"...","facts":[{"id":"f1","text":"..."}],"entities":[{"name":"...","description":"..."}],"outputs":{}}. Keep outputs empty here; specialized agents will generate them. Never invent facts.\nSOURCE:\n${source}\nREQUESTED:${outputs.join(", ")}\nAUDIENCE:${body.audience||"General audience"}\nLANGUAGE:${body.language||"English"}`;
    const {text}=await generateText({model:google(model),prompt,temperature:.1});
    try{return JSON.parse(text.replace(/^```json\s*/i,"").replace(/```$/i,"").trim());}catch{return {title:"Transformation",summary:text,facts:[],entities:[],outputs:{}};}
  }

  async createPptx(title:string,slides:{title:string;bullets?:string[];speakerNotes?:string}[]){const pptx=new PptxGenJS();pptx.layout="LAYOUT_WIDE";pptx.author="TransformAI";for(const item of slides){const slide=pptx.addSlide();slide.addText(item.title,{x:.7,y:.55,w:12,h:.6,fontSize:28,bold:true});slide.addText((item.bullets||[]).map(b=>({text:b,options:{bullet:{indent:18}}})),{x:.9,y:1.45,w:11.3,h:4.7,fontSize:18,breakLine:true,valign:"top"});if(item.speakerNotes)slide.addNotes(item.speakerNotes);}return pptx.write({outputType:"nodebuffer"});}
  async createPdf(title:string,sections:{heading:string;text:string}[]){const doc=new PDFDocument({margin:50});const chunks:Buffer[]=[];doc.on("data",(c:Buffer)=>chunks.push(c));const done=new Promise<Buffer>(r=>doc.on("end",()=>r(Buffer.concat(chunks))));doc.fontSize(22).text(title).moveDown();for(const s of sections)doc.fontSize(15).text(s.heading,{underline:true}).moveDown(.3).fontSize(11).text(s.text).moveDown();doc.end();return done;}
  async createDocx(title:string,sections:{heading:string;text:string}[]){const doc=new Document({sections:[{children:[new Paragraph({text:title,heading:HeadingLevel.TITLE}),...sections.flatMap(s=>[new Paragraph({text:s.heading,heading:HeadingLevel.HEADING_1}),new Paragraph(s.text)])]}]});return Packer.toBuffer(doc);}
}
