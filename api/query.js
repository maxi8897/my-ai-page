// api/query.js
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('taskId');
  if (!taskId) {
    return new Response(JSON.stringify({ error: '缺少 taskId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error('环境变量 DASHSCOPE_API_KEY 未设置');

    const res = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    const data = await res.json();
    const taskStatus = data.output?.task_status;

    if (taskStatus === 'SUCCEEDED') {
      const imageUrl = data.output.results?.[0]?.url;
      if (!imageUrl) throw new Error('任务成功但未返回图片 URL');

      // 下载图片并转为 Base64，确保永久有效
      const imageRes = await fetch(imageUrl);
      const arrayBuffer = await imageRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(b => (binary += String.fromCharCode(b)));
      const base64 = btoa(binary);
      const mime = imageRes.headers.get('content-type') || 'image/png';
      const base64Url = `data:${mime};base64,${base64}`;

      return new Response(
        JSON.stringify({ status: 'SUCCEEDED', imageUrl: base64Url }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (taskStatus === 'FAILED') {
      throw new Error(data.output?.message || '任务执行失败');
    } else {
      // PENDING 或 RUNNING
      return new Response(
        JSON.stringify({ status: 'PENDING' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}