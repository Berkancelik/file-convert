import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  const port = parseInt(process.env.API_PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`🚀 file-convert API → http://localhost:${port}/api`);
}

bootstrap();
