// api/generate.js
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { productName, imageIndex } = await req.json();
    if (!productName || imageIndex === undefined) {
      throw new Error('缺少 productName 或 imageIndex');
    }

    const prompts = [
      `${productName}，干净的白底展示图，专业产品摄影，柔和光线`,
      `${productName}，多角度卖点展示，功能标签可视化，电商风格`,
      `${productName}，痛点对比场景，使用前后对比，高清写实`,
      `${productName}，细节特写图，突出材质与工艺，微距拍摄`,
      `${productName}，信任背书图，搭配认证标志与好评标签`,
      `${productName}，行动引导图，限时优惠与购买按钮，促销氛围`,
    ];

    const prompt = prompts[imageIndex];
    if (!prompt) throw new Error('无效的图片索引');

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error('环境变量 DASHSCOPE_API_KEY 未设置');

    // 调用通义万象 API
    const aliRes = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt },
          parameters: { size: '1024*1024', n: 1 },
        }),
      }
    );

    const aliData = await aliRes.json();

    // 检查阿里云返回的错误
    if (!aliRes.ok || aliData.code) {
      const errorMsg = aliData.message || aliData.code || '未知阿里云错误';
      throw new Error(`阿里云API错误：${errorMsg}`);
    }

    const tempUrl = aliData.output?.results?.[0]?.url;
    if (!tempUrl) {
      throw new Error(`阿里云返回成功但缺少图片URL：${JSON.stringify(aliData)}`);
    }

    // 下载图片并转为 Base64
    const imageRes = await fetch(tempUrl, {
      headers: { 'User-Agent': 'Vercel-Edge-Function' }, // 避免被 OSS 拦截
    });
    if (!imageRes.ok) {
      throw new Error(`下载图片失败，HTTP状态码：${imageRes.status}`);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);
    const mime = imageRes.headers.get('content-type') || 'image/png';
    const base64Url = `data:${mime};base64,${base64}`;

    return new Response(
      JSON.stringify({ imageUrl: base64Url, imageIndex }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('生成失败:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}