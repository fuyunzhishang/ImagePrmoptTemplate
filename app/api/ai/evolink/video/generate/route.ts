import { NextRequest, NextResponse } from 'next/server';
import { evolinkAxios } from '@/lib/axios-config';
import { log, logError } from '@/lib/logger';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth 获取 session
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      prompt,
      duration = 4,  // 4, 6, or 8 seconds
      resolution = '720p',  // 720p, 1080p, or 4K
      aspect_ratio = '16:9',  // 16:9 or 9:16
      image_urls,  // Optional: for image-to-video
      negative_prompt,  // Optional: to exclude elements
      enable_audio = false  // Optional: enable audio generation
    } = body;

    log('[Evolink Video Generate] 收到请求:', {
      user: session.user.email,
      prompt,
      duration,
      resolution,
      aspect_ratio,
      hasImageUrls: !!image_urls,
      enable_audio
    });

    // Validate duration
    if (![4, 6, 8].includes(duration)) {
      return NextResponse.json(
        { code: 400, message: '视频时长必须是 4、6 或 8 秒' },
        { status: 400 }
      );
    }

    // Validate resolution
    if (!['720p', '1080p', '4K'].includes(resolution)) {
      return NextResponse.json(
        { code: 400, message: '分辨率必须是 720p、1080p 或 4K' },
        { status: 400 }
      );
    }

    // Validate aspect ratio
    if (!['16:9', '9:16'].includes(aspect_ratio)) {
      return NextResponse.json(
        { code: 400, message: '纵横比必须是 16:9 或 9:16' },
        { status: 400 }
      );
    }

    const requestBody: Record<string, any> = {
      model: 'veo3.1-fast',  // Using Veo 3.1 model
      prompt,
      duration,
      resolution,
      aspect_ratio,
      enable_audio
    };

    // Add optional parameters
    if (image_urls && image_urls.length > 0) {
      // Max 3 reference images for image-to-video
      requestBody.image_urls = image_urls.slice(0, 3);
    }

    if (negative_prompt) {
      requestBody.negative_prompt = negative_prompt;
    }

    log('[Evolink Video Generate] 调用 Evolink API:', requestBody);

    const response = await evolinkAxios.post('/v1/videos/generations', requestBody);

    log('[Evolink Video Generate] 响应:', response.data);

    return NextResponse.json({
      code: 1000,
      message: 'success',
      data: response.data
    });
  } catch (error: any) {
    logError('[Evolink Video Generate] 错误:', error);
    const errorData = error.response?.data?.error || {};
    return NextResponse.json(
      {
        code: error.response?.status || 500,
        message: errorData.message || error.message || '视频生成失败',
        error: errorData
      },
      { status: error.response?.status || 500 }
    );
  }
}
