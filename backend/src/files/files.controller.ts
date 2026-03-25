import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';

const ALLOWED_FILE_PATTERN = /^(image\/.*|video\/.*|application\/pdf)$/i;

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const uploadDir = FilesController.resolveUploadDirectory();
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
          }
          callback(null, uploadDir);
        },
        filename: (_request, file, callback) => {
          const randomName = randomBytes(18).toString('hex');
          const extension = extname(file.originalname) || '';
          callback(null, `${Date.now()}-${randomName}${extension}`);
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_FILE_PATTERN.test(file.mimetype)) {
          callback(new BadRequestException('Only image, video, and PDF files are allowed.'), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024,
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: { protocol: string; get(name: string): string | undefined },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return {
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: this.filesService.toPublicUrl(request, file.filename),
    };
  }

  private static resolveUploadDirectory(): string {
    const uploadDir = process.env.UPLOAD_DIR ?? 'storage/uploads';
    return resolve(process.cwd(), uploadDir);
  }
}
