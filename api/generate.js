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
    if (!productName && imageIndex === undefined) {
      throw new Error('缺少必要参数');
    }

    // 直接获取并检查 API Key
    const apiKey = process.env.DASHSCOPE_API_KEY;
    
    // 返回调试信息（看看 Key 是否存在）
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: '环境变量 DASHSCOPE_API_KEY 为空或未设置' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 如果 Key 存在，返回前 8 位用于确认（安全，不会泄露完整 Key）
    const keyPreview = apiKey.substring(0, 8);
    
    // 先不做图片生成，只返回 Key 的前缀确认读取成功
    return new Response(
      JSON.stringify({ message: `API Key 读取成功，前缀为：${keyPreview}...` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}