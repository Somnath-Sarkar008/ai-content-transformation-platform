import { Body, Controller, Post } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('api/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('image')
  image(@Body() body:{prompt?:string}) {
    return this.media.generateImage(body.prompt?.trim()||'Create an infographic-style visual.');
  }

  @Post('video-package')
  videoPackage(@Body() body:{prompt?:string}) {
    return this.media.createVideoPackage(body.prompt?.trim()||'Create a concise factual video package.');
  }

  @Post('video-render')
  videoRender(@Body() body:{videoPackage?:unknown}) {
    return this.media.renderVideoPackage(body.videoPackage || {});
  }
}
