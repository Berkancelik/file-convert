import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ConvertService } from './convert.service';
import { formatMatrix } from './formats';

@Controller('api')
export class ConvertController {
  constructor(private readonly service: ConvertService) {}

  /** Desteklenen formatların tam matrisi. */
  @Get('formats')
  getFormats() {
    return formatMatrix();
  }

  @Get('health')
  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }

  /**
   * Dosya yükle + dönüştür.
   * multipart/form-data: `file` (binary), `target` (uzantı), `quality` (opsiyonel).
   */
  @Post('convert')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    }),
  )
  async convert(
    @UploadedFile() file: Express.Multer.File,
    @Query('target') targetQuery: string,
    @Query('quality') qualityQuery?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya yüklenmedi.');
    const target = targetQuery?.trim();
    if (!target) throw new BadRequestException('Hedef format (target) belirtilmedi.');

    const quality = qualityQuery ? parseInt(qualityQuery, 10) : undefined;
    return this.service.convert(file.buffer, file.originalname, target, { quality });
  }

  /** Dönüştürülmüş dosyayı indir. */
  @Get('files/:id')
  async download(
    @Param('id') id: string,
    @Query('inline') inline: string,
    @Res() res: Response,
  ) {
    const f = await this.service.getFile(id);
    const disposition = inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Length', f.size);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(f.filename)}"`,
    );
    res.send(f.buffer);
  }
}
