import { NextResponse } from 'next/server';

const videoModels = [
  {
    id: 'veo3.1-fast',
    name: 'Veo 3.1',
    description: 'High-quality video generation model with audio support',
    maxDuration: 8,
    supportedResolutions: ['720p', '1080p', '4K'],
    supportedAspectRatios: ['16:9', '9:16'],
    supportedAspectDuration: [8],
  },
];

export async function GET() {
  return NextResponse.json({
    code: 1000,
    message: 'success',
    data: videoModels,
  });
}
