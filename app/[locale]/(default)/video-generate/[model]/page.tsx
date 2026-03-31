"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { authEventBus } from "@/lib/auth-event";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Languages, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import cosUploadService from "@/lib/cos-upload";
import { useConsumptionItems } from "@/hooks/useConsumptionItems";
import { mapVideoModelToConsumptionType } from "@/lib/model-consumption-mapping";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Google 登录处理组件
function GoogleAuthHandler() {
  const [searchParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });

  useEffect(() => {
    // 清除所有 Google OAuth 和登录相关的标志
    sessionStorage.removeItem('google_oauth_in_progress');
    sessionStorage.removeItem('user_opened_sign_modal');
    
    const authToken = searchParams.get('auth_token');
    const refreshToken = searchParams.get('refresh_token');

    if (authToken) {
      console.log('[GoogleAuthHandler] Found auth token in URL params');
      localStorage.setItem("aiHubToken", authToken);
      localStorage.setItem("aiHubToken_full", JSON.stringify({
        token: authToken,
        refreshToken: refreshToken || '',
        expire: 7200,
        refreshExpire: 604800,
        loginTime: Date.now()
      }));

      toast.success('登录成功！');

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_token');
      newUrl.searchParams.delete('refresh_token');
      window.history.replaceState({}, '', newUrl.pathname);
      window.location.reload();
    }

    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('aiHubToken='))
      ?.split('=')[1];

    if (cookieToken && !authToken) {
      console.log('[GoogleAuthHandler] Found auth token in cookie');
      localStorage.setItem("aiHubToken", cookieToken);
      localStorage.setItem("aiHubToken_full", JSON.stringify({
        token: cookieToken,
        refreshToken: '',
        expire: 7200,
        refreshExpire: 604800,
        loginTime: Date.now()
      }));
    }
  }, [searchParams]);

  return null;
}

interface VideoModel {
  id: string;
  name: string;
  description: string;
  maxDuration: number;
  supportedResolutions?: string[];
  supportedAspectRatios?: string[];
  supportedAspectDuration?: number[];
}

