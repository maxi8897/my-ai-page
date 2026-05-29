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

    // 步骤 1: 创建异步任务，获取 task_id
    console.log('正在创建异步任务...');
    const createRes = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable', // 关键！启用异步调用
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt },
          parameters: { size: '1024*1024', n: 1 },
        }),
      }
    );

    const createData = await createRes.json();
    if (createData.code) {
      throw new Error(`创建任务失败：${createData.message}`);
    }
    
    const taskId = createData.output?.task_id;
    if (!taskId) {
      throw new Error('未获取到 task_id');
    }
    console.log(`异步任务已创建，task_id: ${taskId}`);

    // 步骤 2: 轮询查询任务结果（最多尝试 15 次，每次间隔 2 秒）
    let imageUrl = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
      
      console.log(`第 ${i + 1} 次查询任务状态...`);
      const queryRes = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      
      const queryData = await queryRes.json();
      const taskStatus = queryData.output?.task_status;
      console.log(`任务状态：${taskStatus}`);
      
      if (taskStatus === 'SUCCEEDED') {
        const results = queryData.output.results;
        if (results && results.length > 0) {
          imageUrl = results[0].url;
          break; // 成功获取到图片 URL，退出轮询
        }
      } else if (taskStatus === 'FAILED') {
        throw new Error(`任务执行失败：${queryData.output.message || '未知错误'}`);
      } else if (taskStatus === 'CANCELED' || taskStatus === 'UNKNOWN') {
        throw new Error(`任务状态异常：${taskStatus}`);
      }
      // 如果是 PENDING 或 RUNNING，继续轮询
    }

    if (!imageUrl) {
      throw new Error('轮询超时，未能获取到图片');
    }

    // 步骤 3: 下载图片并转为 Base64（和之前一样）
    console.log('正在下载图片...');
    const imageRes = await fetch(imageUrl);
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