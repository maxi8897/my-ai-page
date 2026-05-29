// api/refine.js
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { productName, userPrompt } = await req.json();
    const fullPrompt = `${productName}，${userPrompt}`;

    const aliRes = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt: fullPrompt },
          parameters: { size: '1024*1024', n: 1 },
        }),
      }
    );

    const aliData = await aliRes.json();
    const tempUrl = aliData.output?.results?.[0]?.url;
    if (!tempUrl) throw new Error(aliData.message || '调试生成失败');

    const imageRes = await fetch(tempUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);
    const mime = imageRes.headers.get('content-type') || 'image/png';
    const base64Url = `data:${mime};base64,${base64}`;

    return new Response(
      JSON.stringify({ imageUrl: base64Url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}