import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('TekaBliblio')
    .setDescription('APIs del proyecto TekaBiblio')
    .setVersion('1.0')
    .addTag('biblio')
    .build();

  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
