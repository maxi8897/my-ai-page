// api/generate.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { productName, imageIndex, refImages } = await req.json();
    if (!productName || imageIndex === undefined) throw new Error('缺少参数');
    if (!refImages || refImages.length === 0) throw new Error('未提供商品参考图');

    // 获取专业提示词
    const promptRes = await fetch(new URL('/api/generate-prompt', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName }),
    });
    const promptData = await promptRes.json();
    if (!promptData.prompts || !promptData.prompts[imageIndex]) {
      throw new Error('生成提示词失败');
    }
    const designPrompt = promptData.prompts[imageIndex];

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error('环境变量 DASHSCOPE_API_KEY 未设置');

    // 构建多图参考 content 数组
    const content = [];
    // 添加最多 3 张参考图
    refImages.slice(0, 3).forEach(img => {
      content.push({ image: img }); // Base64 格式
    });
    // 添加文字设计提示
    content.push({ text: designPrompt });

    const res = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'wan2.7-image-pro',
          input: {
            messages: [
              { role: 'user', content }
            ]
          },
          parameters: {
            size: '2K',
            n: 1,
            watermark: false,
            thinking_mode: true
          }
        }),
      }
    );

    const data = await res.json();
    if (data.code) throw new Error(`创建任务失败：${data.message}`);
    const taskId = data.output?.task_id;
    if (!taskId) throw new Error('未返回 task_id');

    return new Response(JSON.stringify({ taskId, imageIndex }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}