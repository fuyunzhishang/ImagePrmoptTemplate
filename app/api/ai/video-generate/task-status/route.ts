import { NextRequest, NextResponse } from 'next/server';
import { evolinkAxios } from '@/lib/axios-config';
import { log, logError } from '@/lib/logger';
import { auth } from '@/auth';
import { newStorage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { code: 400, message: '缺少 taskId 参数' },
        { status: 400 }
      );
    }

    log('[Video Task Status] 查询任务状态:', {
      user: session.user.email,
      taskId,
    });

    const response = await evolinkAxios.get(`/v1/tasks/${taskId}`);
    const taskData = response.data;

    log('[Video Task Status] Evolink 响应:', taskData);

    // Map Evolink status to the format expected by the frontend
    let status = taskData.status;
    let videoUrl: string | undefined;
    let error: string | undefined;

    if (status === 'completed' && taskData.results && taskData.results.length > 0) {
      // Upload to R2
      try {
        const storage = newStorage();
        const resultUrl = taskData.results[0];
        const urlPath = new URL(resultUrl).pathname;
        const extMatch = urlPath.match(/\.(\w+)$/);
        const extension = extMatch ? extMatch[1] : 'mp4';

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = now.getTime();
        const random = Math.random().toString(36).substring(2, 15);
        const filename = `${timestamp}-${random}.${extension}`;
        const key = `ai-generated/videos/${year}/${month}/${day}/${filename}`;

        log('[Video Task Status] 开始上传视频到 R2:', { url: resultUrl, key });

        const uploadResult = await storage.downloadAndUpload({
          url: resultUrl,
          key,
          contentType: `video/${extension}`,
          disposition: 'inline',
        });

        log('[Video Task Status] 视频上传成功:', uploadResult);
        videoUrl = uploadResult.url;
      } catch (uploadError: any) {
        logError('[Video Task Status] 视频上传失败，使用原始 URL:', uploadError);
        videoUrl = taskData.results[0];
      }

      status = 'success';
    } else if (status === 'failed') {
      error = taskData.error || taskData.message || '视频生成失败';
    }

    return NextResponse.json({
      code: 1000,
      message: 'success',
      data: {
        status,
        videoUrl,
        progress: taskData.progress,
        error,
      },
    });
  } catch (error: any) {
    logError('[Video Task Status] 查询失败:', error);
    const errorData = error.response?.data?.error || {};
    return NextResponse.json(
      {
        code: error.response?.status || 500,
        message: errorData.message || error.message || '查询任务状态失败',
        error: errorData,
      },
      { status: error.response?.status || 500 }
    );
  }
}
