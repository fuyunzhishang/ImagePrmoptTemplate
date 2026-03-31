import { NextRequest, NextResponse } from 'next/server';
import { evolinkAxios } from '@/lib/axios-config';
import { log, logError } from '@/lib/logger';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
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
      model = 'nano-veo-3.1',
      duration = '8',
      resolution = '720p',
      aspectRatio = '16:9',
      imageUrl,
      generateAudio = false,
    } = body;

    log('[Video Generate Create] 收到请求:', {
      user: session.user.email,
      prompt,
      model,
      duration,
      resolution,
      aspectRatio,
      hasImageUrl: !!imageUrl,
      generateAudio,
    });

    const requestBody: Record<string, any> = {
      model,
      prompt,
      duration: parseInt(duration) || 4,
      resolution,
      aspect_ratio: aspectRatio,
      enable_audio: generateAudio,
    };

    if (imageUrl) {
      requestBody.image_urls = [imageUrl];
    }

    const response = await evolinkAxios.post('/v1/videos/generations', requestBody);

    log('[Video Generate Create] Evolink 响应:', response.data);

    const taskId = response.data?.id || response.data?.task_id;

    if (!taskId) {
      logError('[Video Generate Create] 未获取到 taskId:', response.data);
      return NextResponse.json(
        { code: 500, message: '创建任务失败，未获取到任务ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 1000,
      message: 'success',
      data: { taskId },
    });
  } catch (error: any) {
    logError('[Video Generate Create] 错误:', error);
    const errorData = error.response?.data?.error || {};
    return NextResponse.json(
      {
        code: error.response?.status || 500,
        message: errorData.message || error.message || '视频生成任务创建失败',
        error: errorData,
      },
      { status: error.response?.status || 500 }
    );
  }
}
