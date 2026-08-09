import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT || 8000);
  app.enableCors({ origin: true, credentials: true });
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
  Logger.log(`Server running on http://localhost:${port}`);
}
bootstrap();
