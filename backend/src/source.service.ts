import { Injectable } from '@nestjs/common';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
@Injectable()
export class SourceService {
 async ingest(b:{text?:string;url?:string}){
  if(b.text?.trim()) return {type:'text',content:b.text.trim(),source:b.text.trim().slice(0,120)};
  if(b.url?.trim()){
   try{const r=await fetch(b.url);const html=await r.text();const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return {type:'url',url:b.url,content:text.slice(0,30000)}}catch{return {type:'url',url:b.url,content:'Unable to fetch URL. Paste the source text instead.'}}
  }
  return {type:'empty',content:''};
 }
}