export default function VideoGeneratePage() {
  const params = useParams();
  const routeModel = params?.model as string || 'all'; // 获取路由中的模型参数
  const t = useTranslations('video-generate');
  const { getCredits } = useConsumptionItems();

  // 通用状态
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);

  // Text to Video 状态
  const [t2vPrompt, setT2vPrompt] = useState("");
  const [t2vModel, setT2vModel] = useState("");
  const [t2vDuration, setT2vDuration] = useState("5");
  const [t2vResolution, setT2vResolution] = useState("720p");
  const [t2vAspectRatio, setT2vAspectRatio] = useState("16:9");
  const [t2vEnableAudio, setT2vEnableAudio] = useState(false);
  const [isGeneratingT2V, setIsGeneratingT2V] = useState(false);
  const [generatedT2VVideo, setGeneratedT2VVideo] = useState<string | null>(null);
  const [t2vTaskId, setT2vTaskId] = useState<string | null>(null);
  const [t2vProgress, setT2vProgress] = useState(0);
  const [isT2vTranslateDialogOpen, setIsT2vTranslateDialogOpen] = useState(false);
  const [t2vTargetLanguage, setT2vTargetLanguage] = useState("en");
  const [isT2vProcessing, setIsT2vProcessing] = useState(false);

  // Image to Video 状态
  const [i2vPrompt, setI2vPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [i2vModel, setI2vModel] = useState("");
  const [i2vDuration, setI2vDuration] = useState("5");
  const [i2vResolution, setI2vResolution] = useState("720p");
  const [i2vAspectRatio, setI2vAspectRatio] = useState("16:9");
  const [i2vEnableAudio, setI2vEnableAudio] = useState(false);
  const [isGeneratingI2V, setIsGeneratingI2V] = useState(false);
  const [generatedI2VVideo, setGeneratedI2VVideo] = useState<string | null>(null);
  const [i2vTaskId, setI2vTaskId] = useState<string | null>(null);
  const [i2vProgress, setI2vProgress] = useState(0);
  const [isI2vTranslateDialogOpen, setIsI2vTranslateDialogOpen] = useState(false);
  const [i2vTargetLanguage, setI2vTargetLanguage] = useState("en");
  const [isI2vProcessing, setIsI2vProcessing] = useState(false);

  // Video models 状态
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // 计算积分的辅助函数
  const calculateCredits = (model: string, duration: string, resolution: string, enableAudio: boolean) => {
    if (!model) return 0;

    const consumptionType = mapVideoModelToConsumptionType(model);
    if (!consumptionType) {
      console.warn('[Credits] 未找到模型映射:', model);
      return 0;
    }

    const durationNum = parseInt(duration) || 5;
    const credits = getCredits(consumptionType, {
      resolution,
      duration: durationNum
    });

    return credits;
  };

  // 根据路由参数过滤模型
  const filteredVideoModels = videoModels.filter(m => {
    if (routeModel === 'all') return true; // 'all' 显示所有模型

    // doubao-seedance 页面：只显示 Seedance 相关模型
    if (routeModel === 'doubao-seedance') {
      return m.id.toLowerCase().includes('seedance');
    }

    // 其他路由：匹配模型 id 或 name 字段
    return m.id.toLowerCase().includes(routeModel.toLowerCase()) ||
           m.name.toLowerCase().includes(routeModel.toLowerCase());
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 获取视频模型列表
  useEffect(() => {
    const fetchVideoModels = async () => {
      try {
        setIsLoadingModels(true);
        console.log('[VideoModels] 开始获取模型列表');

        const response = await fetch('/api/ai/video-models');

        console.log('[VideoModels] API 响应状态:', response.status);

        if (!response.ok) {
          console.error('[VideoModels] API 返回错误:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[VideoModels] API 响应数据:', result);

        if (result.code === 1000 && result.data && Array.isArray(result.data)) {
          console.log('[VideoModels] 成功获取模型列表，数量:', result.data.length);
          setVideoModels(result.data);
        } else {
          console.error('[VideoModels] 获取模型列表失败:', result.message);
          toast.error(result.message || t('toast.getModelsFailed'));
        }
      } catch (error) {
        console.error('[VideoModels] 获取模型列表异常:', error);
        toast.error(t('toast.getModelsFailedRetry'));
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchVideoModels();
  }, []);

  // 当过滤后的模型列表变化时，设置默认选中第一个模型
  useEffect(() => {
    if (filteredVideoModels.length > 0 && !t2vModel && !i2vModel) {
      const defaultModelId = filteredVideoModels[0].id;
      console.log('[VideoModels] 设置默认模型（过滤后）:', defaultModelId);
      setT2vModel(defaultModelId);
      setI2vModel(defaultModelId);
    }
  }, [filteredVideoModels, t2vModel, i2vModel]);

  // 当 T2V 模型变化时，设置默认 duration
  useEffect(() => {
    if (t2vModel && videoModels.length > 0) {
      const model = videoModels.find(m => m.id === t2vModel);
      if (model?.supportedAspectDuration && model.supportedAspectDuration.length > 0) {
        const defaultDuration = String(model.supportedAspectDuration[0]);
        console.log('[T2V] 设置默认 duration:', defaultDuration);
        setT2vDuration(defaultDuration);
      }
    }
  }, [t2vModel, videoModels]);

  // 当 I2V 模型变化时，设置默认 duration
  useEffect(() => {
    if (i2vModel && videoModels.length > 0) {
      const model = videoModels.find(m => m.id === i2vModel);
      if (model?.supportedAspectDuration && model.supportedAspectDuration.length > 0) {
        const defaultDuration = String(model.supportedAspectDuration[0]);
        console.log('[I2V] 设置默认 duration:', defaultDuration);
        setI2vDuration(defaultDuration);
      }
    }
  }, [i2vModel, videoModels]);

  const saveRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('loginRedirectUrl', window.location.pathname);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.pleaseUploadImageFile'));
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('toast.imageTooLarge'));
      return;
    }

    // 先显示预览
    setReferenceImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setReferenceImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传到 COS
    try {
      setIsUploadingImage(true);
      setUploadProgress(0);
      
      console.log('[I2V] 开始上传图片到 COS...');
      const imageUrl = await cosUploadService.uploadFileWithRetry(
        file,
        'video-generation/audio', // 使用视频生成音频驱动类型
        {
          onProgress: (progress) => {
            setUploadProgress(progress);
            console.log('[I2V] 上传进度:', progress + '%');
          },
          onError: (error) => {
            console.error('[I2V] 上传错误:', error);
          }
        }
      );

      setReferenceImageUrl(imageUrl);
      console.log('[I2V] 图片上传成功:', imageUrl);
      toast.success(t('toast.imageUploadSuccess'));
    } catch (error) {
      console.error('[I2V] 图片上传失败:', error);
      toast.error(error instanceof Error ? error.message : t('toast.imageUploadFailed'));
      // 上传失败时清除图片
      setReferenceImage(null);
      setReferenceImagePreview(null);
      setReferenceImageUrl(null);
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = () => {
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setReferenceImageUrl(null);
  };

  // Text to Video - Magic Enhance
  const handleT2vMagicEnhance = async () => {
    if (!t2vPrompt.trim()) {
      toast.error("请先输入提示词");
      return;
    }

    setIsT2vProcessing(true);

    try {
      const response = await fetch("/api/text-to-prompt/magic-enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: t2vPrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "增强失败");
      }

      const result = await response.json();

      if (result.success && result.enhancedPrompt) {
        setT2vPrompt(result.enhancedPrompt);
        toast.success("提示词增强成功！");
      } else {
        throw new Error("服务器响应无效");
      }
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      toast.error(error instanceof Error ? error.message : "增强失败，请重试");
    } finally {
      setIsT2vProcessing(false);
    }
  };

  // Text to Video - Translate
  const handleT2vTranslate = async () => {
    if (!t2vPrompt.trim()) {
      toast.error("请先输入提示词");
      return;
    }

    setIsT2vProcessing(true);
    setIsT2vTranslateDialogOpen(false);

    try {
      const response = await fetch("/api/text-to-prompt/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: t2vPrompt,
          targetLanguage: t2vTargetLanguage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "翻译失败");
      }

      const result = await response.json();

      if (result.success && result.translatedPrompt) {
        setT2vPrompt(result.translatedPrompt);
        toast.success("翻译成功！");
      } else {
        throw new Error("服务器响应无效");
      }
    } catch (error) {
      console.error("Error translating prompt:", error);
      toast.error(error instanceof Error ? error.message : "翻译失败，请重试");
    } finally {
      setIsT2vProcessing(false);
    }
  };

  // Image to Video - Translate
  const handleI2vTranslate = async () => {
    if (!i2vPrompt.trim()) {
      toast.error("请先输入提示词");
      return;
    }

    setIsI2vProcessing(true);
    setIsI2vTranslateDialogOpen(false);

    try {
      const response = await fetch("/api/text-to-prompt/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: i2vPrompt,
          targetLanguage: i2vTargetLanguage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "翻译失败");
      }

      const result = await response.json();

      if (result.success && result.translatedPrompt) {
        setI2vPrompt(result.translatedPrompt);
        toast.success("翻译成功！");
      } else {
        throw new Error("服务器响应无效");
      }
    } catch (error) {
      console.error("Error translating prompt:", error);
      toast.error(error instanceof Error ? error.message : "翻译失败，请重试");
    } finally {
      setIsI2vProcessing(false);
    }
  };

  // Text to Video 轮询任务状态
  const pollT2VTaskStatus = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    let currentProgress = 10; // 初始进度10%

    const poll = async () => {
      try {
        const response = await fetch(`/api/ai/video-generate/task-status?taskId=${taskId}`);

        const result = await response.json();
        console.log('[T2V] 任务状态:', result);
        console.log('[T2V] status:', result.data?.status, 'videoUrl:', result.data?.videoUrl);

        if (result.code === 1000 && result.data) {
          const { status, videoUrl, progress: taskProgress } = result.data;

          // 模拟进度：如果后端返回了进度则使用后端进度，否则根据轮询次数模拟
          if (taskProgress !== null && taskProgress !== undefined) {
            setT2vProgress(taskProgress);
          } else {
            // 模拟进度增长：每次随机增长0.5%-3%，确保进度平滑且不超过95%
            const randomIncrement = 0.5 + Math.random() * 2.5; // 0.5-3之间的随机增长
            currentProgress = Math.min(currentProgress + randomIncrement, 95);
            setT2vProgress(Math.round(currentProgress));
          }

          if (status === 'success' && videoUrl) {
            console.log('[T2V] ✅ 视频生成成功，设置结果...');
            setT2vProgress(100); // 成功时设置为100%
            setGeneratedT2VVideo(videoUrl);
            setIsGeneratingT2V(false);
            toast.success(t('toast.videoGenerateSuccess'));
            return;
          } else if (status === 'failed') {
            console.log('[T2V] ❌ 视频生成失败, error:', result.data.error);
            setIsGeneratingT2V(false);
            // 优先使用 error 字段，如果没有则使用 errorMessage，最后使用默认消息
            const errorMsg = result.data.error || result.data.errorMessage || t('toast.videoGenerateFailed');
            toast.error(errorMsg);
            return;
          } else if (status === 'processing' || status === 'pending') {
            console.log('[T2V] ⏳ 继续轮询...', `attempts: ${attempts + 1}/${maxAttempts}`);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 5000);
            } else {
              setIsGeneratingT2V(false);
              toast.error(t('toast.generateTimeout'));
            }
          } else {
            // 未知状态，停止轮询
            console.log('[T2V] ⚠️ 未知状态:', status);
            setIsGeneratingT2V(false);
            toast.error(`${t('toast.unknownTaskStatus')}: ${status}`);
          }
        } else {
          console.log('[T2V] ❌ API 返回错误');
          setIsGeneratingT2V(false);
          toast.error(result.message || t('toast.queryStatusFailed'));
        }
      } catch (error) {
        console.error('[T2V] 查询状态异常:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsGeneratingT2V(false);
          toast.error(t('toast.queryStatusFailed'));
        }
      }
    };

    poll();
  };

  // Image to Video 轮询任务状态
  const pollI2VTaskStatus = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    let currentProgress = 10; // 初始进度10%

    const poll = async () => {
      try {
        const response = await fetch(`/api/ai/video-generate/task-status?taskId=${taskId}`);

        const result = await response.json();
        console.log('[I2V] 任务状态:', result);
        console.log('[I2V] status:', result.data?.status, 'videoUrl:', result.data?.videoUrl);

        if (result.code === 1000 && result.data) {
          const { status, videoUrl, progress: taskProgress } = result.data;

          // 模拟进度：如果后端返回了进度则使用后端进度，否则根据轮询次数模拟
          if (taskProgress !== null && taskProgress !== undefined) {
            setI2vProgress(taskProgress);
          } else {
            // 模拟进度增长：每次随机增长0.5%-3%，确保进度平滑且不超过95%
            const randomIncrement = 0.5 + Math.random() * 2.5; // 0.5-3之间的随机增长
            currentProgress = Math.min(currentProgress + randomIncrement, 95);
            setI2vProgress(Math.round(currentProgress));
          }

          if (status === 'success' && videoUrl) {
            console.log('[I2V] ✅ 视频生成成功，设置结果...');
            setI2vProgress(100); // 成功时设置为100%
            setGeneratedI2VVideo(videoUrl);
            setIsGeneratingI2V(false);
            toast.success(t('toast.videoGenerateSuccess'));
            return;
          } else if (status === 'failed') {
            console.log('[I2V] ❌ 视频生成失败, error:', result.data.error);
            setIsGeneratingI2V(false);
            // 优先使用 error 字段，如果没有则使用 errorMessage，最后使用默认消息
            const errorMsg = result.data.error || result.data.errorMessage || t('toast.videoGenerateFailed');
            toast.error(errorMsg);
            return;
          } else if (status === 'processing' || status === 'pending') {
            console.log('[I2V] ⏳ 继续轮询...', `attempts: ${attempts + 1}/${maxAttempts}`);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 5000);
            } else {
              setIsGeneratingI2V(false);
              toast.error(t('toast.generateTimeout'));
            }
          } else {
            // 未知状态，停止轮询
            console.log('[I2V] ⚠️ 未知状态:', status);
            setIsGeneratingI2V(false);
            toast.error(`${t('toast.unknownTaskStatus')}: ${status}`);
          }
        } else {
          console.log('[I2V] ❌ API 返回错误');
          setIsGeneratingI2V(false);
          toast.error(result.message || t('toast.queryStatusFailed'));
        }
      } catch (error) {
        console.error('[I2V] 查询状态异常:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsGeneratingI2V(false);
          toast.error(t('toast.queryStatusFailed'));
        }
      }
    };

    poll();
  };

  // Text to Video 生成
  const handleT2VGenerate = async () => {
    if (!session) {
      saveRedirectUrl();
      toast.error(t('toast.pleaseLogin'));
      authEventBus.emit({
        type: 'login-expired',
        message: t('toast.pleaseLogin')
      });
      return;
    }

    if (!t2vPrompt.trim()) {
      toast.error(t('toast.pleaseInputPrompt'));
      return;
    }

    setIsGeneratingT2V(true);
    setGeneratedT2VVideo(null);
    setT2vTaskId(null);
    setT2vProgress(0);

    try {
      console.log('[T2V] 开始生成视频:', {
        prompt: t2vPrompt,
        model: t2vModel,
        duration: t2vDuration,
        resolution: t2vResolution,
        aspectRatio: t2vAspectRatio
      });

      const response = await fetch('/api/ai/video-generate/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: t2vPrompt,
          model: t2vModel,
          duration: t2vDuration,
          resolution: t2vResolution,
          aspectRatio: t2vAspectRatio,
          generateAudio: t2vEnableAudio,
        }),
      });

      const result = await response.json();
      console.log('[T2V] API 响应:', result);

      if (result.code === 1000 && result.data?.taskId) {
        const taskId = result.data.taskId;
        setT2vTaskId(taskId);
        toast.success(t('toast.taskCreated'));
        pollT2VTaskStatus(taskId);
      } else {
        setIsGeneratingT2V(false);
        toast.error(result.message || t('toast.taskCreateFailed'));
      }
    } catch (error) {
      console.error('[T2V] 生成异常:', error);
      setIsGeneratingT2V(false);
      toast.error(t('toast.generateFailed'));
    }
  };

  // Image to Video 生成
  const handleI2VGenerate = async () => {
    if (!session) {
      saveRedirectUrl();
      toast.error(t('toast.pleaseLogin'));
      authEventBus.emit({
        type: 'login-expired',
        message: t('toast.pleaseLogin')
      });
      return;
    }

    if (!i2vPrompt.trim()) {
      toast.error(t('toast.pleaseInputPrompt'));
      return;
    }

    if (!referenceImageUrl) {
      toast.error(t('toast.pleaseUploadImage'));
      return;
    }

    setIsGeneratingI2V(true);
    setGeneratedI2VVideo(null);
    setI2vTaskId(null);
    setI2vProgress(0);

    try {
      console.log('[I2V] 开始生成视频:', {
        prompt: i2vPrompt,
        imageUrl: referenceImageUrl,
        model: i2vModel,
        duration: i2vDuration,
        resolution: i2vResolution,
        aspectRatio: i2vAspectRatio
      });

      const response = await fetch('/api/ai/video-generate/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: i2vPrompt,
          imageUrl: referenceImageUrl,
          model: i2vModel,
          duration: i2vDuration,
          resolution: i2vResolution,
          aspectRatio: i2vAspectRatio,
          generateAudio: i2vEnableAudio,
        }),
      });

      const result = await response.json();
      console.log('[I2V] API 响应:', result);

      if (result.code === 1000 && result.data?.taskId) {
        const taskId = result.data.taskId;
        setI2vTaskId(taskId);
        toast.success(t('toast.taskCreated'));
        pollI2VTaskStatus(taskId);
      } else {
        setIsGeneratingI2V(false);
        toast.error(result.message || t('toast.taskCreateFailed'));
      }
    } catch (error) {
      console.error('[I2V] 生成异常:', error);
      setIsGeneratingI2V(false);
      toast.error(t('toast.generateFailed'));
    }
  };

  return (
    <>
      <GoogleAuthHandler />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-background dark:to-gray-950">

        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center max-w-4xl mx-auto">
            {routeModel === 'doubao-seedance' ? (
              <>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 text-black">
                  <span className="text-black">{t('seedance.title')} </span>
                  <span className="text-black">{t('seedance.titleSuffix')}</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {t('seedance.subtitle')}
                </p>
                <p className="text-base text-muted-foreground">
                  {t('seedance.description')}
                </p>
              </>
            ) : routeModel === 'veo' || routeModel === 'google-veo' || routeModel === 'veo-3' ? (
              <>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 text-black">
                  <span className="text-black">{t('veo.title')}</span>
                  <span className="text-black"> {t('veo.titleSuffix')}</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {t('veo.subtitle')}
                </p>
                <p className="text-base text-muted-foreground">
                  {t('veo.description')}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground">
                  <span className="text-foreground">{t('default.title')}</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {t('default.subtitle')}
                </p>
              </>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="text-to-video" className="w-full">
              <TabsList className="mb-8 bg-white/80 dark:bg-card/80 backdrop-blur-sm p-1.5 border border-gray-200 dark:border-border shadow-sm rounded-lg">
                <TabsTrigger
                  value="text-to-video"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-md px-8 py-3 rounded-md transition-all font-medium"
                >
                  {t('tabs.textToVideo')}
                </TabsTrigger>
                <TabsTrigger
                  value="image-to-video"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-md px-8 py-3 rounded-md transition-all font-medium"
                >
                  {t('tabs.imageToVideo')}
                </TabsTrigger>
              </TabsList>

              {/* Text to Video Tab */}
              <TabsContent value="text-to-video">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Panel */}
                  <div className="space-y-6 bg-white dark:bg-card p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-border">
                    <div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-foreground flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                        </svg>
                        {t('textToVideo.title')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('textToVideo.description')}
                      </p>
                      <div className="relative">
                        <Textarea
                          placeholder={t('textToVideo.placeholder')}
                          value={t2vPrompt}
                          onChange={(e) => setT2vPrompt(e.target.value)}
                          maxLength={2048}
                          className="min-h-[140px] resize-none border-gray-200 dark:border-border focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all rounded-lg"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-muted-foreground bg-white/90 dark:bg-background/90 px-2 py-1 rounded-md backdrop-blur-sm">
                          {t2vPrompt.length}/2048
                        </div>
                      </div>

                      {/* Prompt Enhancement Buttons - 暂时隐藏 */}
                      {/* <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={handleT2vMagicEnhance}
                          disabled={isT2vProcessing || !t2vPrompt.trim()}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Magic Enhance
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={() => setIsT2vTranslateDialogOpen(true)}
                          disabled={isT2vProcessing || !t2vPrompt.trim()}
                        >
                          <Languages className="h-4 w-4 mr-2" />
                          Translate
                        </Button>
                      </div> */}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('textToVideo.model')}</label>
                          <Select value={t2vModel} onValueChange={setT2vModel} disabled={isLoadingModels || filteredVideoModels.length === 0}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue>
                                {t2vModel ? filteredVideoModels.find(m => m.id === t2vModel)?.name :
                                  (isLoadingModels ? t('common.loading') : t('common.selectModel'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {filteredVideoModels.length > 0 ? (
                                filteredVideoModels.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium">{m.name}</span>
                                      <span className="text-xs text-muted-foreground">{m.description}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="loading" disabled>
                                  {isLoadingModels ? t('common.loading') : t('common.selectModel')}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('textToVideo.aspectRatio')}</label>
                          <Select value={t2vAspectRatio} onValueChange={setT2vAspectRatio}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {t2vModel && filteredVideoModels.find(m => m.id === t2vModel)?.supportedAspectRatios?.length ? (
                                filteredVideoModels.find(m => m.id === t2vModel)?.supportedAspectRatios?.map((ratio) => (
                                  <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="16:9">16:9</SelectItem>
                                  <SelectItem value="9:16">9:16</SelectItem>
                                  <SelectItem value="1:1">1:1</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('textToVideo.duration')}</label>
                          <Select value={t2vDuration} onValueChange={setT2vDuration}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {t2vModel && filteredVideoModels.find(m => m.id === t2vModel)?.supportedAspectDuration?.length ? (
                                filteredVideoModels.find(m => m.id === t2vModel)?.supportedAspectDuration?.map((duration) => (
                                  <SelectItem key={duration} value={String(duration)}>{duration} {t('common.seconds')}</SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="5">5 {t('common.seconds')}</SelectItem>
                                  <SelectItem value="8">8 {t('common.seconds')}</SelectItem>
                                  <SelectItem value="12">12 {t('common.seconds')}</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('textToVideo.resolution')}</label>
                          <Select value={t2vResolution} onValueChange={setT2vResolution}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {t2vModel && filteredVideoModels.find(m => m.id === t2vModel)?.supportedResolutions?.length ? (
                                filteredVideoModels.find(m => m.id === t2vModel)?.supportedResolutions?.map((res) => (
                                  <SelectItem key={res} value={res}>{res}</SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="480p">480p</SelectItem>
                                  <SelectItem value="720p">720p</SelectItem>
                                  <SelectItem value="1080p">1080p</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* 音频开关 - Seedance models don't support audio */}
                      {!t2vModel?.toLowerCase().includes('seedance') && (
                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                          <div className="flex-1">
                            <label className="text-sm font-medium">{t('textToVideo.enableAudio')}</label>
                            <p className="text-xs text-muted-foreground mt-1">{t('textToVideo.enableAudioHint')}</p>
                          </div>
                          <Switch
                            checked={t2vEnableAudio}
                            onCheckedChange={setT2vEnableAudio}
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleT2VGenerate}
                      disabled={!t2vPrompt || isGeneratingT2V}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none transition-all rounded-lg font-medium"
                      size="lg"
                    >
                      {isGeneratingT2V ? `${t('textToVideo.generating')} ${t2vProgress}%` : t('textToVideo.generateButton')}
                    </Button>

                    {/* 积分显示 */}
                    {t2vModel && (() => {
                      const credits = calculateCredits(t2vModel, t2vDuration, t2vResolution, t2vEnableAudio);
                      if (credits > 0) {
                        return (
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                            <div className="text-muted-foreground font-medium">
                              Credits: {credits} ⚡
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {t2vTaskId && (
                      <div className="text-center pt-2 border-t border-border">
                        <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">
                          Task ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{t2vTaskId}</code>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Panel */}
                  <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 dark:from-gray-900/30 dark:to-purple-900/10 rounded-2xl p-12 flex items-center justify-center min-h-[500px] border-2 border-dashed border-gray-300 dark:border-gray-700">
                    {isGeneratingT2V ? (
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">{t('common.generatingMessage')}</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">{t('common.generatingHint')}</p>
                        {t2vProgress > 0 && (
                          <div className="mt-4">
                            <div className="w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                                style={{ width: `${t2vProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t2vProgress}%</p>
                          </div>
                        )}
                      </div>
                    ) : generatedT2VVideo ? (
                      <div className="w-full">
                        <video
                          src={generatedT2VVideo}
                          controls
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                        <div className="mt-4 flex gap-2 justify-center">
                          <Button
                            onClick={() => window.open(generatedT2VVideo, '_blank')}
                            variant="outline"
                            size="sm"
                            className="hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                          >
                            {t('common.openFullSize')}
                          </Button>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = generatedT2VVideo;
                              link.download = `t2v-${Date.now()}.mp4`;
                              link.click();
                            }}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg transition-all"
                          >
                            {t('common.download')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <svg
                          className="w-32 h-32 mx-auto mb-6 opacity-30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-lg text-gray-500 dark:text-gray-400 font-light">{t('textToVideo.resultPlaceholder')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Image to Video Tab */}
              <TabsContent value="image-to-video">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Panel */}
                  <div className="space-y-6 bg-white dark:bg-card p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-border">
                    {/* Reference Image Upload */}
                    <div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-foreground flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t('imageToVideo.referenceImage')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('imageToVideo.referenceDescription')}
                      </p>
                      
                      {!referenceImagePreview ? (
                        <label className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <svg
                            className="w-14 h-14 mx-auto mb-4 text-gray-400 group-hover:text-purple-500 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">
                            {t('imageToVideo.uploadPrompt')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('imageToVideo.uploadHint')}
                          </p>
                        </label>
                      ) : (
                        <div className="relative max-w-[200px]">
                          <img
                            src={referenceImagePreview}
                            alt="Reference"
                            className="w-full h-auto object-contain rounded-lg bg-gray-100 dark:bg-gray-700"
                          />
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                              <div className="text-center text-white">
                                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-sm">{t('imageToVideo.uploading')} {uploadProgress}%</p>
                              </div>
                            </div>
                          )}
                          {!isUploadingImage && (
                            <button
                              onClick={handleRemoveImage}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-foreground flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                        </svg>
                        {t('imageToVideo.title')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('imageToVideo.description')}
                      </p>
                      <div className="relative">
                        <Textarea
                          placeholder={t('imageToVideo.placeholder')}
                          value={i2vPrompt}
                          onChange={(e) => setI2vPrompt(e.target.value)}
                          maxLength={2048}
                          className="min-h-[140px] resize-none border-gray-200 dark:border-border focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all rounded-lg"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-muted-foreground bg-white/90 dark:bg-background/90 px-2 py-1 rounded-md backdrop-blur-sm">
                          {i2vPrompt.length}/2048
                        </div>
                      </div>

                      {/* Prompt Enhancement Buttons - 暂时隐藏 */}
                      {/* <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={() => setIsI2vTranslateDialogOpen(true)}
                          disabled={isI2vProcessing || !i2vPrompt.trim()}
                        >
                          <Languages className="h-4 w-4 mr-2" />
                          Translate
                        </Button>
                      </div> */}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('imageToVideo.model')}</label>
                          <Select value={i2vModel} onValueChange={setI2vModel} disabled={isLoadingModels || filteredVideoModels.length === 0}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue>
                                {i2vModel ? filteredVideoModels.find(m => m.id === i2vModel)?.name :
                                  (isLoadingModels ? t('common.loading') : t('common.selectModel'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {filteredVideoModels.length > 0 ? (
                                filteredVideoModels.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium">{m.name}</span>
                                      <span className="text-xs text-muted-foreground">{m.description}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="loading" disabled>
                                  {isLoadingModels ? t('common.loading') : t('common.selectModel')}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('imageToVideo.aspectRatio')}</label>
                          <Select value={i2vAspectRatio} onValueChange={setI2vAspectRatio}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {i2vModel && filteredVideoModels.find(m => m.id === i2vModel)?.supportedAspectRatios?.length ? (
                                filteredVideoModels.find(m => m.id === i2vModel)?.supportedAspectRatios?.map((ratio) => (
                                  <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="adaptive">adaptive</SelectItem>
                                  <SelectItem value="16:9">16:9</SelectItem>
                                  <SelectItem value="9:16">9:16</SelectItem>
                                  <SelectItem value="1:1">1:1</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('imageToVideo.duration')}</label>
                          <Select value={i2vDuration} onValueChange={setI2vDuration}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {i2vModel && filteredVideoModels.find(m => m.id === i2vModel)?.supportedAspectDuration?.length ? (
                                filteredVideoModels.find(m => m.id === i2vModel)?.supportedAspectDuration?.map((duration) => (
                                  <SelectItem key={duration} value={String(duration)}>{duration} {t('common.seconds')}</SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="5">5 {t('common.seconds')}</SelectItem>
                                  <SelectItem value="8">8 {t('common.seconds')}</SelectItem>
                                  <SelectItem value="12">12 {t('common.seconds')}</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">{t('imageToVideo.resolution')}</label>
                          <Select value={i2vResolution} onValueChange={setI2vResolution}>
                            <SelectTrigger className="border-gray-200 dark:border-border hover:border-purple-400 dark:hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {i2vModel && filteredVideoModels.find(m => m.id === i2vModel)?.supportedResolutions?.length ? (
                                filteredVideoModels.find(m => m.id === i2vModel)?.supportedResolutions?.map((res) => (
                                  <SelectItem key={res} value={res}>{res}</SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="480p">480p</SelectItem>
                                  <SelectItem value="720p">720p</SelectItem>
                                  <SelectItem value="1080p">1080p</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* 音频开关 - Seedance models don't support audio */}
                      {!i2vModel?.toLowerCase().includes('seedance') && (
                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                          <div className="flex-1">
                            <label className="text-sm font-medium">{t('imageToVideo.enableAudio')}</label>
                            <p className="text-xs text-muted-foreground mt-1">{t('imageToVideo.enableAudioHint')}</p>
                          </div>
                          <Switch
                            checked={i2vEnableAudio}
                            onCheckedChange={setI2vEnableAudio}
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleI2VGenerate}
                      disabled={!i2vPrompt || !referenceImageUrl || isGeneratingI2V || isUploadingImage}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none transition-all rounded-lg font-medium"
                      size="lg"
                    >
                      {isUploadingImage ? `${t('imageToVideo.uploading')} ${uploadProgress}%` : isGeneratingI2V ? `${t('imageToVideo.generating')} ${i2vProgress}%` : t('imageToVideo.generateButton')}
                    </Button>

                    {/* 积分显示 */}
                    {i2vModel && (() => {
                      const credits = calculateCredits(i2vModel, i2vDuration, i2vResolution, i2vEnableAudio);
                      if (credits > 0) {
                        return (
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                            <div className="text-muted-foreground font-medium">
                              Credits: {credits} ⚡
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {i2vTaskId && (
                      <div className="text-center pt-2 border-t border-border">
                        <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">
                          Task ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{i2vTaskId}</code>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Panel */}
                  <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 dark:from-gray-900/30 dark:to-purple-900/10 rounded-2xl p-12 flex items-center justify-center min-h-[500px] border-2 border-dashed border-gray-300 dark:border-gray-700">
                    {isGeneratingI2V ? (
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">{t('common.generatingMessage')}</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">{t('common.generatingHint')}</p>
                        {i2vProgress > 0 && (
                          <div className="mt-4">
                            <div className="w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                                style={{ width: `${i2vProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{i2vProgress}%</p>
                          </div>
                        )}
                      </div>
                    ) : generatedI2VVideo ? (
                      <div className="w-full">
                        <video
                          src={generatedI2VVideo}
                          controls
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                        <div className="mt-4 flex gap-2 justify-center">
                          <Button
                            onClick={() => window.open(generatedI2VVideo, '_blank')}
                            variant="outline"
                            size="sm"
                            className="hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                          >
                            {t('common.openFullSize')}
                          </Button>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = generatedI2VVideo;
                              link.download = `i2v-${Date.now()}.mp4`;
                              link.click();
                            }}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg transition-all"
                          >
                            {t('common.download')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <svg
                          className="w-32 h-32 mx-auto mb-6 opacity-30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-lg text-gray-500 dark:text-gray-400 font-light">{t('imageToVideo.resultPlaceholder')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Veo Model Features - Only show for veo/google-veo/veo-3 route */}
        {(routeModel === 'veo' || routeModel === 'google-veo' || routeModel === 'veo-3') && (
          <>
            {/* Feature 1: Advanced Physics Understanding */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20"></div>
              <div className="container mx-auto px-4 py-20 relative">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900 dark:text-foreground">
                  {t('veo.features.physics.title')}
                </h2>
                <p className="text-center text-gray-600 dark:text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
                  {t('veo.features.physics.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 dark:border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">{t('veo.features.physics.titleBold1')}</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {t('veo.features.physics.physics_desc')}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 dark:border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">{t('veo.features.physics.titleBold2')}</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {t('veo.features.physics.human_motion_desc')}
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </section>

            {/* Feature 2: Native Audio Generation */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-950/20 dark:via-background dark:to-blue-950/20"></div>
              <div className="container mx-auto px-4 py-20 relative">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900 dark:text-foreground">
                  {t('veo.features.audio.title')}
                </h2>
                <p className="text-center text-gray-600 dark:text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
                  {t('veo.features.audio.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 border border-gray-100 dark:border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-lg text-foreground">{t('veo.features.audio.sound_effects_title')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('veo.features.audio.sound_effects_desc')}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 border border-gray-100 dark:border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-lg text-foreground">{t('veo.features.audio.ambient_noise_title')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('veo.features.audio.ambient_noise_desc')}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 border border-gray-100 dark:border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-lg text-foreground">{t('veo.features.audio.dialogue_title')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('veo.features.audio.dialogue_desc')}
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </section>

            {/* Feature 3: Professional Editing and Creative Control */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-pink-950/20 dark:via-background dark:to-purple-950/20"></div>
              <div className="container mx-auto px-4 py-20 relative">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900 dark:text-foreground">
                  {t('veo.features.editing.title')}
                </h2>
                <p className="text-center text-gray-600 dark:text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
                  {t('veo.features.editing.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">{t('veo.features.editing.titleBold1')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('veo.features.editing.flow_integration_desc')}
                    </p>
                  </div>
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">{t('veo.features.editing.titleBold2')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('veo.features.editing.editing_tools_desc')}
                    </p>
                  </div>
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">{t('veo.features.editing.titleBold3')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('veo.features.editing.cinematic_control_desc')}
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </section>
          </>
        )}

        {/* Seedance Model Features - Only show for doubao-seedance route */}
        {routeModel === 'doubao-seedance' && (
          <>
            {/* Feature 1: 指令深度解析 */}
            <section className="container mx-auto px-4 py-16 bg-card">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900 dark:text-foreground">
                  {t('seedance.features.instruction.title')}
                </h2>
                <p className="text-center text-gray-600 dark:text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
                  {t('seedance.features.instruction.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <video
                      src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lm_sth/ljhwZthlaukjlkulzlp/ark/model_introduction/seedance/pro-fast/main/video1_batch.mp4"
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <video
                      src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lm_sth/ljhwZthlaukjlkulzlp/ark/model_introduction/seedance/pro-fast/main/video2_batch.mp4"
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <video
                      src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lm_sth/ljhwZthlaukjlkulzlp/ark/model_introduction/seedance/pro-fast/main/video3_batch.mp4"
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Feature 2: 多镜头叙事 */}
            <section className="container mx-auto px-4 py-16 bg-muted/20">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900 dark:text-foreground">
                  {t('seedance.features.multiShot.title')}
                </h2>
                <p className="text-center text-gray-600 dark:text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
                  {t('seedance.features.multiShot.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <video
                      src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lm_sth/ljhwZthlaukjlkulzlp/ark/model_introduction/seedance/pro-fast/main/video4_batch.mp4"
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <video
                      src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lm_sth/ljhwZthlaukjlkulzlp/ark/model_introduction/seedance/pro-fast/main/video5_batch.mp4"
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <video
                      src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lm_sth/ljhwZthlaukjlkulzlp/ark/model_introduction/seedance/pro-fast/main/video6_batch.mp4"
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Feature 3: 细节表现与风格保持 */}
            <section className="container mx-auto px-4 py-16 bg-card">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900 dark:text-foreground">
                  {t('seedance.features.detail.title')}
                </h2>
                <p className="text-center text-gray-600 dark:text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
                  {t('seedance.features.detail.description')}
                </p>
              </div>
            </section>
          </>
        )}

        {/* How to Use Section */}
        <section className="container mx-auto px-4 py-16 bg-card">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-foreground">{t('howToUse.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-5 text-xl font-bold shadow-lg transform hover:scale-110 transition-transform">
                  1
                </div>
                <p className="text-sm">{t('howToUse.step1')}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-5 text-xl font-bold shadow-lg transform hover:scale-110 transition-transform">
                  2
                </div>
                <p className="text-sm">{t('howToUse.step2')}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-5 text-xl font-bold shadow-lg transform hover:scale-110 transition-transform">
                  3
                </div>
                <p className="text-sm">{t('howToUse.step3')}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-5 text-xl font-bold shadow-lg transform hover:scale-110 transition-transform">
                  4
                </div>
                <p className="text-sm">{t('howToUse.step4')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-background dark:to-gray-900/20 py-20">
          <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4 text-foreground">
              {routeModel === 'doubao-seedance' ? t('seedance.faq.title') :
               (routeModel === 'veo' || routeModel === 'google-veo' || routeModel === 'veo-3') ? t('veo.faq.title') :
               t('faq.title')}
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              {routeModel === 'doubao-seedance' ? t('seedance.faq.subtitle') :
               (routeModel === 'veo' || routeModel === 'google-veo' || routeModel === 'veo-3') ? t('veo.faq.subtitle') :
               t('faq.subtitle')}
            </p>

            <Accordion type="single" collapsible className="w-full">
              {routeModel === 'doubao-seedance' ? (
                <>
                  <AccordionItem value="item-1" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('seedance.faq.q1.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('seedance.faq.q1.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('seedance.faq.q2.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('seedance.faq.q2.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('seedance.faq.q3.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('seedance.faq.q3.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('seedance.faq.q4.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('seedance.faq.q4.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('seedance.faq.q5.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('seedance.faq.q5.answer')}
                    </AccordionContent>
                  </AccordionItem>
                </>
              ) : (routeModel === 'veo' || routeModel === 'google-veo' || routeModel === 'veo-3') ? (
                <>
                  <AccordionItem value="item-1" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('veo.faq.q1.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('veo.faq.q1.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('veo.faq.q2.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('veo.faq.q2.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('veo.faq.q3.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('veo.faq.q3.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('veo.faq.q4.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('veo.faq.q4.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('veo.faq.q5.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('veo.faq.q5.answer')}
                    </AccordionContent>
                  </AccordionItem>
                </>
              ) : (
                <>
                  <AccordionItem value="item-1" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('faq.q1.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('faq.q1.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('faq.q2.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('faq.q2.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('faq.q3.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('faq.q3.answer')}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="border-b border-border">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold text-foreground">{t('faq.q4.question')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {t('faq.q4.answer')}
                    </AccordionContent>
                  </AccordionItem>
                </>
              )}
            </Accordion>
          </div>
          </div>
        </section>

        {/* Text to Video - Translate Dialog */}
        <Dialog open={isT2vTranslateDialogOpen} onOpenChange={setIsT2vTranslateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Translate Prompt</DialogTitle>
              <DialogDescription>
                Choose your target language for translation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Target Language</label>
                <Select value={t2vTargetLanguage} onValueChange={setT2vTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsT2vTranslateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleT2vTranslate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Languages className="h-4 w-4 mr-2" />
                Translate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image to Video - Translate Dialog */}
        <Dialog open={isI2vTranslateDialogOpen} onOpenChange={setIsI2vTranslateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Translate Prompt</DialogTitle>
              <DialogDescription>
                Choose your target language for translation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Target Language</label>
                <Select value={i2vTargetLanguage} onValueChange={setI2vTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsI2vTranslateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleI2vTranslate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Languages className="h-4 w-4 mr-2" />
                Translate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
