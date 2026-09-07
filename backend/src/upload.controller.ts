import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

@Controller('api/sources')
export class UploadController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const name = file.originalname;
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

    try {
      if (['txt', 'md', 'csv', 'json', 'xml', 'html', 'js', 'ts'].includes(ext) || file.mimetype.startsWith('text/')) {
        return {
          ok: true, name, mimetype: file.mimetype, size: file.size, type: 'text',
          content: file.buffer.toString('utf8').slice(0, 50000),
          message: 'Text file extracted successfully.',
        };
      }

      if (ext === 'pdf' || file.mimetype === 'application/pdf') {
        const parsed = await pdfParse(file.buffer);
        return {
          ok: true, name, mimetype: file.mimetype, size: file.size, type: 'pdf',
          content: parsed.text.slice(0, 50000),
          pages: parsed.numpages,
          message: 'PDF text extracted successfully.',
        };
      }

      if (ext === 'docx' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const parsed = await mammoth.extractRawText({ buffer: file.buffer });
        return {
          ok: true, name, mimetype: file.mimetype, size: file.size, type: 'docx',
          content: parsed.value.slice(0, 50000),
          message: 'DOCX text extracted successfully.',
        };
      }

      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        return {
          ok: true, name, mimetype: file.mimetype, size: file.size, type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          content: `Uploaded ${file.mimetype.startsWith('image/') ? 'image' : 'video'}: ${name}. Multimodal processing is queued for the next agent stage.`,
          message: 'Media accepted successfully.',
        };
      }

      return { ok: true, name, mimetype: file.mimetype, size: file.size, type: 'binary', content: '', message: 'File accepted, but text extraction is not supported for this type yet.' };
    } catch (error) {
      console.error('File extraction failed:', error);
      throw new BadRequestException(`Could not extract ${ext || 'file'} content.`);
    }
  }
}
