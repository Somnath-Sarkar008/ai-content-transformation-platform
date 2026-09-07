import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

@Controller('api/sources')
export class UploadController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const name = file.originalname;
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    try {
      if (['txt','md','csv','json','xml','html','js','ts'].includes(ext) || file.mimetype.startsWith('text/')) return { ok:true,name,mimetype:file.mimetype,size:file.size,type:'text',content:file.buffer.toString('utf8').slice(0,50000),message:'Text file extracted successfully.' };
      if (ext==='pdf' || file.mimetype==='application/pdf') { const parsed=await pdfParse(file.buffer); return {ok:true,name,mimetype:file.mimetype,size:file.size,type:'pdf',content:parsed.text.slice(0,50000),pages:parsed.numpages,message:'PDF text extracted successfully.'}; }
      if (ext==='docx' || file.mimetype==='application/vnd.openxmlformats-officedocument.wordprocessingml.document') { const parsed=await mammoth.extractRawText({buffer:file.buffer}); return {ok:true,name,mimetype:file.mimetype,size:file.size,type:'docx',content:parsed.value.slice(0,50000),message:'DOCX text extracted successfully.'}; }
      if (file.mimetype.startsWith('image/')) {
        let description=`Uploaded image: ${name}.`;
        const apiKey=process.env.GEMINI_API_KEY?.trim();
        if (apiKey) {
          try {
            const google=createGoogleGenerativeAI({apiKey});
            const result=await generateText({model:google(process.env.GEMINI_VISION_MODEL||'gemini-2.5-flash'),messages:[{role:'user',content:[{type:'text',text:'Analyze this image for a content transformation pipeline. Describe the important visible facts, text, entities, charts or visual elements. Do not guess. Return concise plain text that can be used as source context.'},{type:'image',image:file.buffer}]}]});
            description=result.text.trim() || description;
          } catch(error) { console.warn('Image understanding unavailable:',error); }
        }
        return {ok:true,name,mimetype:file.mimetype,size:file.size,type:'image',content:`IMAGE CONTEXT (${name})\n${description}`,message:'Image accepted and analyzed by the multimodal agent when GEMINI_API_KEY is available.'};
      }
      if (file.mimetype.startsWith('video/')) return {ok:true,name,mimetype:file.mimetype,size:file.size,type:'video',content:`VIDEO CONTEXT (${name})\nA video source named ${name} was uploaded successfully. Use Video Package to generate a script, storyboard, narration, subtitles and visual recommendations from the supplied video context.`,message:'Video accepted successfully. Video assembly is handled as a transformation package in this prototype.'};
      return {ok:true,name,mimetype:file.mimetype,size:file.size,type:'binary',content:'',message:'File accepted, but text extraction is not supported for this type yet.'};
    } catch(error) { console.error('File extraction failed:',error); throw new BadRequestException(`Could not extract ${ext||'file'} content.`); }
  }
}
