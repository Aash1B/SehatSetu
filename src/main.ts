import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT || 8000);
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Configure body parser to preserve raw body for webhook signature verification
  // This is needed for Razorpay webhook signature verification
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(require('body-parser').json({
    verify: (req: any, res: any, buf: any) => {
      (req as any).rawBody = buf.toString();
    }
  }));

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
  Logger.log(`Server listening on 0.0.0.0:${port}`);
}
bootstrap();
