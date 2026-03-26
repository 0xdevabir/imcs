import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

const allowedFrontendOrigins = [
  /^https?:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1:\d+$/,
  /^https?:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/,
  /^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(app|dev)$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow non-browser or same-origin requests without an Origin header.
        return callback(null, true);
      }

      const allowed = allowedFrontendOrigins.some((allowedOrigin) => {
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }

        return origin === allowedOrigin;
      });

      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept', 'Origin', 'Cookie', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });

  app.use(cookieParser());
  const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'storage/uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
  }
  app.useStaticAssets(uploadDir, { prefix: '/files/' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`Backend listening on http://localhost:${port}`);
}

bootstrap();
