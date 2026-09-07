import { Injectable } from '@nestjs/common';

@Injectable()
export class ResearchService {
  async search(query: string, maxResults = 5) {
    if (!process.env.TAVILY_API_KEY) return { ok: false, message: 'Set TAVILY_API_KEY to enable research.' };
    const response = await fetch('https://api.tavily.com/search', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ api_key:process.env.TAVILY_API_KEY, query, search_depth:'advanced', max_results:maxResults, include_answer:true }) });
    if (!response.ok) return { ok:false, message:`Research provider returned ${response.status}` };
    const data:any = await response.json();
    return { ok:true, answer:data.answer || '', results:(data.results||[]).map((r:any)=>({title:r.title,url:r.url,content:r.content,score:r.score})) };
  }
}
