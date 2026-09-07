import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
@Controller('api/sources')
export class UploadController {
 @Post('upload') @UseInterceptors(FileInterceptor('file',{storage:memoryStorage(),limits:{fileSize:25*1024*1024}}))
 upload(@UploadedFile() file:Express.Multer.File){
  if(!file) return {ok:false,message:'No file uploaded'};
  const textLike=/text|json|csv|javascript|typescript|xml|html/.test(file.mimetype)||/\.(txt|md|csv|json|xml|html|js|ts)$/i.test(file.originalname);
  return {ok:true,name:file.originalname,mimetype:file.mimetype,size:file.size,type:textLike?'text':'binary',content:textLike?file.buffer.toString('utf8'):undefined,message:textLike?'File extracted successfully':'Binary media accepted; multimodal processing will use the original file.'};
 }
}
