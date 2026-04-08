import { NextRequest, NextResponse } from 'next/server';
import { evolinkAxios } from '@/lib/axios-config';
import { newStorage } from '@/lib/storage';
import { auth } from '@/auth';
import { log, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const model = formData.get('model') as string;
    const aspectRatio = formData.get('aspectRatio') as string;

    log('[ImageToImage] 收到请求:', {
      user: session.user.email,
      hasImage: !!image,
      imageFileName: image?.name,
      prompt,
      model,
      aspectRatio
    });

    if (!image) {
      return NextResponse.json(
        { code: 400, message: '请上传参考图片' },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { code: 400, message: '请输入提示词' },
        { status: 400 }
      );
    }

    // 上传图片到 R2
    const storage = newStorage();
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime();
    const random = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${random}.${image.name.split('.').pop()}`;
    const key = `ai-generated/references/${year}/${month}/${day}/${filename}`;

    log('[ImageToImage] 上传参考图片到 R2:', key);
    const uploadResult = await storage.uploadFile({
      body: buffer,
      key,
      contentType: image.type,
      disposition: 'inline'
    });

    log('[ImageToImage] 图片上传成功:', uploadResult.url);

    // 调用 Evolink API 生成图片
    const requestBody: Record<string, any> = {
      model: 'nano-banana-2-lite',
      prompt,
      size: aspectRatio || 'auto',
      quality: '2K',
      image_urls: [uploadResult.url]
    };

    log('[ImageToImage] 调用 Evolink API:', {
      model: requestBody.model,
      prompt,
      size: requestBody.size,
      imageUrlsCount: requestBody.image_urls?.length
    });

    const response = await evolinkAxios.post('/v1/images/generations', requestBody);

    log('[ImageToImage] Evolink 响应:', response.data);

    // 返回任务 ID，前端需要轮询任务状态
    return NextResponse.json({
      code: 1000,
      message: 'success',
      data: {
        id: response.data.id,
        task_id: response.data.id
      }
    });
  } catch (error: any) {
    logError('[ImageToImage] 错误:', error);
    const errorData = error.response?.data || {};
    return NextResponse.json(
      {
        code: error.response?.status || 500,
        message: errorData.message || error.message || '生成失败',
        error: errorData
      },
      { status: error.response?.status || 500 }
    );
  }
}
