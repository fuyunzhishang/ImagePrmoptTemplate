import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

export class Storage {
  private s3: S3Client;
  private config?: StorageConfig;

  constructor(config?: StorageConfig) {
    this.config = config;
    this.s3 = new S3Client({
      endpoint: config?.endpoint || process.env.STORAGE_ENDPOINT || "",
      region: config?.region || process.env.STORAGE_REGION || "auto",
      credentials: {
        accessKeyId: config?.accessKey || process.env.STORAGE_ACCESS_KEY || "",
        secretAccessKey:
          config?.secretKey || process.env.STORAGE_SECRET_KEY || "",
      },
    });
  }

  async uploadFile({
    body,
    key,
    contentType,
    bucket,
    onProgress,
    disposition = "inline",
  }: {
    body: Buffer;
    key: string;
    contentType?: string;
    bucket?: string;
    onProgress?: (progress: number) => void;
    disposition?: "inline" | "attachment";
  }) {
    if (!bucket) {
      bucket = process.env.STORAGE_BUCKET || "";
    }

    if (!bucket) {
      throw new Error("Bucket is required");
    }

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentDisposition: disposition,
        ...(contentType && { ContentType: contentType }),
      },
    });

    if (onProgress) {
      upload.on("httpUploadProgress", (progress) => {
        const percentage =
          ((progress.loaded || 0) / (progress.total || 1)) * 100;
        onProgress(percentage);
      });
    }

    const res = await upload.done();

    // 如果没有配置自定义域名，使用 R2 公共访问端点
    // R2 公共端点格式: https://pub-{account_id}.r2.dev/{bucket}/{key}
    let finalUrl: string;
    if (process.env.STORAGE_DOMAIN) {
      finalUrl = `${process.env.STORAGE_DOMAIN}/${res.Key}`;
    } else {
      // 从 endpoint 提取 account_id 来构建公共端点
      const endpoint = this.config?.endpoint || process.env.STORAGE_ENDPOINT || "";
      const accountIdMatch = endpoint.match(/([a-f0-9]{32})/);
      if (accountIdMatch) {
        const accountId = accountIdMatch[1];
        finalUrl = `https://pub-${accountId}.r2.dev/${bucket}/${res.Key}`;
      } else {
        // 回退到原始 location（可能无法公开访问）
        finalUrl = res.Location || "";
      }
    }

    return {
      location: res.Location,
      bucket: res.Bucket,
      key: res.Key,
      filename: res.Key?.split("/").pop(),
      url: finalUrl,
    };
  }

  async downloadAndUpload({
    url,
    key,
    bucket,
    contentType,
    disposition = "inline",
  }: {
    url: string;
    key: string;
    bucket?: string;
    contentType?: string;
    disposition?: "inline" | "attachment";
  }) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No body in response");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.uploadFile({
      body: buffer,
      key,
      bucket,
      contentType,
      disposition,
    });
  }
}
