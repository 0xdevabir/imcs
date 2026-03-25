import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true,
  });

  app.use(cookieParser());
  const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'storage/uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
  }
  app.useStaticAssets(uploadDir, { prefix: '/files/' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}

bootstrap();
