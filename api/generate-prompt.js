// api/generate-prompt.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { productName, refImages } = await req.json();
    if (!productName) throw new Error('缺少产品名称');
    if (!refImages || refImages.length === 0) throw new Error('未提供商品参考图');

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error('环境变量 DASHSCOPE_API_KEY 未设置');

    // 只使用第一张图作为分析对象（节省 token）
    const primaryImage = refImages[0]; // data:image/... Base64

    // 给视觉模型的指令：分析图片，生成6个详情页提示词
    const systemPrompt = `你是一名电商详情页设计师，请仔细观察商品图片中的产品外观、材质、颜色、风格、可能的使用场景。根据产品名称“${productName}”和图片内容，生成6张独立电商详情页图片的AI绘画提示词。
每张图片的要求：
- 第1张：首屏主图，展示产品整体，背景干净柔和，突出视觉冲击，底部有“立即抢购”按钮，主标题简短吸引人。
- 第2张：核心卖点汇总图，C4D风格，2.5D图标排列展示3-6个核心卖点，每个图标下有小字说明。
- 第3张：痛点对比图，左右分栏，左侧灰暗展示使用前痛点，右侧明亮展示使用本产品后的效果，底部有对比文案。
- 第4张：材质/细节特写图，微距展示产品质感或设计亮点，配卖点关键词。
- 第5张：信任背书图，展示检测报告、认证标志、用户好评等，增强信任感。
- 第6张：行动引导图，价格优惠标签、赠品展示、购买按钮，突出促销氛围。

通用要求：所有图片统一尺寸为“宽790px，9:16比例，2K分辨率”，风格温馨、商业摄影级光线，阿里巴巴普惠体文字，无品牌LOGO，右下角放置暖橙盾牌+白色对勾图标。
请直接输出一个JSON数组，包含6个字符串，分别对应第1-6张图片的完整提示词。只输出JSON数组，不要任何解释。`;

    // 调用 qwen-vl-max 视觉模型（同步请求，快速返回）
    const visionRes = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-vl-max',
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  { text: systemPrompt },
                  { image: primaryImage }
                ]
              }
            ]
          },
          parameters: {
            temperature: 0.8,
            top_p: 0.9,
          }
        }),
      }
    );

    const visionData = await visionRes.json();
    const fullResponse = visionData.output?.choices?.[0]?.message?.content?.[0]?.text;
    if (!fullResponse) {
      throw new Error('视觉模型返回空，完整响应：' + JSON.stringify(visionData));
    }

    // 清理可能的 markdown 代码块
    let cleanText = fullResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // 尝试提取 JSON 数组
    let prompts = [];
    try {
      prompts = JSON.parse(cleanText);
    } catch {
      // 如果直接解析失败，用正则提取第一个数组
      const match = cleanText.match(/\[([\s\S]*?)\]/);
      if (match) {
        prompts = JSON.parse(match[0]);
      } else {
        throw new Error('无法从视觉模型返回中提取提示词数组');
      }
    }

    if (!Array.isArray(prompts) || prompts.length < 6) {
      throw new Error('视觉模型返回的提示词不足6条，实际：' + JSON.stringify(prompts));
    }

    // 确保正好6条
    prompts = prompts.slice(0, 6);

    return new Response(
      JSON.stringify({ prompts }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}