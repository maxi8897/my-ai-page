// api/query.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('taskId');
  if (!taskId) {
    return new Response(JSON.stringify({ error: '缺少 taskId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    const taskStatus = data.output?.task_status;

    if (taskStatus === 'SUCCEEDED') {
      const contents = data.output?.choices?.[0]?.message?.content || [];
      const imageItem = contents.find(item => item.type === 'image');
      if (!imageItem?.image) throw new Error('任务成功但未找到图片 URL');

      const imageUrl = imageItem.image;
      // 下载并转 Base64
      const imgRes = await fetch(imageUrl);
      const arrayBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(b => (binary += String.fromCharCode(b)));
      const base64 = btoa(binary);
      const mime = imgRes.headers.get('content-type') || 'image/png';
      const base64Url = `data:${mime};base64,${base64}`;

      return new Response(JSON.stringify({ status: 'SUCCEEDED', imageUrl: base64Url }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    } else if (taskStatus === 'FAILED') {
      throw new Error(data.output?.message || '任务执行失败');
    } else {
      return new Response(JSON.stringify({ status: 'PENDING' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}