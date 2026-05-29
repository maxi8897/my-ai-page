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

    // 创建异步任务（带上 X-DashScope-Async: enable）
    const res = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt },
          parameters: { size: '1024*1024', n: 1 },
        }),
      }
    );

    const data = await res.json();
    if (data.code) {
      throw new Error(`创建任务失败：${data.message}`);
    }

    const taskId = data.output?.task_id;
    if (!taskId) throw new Error('未返回 task_id');

    return new Response(
      JSON.stringify({ taskId, imageIndex }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}