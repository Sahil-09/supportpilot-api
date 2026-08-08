import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;

  onModuleInit(): any {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_URL || 'play.min.io',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  async putBufferObject(file: Express.Multer.File) {
    const buckets = await this.minioClient.listBuckets();
    return await this.minioClient.putObject(
      process.env.MINIO_BUCKET || 'development',
      `${process.env.MINIO_FOLDER}/${file.originalname}`,
      file.buffer,
    );
  }

  async getObjectUrl(fileName: string): Promise<string> {
    const bucketName = process.env.MINIO_BUCKET || 'development';
    const url = await this.minioClient.presignedGetObject(
      bucketName,
      `${process.env.MINIO_FOLDER}/${fileName}`,
      24 * 60 * 60,
    ); // URL valid for 24 hours
    return url;
  }
}
