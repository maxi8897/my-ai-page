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

    // 调用 generate-prompt
    const promptUrl = new URL('/api/generate-prompt', req.url).toString();
    console.log('正在调用 generate-prompt，URL:', promptUrl);
    const promptRes = await fetch(promptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, refImages: refImages.slice(0, 3) }), // 只传前3张
    });

    // 先获取文本，便于调试
    const promptText = await promptRes.text();
    console.log('generate-prompt 返回状态:', promptRes.status, '内容:', promptText);
    
    let promptData;
    try {
      promptData = JSON.parse(promptText);
    } catch (e) {
      throw new Error('generate-prompt 返回非 JSON：' + promptText.substring(0, 200));
    }

    if (!promptData.prompts || !promptData.prompts[imageIndex]) {
      throw new Error('生成提示词失败，返回数据：' + JSON.stringify(promptData));
    }

    const designPrompt = promptData.prompts[imageIndex];
    console.log('使用提示词:', designPrompt.substring(0, 100) + '...');

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error('环境变量 DASHSCOPE_API_KEY 未设置');

    // 构建多图参考 content
    const content = [];
    refImages.slice(0, 3).forEach(img => content.push({ image: img }));
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
            messages: [{ role: 'user', content }]
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
    if (data.code) throw new Error(`创建图片生成任务失败：${data.message}`);
    const taskId = data.output?.task_id;
    if (!taskId) throw new Error('未返回 task_id');

    return new Response(JSON.stringify({ taskId, imageIndex }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate 错误:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}