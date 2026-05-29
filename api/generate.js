// api/generate.js
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { productName } = await req.json();
    if (!productName) throw new Error('缺少产品名称');

    // 六张图的场景描述
    const prompts = [
      `${productName}，干净的白底展示图，专业产品摄影，柔和光线`,
      `${productName}，多角度卖点展示，功能标签可视化，电商风格`,
      `${productName}，痛点对比场景，使用前后对比，高清写实`,
      `${productName}，细节特写图，突出材质与工艺，微距拍摄`,
      `${productName}，信任背书图，搭配认证标志与好评标签`,
      `${productName}，行动引导图，限时优惠与购买按钮，促销氛围`,
    ];

    const apiKey = process.env.DASHSCOPE_API_KEY;
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
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
            input: { prompt: prompts[i] },
            parameters: { size: '1024*1024', n: 1 },
          }),
        }
      );

      const aliData = await aliRes.json();
      const tempUrl = aliData.output?.results?.[0]?.url;
      if (!tempUrl) {
        throw new Error(`第 ${i + 1} 张图生成失败：${aliData.message || '未知错误'}`);
      }

      // 下载并转 Base64
      const imageRes = await fetch(tempUrl);
      const arrayBuffer = await imageRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(b => (binary += String.fromCharCode(b)));
      const base64 = btoa(binary);
      const mime = imageRes.headers.get('content-type') || 'image/png';
      results.push(`data:${mime};base64,${base64}`);

      // 避免并发过高，稍作等待
      await new Promise(r => setTimeout(r, 1500));
    }

    return new Response(
      JSON.stringify({ imageUrls: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}