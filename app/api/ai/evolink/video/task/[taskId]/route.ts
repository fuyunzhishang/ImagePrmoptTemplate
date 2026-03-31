import { NextRequest, NextResponse } from 'next/server';
import { evolinkAxios } from '@/lib/axios-config';
import { log, logError } from '@/lib/logger';
import { auth } from '@/auth';
import { newStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 使用 NextAuth 获取 session
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const { taskId } = await params;

    log('[Evolink Video Task] 查询视频任务状态:', {
      user: session.user.email,
      taskId
    });

    const response = await evolinkAxios.get(`/v1/tasks/${taskId}`);

    log('[Evolink Video Task] 任务状态响应:', response.data);

    const taskData = response.data;

    // 如果任务已完成且有结果,上传到 R2
    if (taskData.status === 'completed' && taskData.results && taskData.results.length > 0) {
      log('[Evolink Video Task] 任务已完成,开始上传结果到 R2');

      try {
        const storage = newStorage();

        const uploadedResults = await Promise.all(
          taskData.results.map(async (resultUrl: string, index: number) => {
            try {
              // 从 URL 提取文件扩展名 (通常是 mp4)
              const urlPath = new URL(resultUrl).pathname;
              const extMatch = urlPath.match(/\.(\w+)$/);
              const extension = extMatch ? extMatch[1] : 'mp4';

              // 生成存储路径
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const timestamp = now.getTime();
              const random = Math.random().toString(36).substring(2, 15);
              const filename = `${timestamp}-${random}.${extension}`;
              const key = `ai-generated/videos/${year}/${month}/${day}/${filename}`;

              log('[Evolink Video Task] 开始下载并上传视频:', { url: resultUrl, key });

              // 下载并上传到 R2
              const uploadResult = await storage.downloadAndUpload({
                url: resultUrl,
                key,
                contentType: `video/${extension}`,
                disposition: 'inline'
              });

              log('[Evolink Video Task] 视频上传成功:', uploadResult);

              return uploadResult.url;
            } catch (uploadError: any) {
              logError('[Evolink Video Task] 视频上传失败:', uploadError);
              // 上传失败时返回原始 URL
              return resultUrl;
            }
          })
        );

        // 返回包含 R2 URL 的数据
        return NextResponse.json({
          code: 1000,
          message: 'success',
          data: {
            ...taskData,
            results: uploadedResults,
            original_results: taskData.results, // 保留原始 URL 作为备份
          }
        });
      } catch (uploadError: any) {
        logError('[Evolink Video Task] 批量上传失败,返回原始数据:', uploadError);
        // 上传失败时返回原始数据
        return NextResponse.json({
          code: 1000,
          message: 'success',
          data: taskData
        });
      }
    }

    return NextResponse.json({
      code: 1000,
      message: 'success',
      data: taskData
    });
  } catch (error: any) {
    logError('[Evolink Video Task] 查询失败:', error);
    const errorData = error.response?.data?.error || {};
    return NextResponse.json(
      {
        code: error.response?.status || 500,
        message: errorData.message || error.message || '查询失败',
        error: errorData
      },
      { status: error.response?.status || 500 }
    );
  }
}
