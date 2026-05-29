// api/generate-prompt.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { productName } = await req.json();
    if (!productName) throw new Error('缺少产品名称');

    const prompts = [
      `${productName} 电商详情页首屏主图，45度角展示，暖橙色柔光，产品居中，渐变浅蓝到浅粉背景，右下角暖橙盾牌+白色对勾标识，底部半透明黑色按钮写“立即抢购”，主标题“防烫不锈钢｜宝宝喂饭不烫手”用阿里巴巴普惠体，清晰无锯齿，温馨可爱风格，2K分辨率，宽790px，9:16比例，无品牌LOGO。`,
      `${productName} 电商卖点汇总图，C4D风格2.5D图标6个，2行3列排列在白色圆角卡片中，浅灰背景，每个图标下方小字说明卖点（如“316L不锈钢”“防摔防烫”），图标色彩鲜艳，底部暖橙盾牌+白色对勾，宽790px，9:16，2K，阿里巴巴普惠体，无品牌LOGO。`,
      `${productName} 痛点对比图，左右分栏，左灰暗调（普通产品使用场景，宝宝哭闹，红色叉号），右明亮暖调（本产品使用场景，宝宝开心，绿色对勾），中间虚线分隔，底部文字“告别烫手！宝宝自主吃饭”，阿里巴巴普惠体，右下角暖橙盾牌+白色对勾，宽790px，9:16，2K。`,
      `${productName} 不锈钢内壁特写，金属反光质感，深灰背景，侧光突出纹理，左侧文字“316L耐摔防烫”，右侧防烫图标（水滴+盾牌），底部暖橙盾牌+白色对勾，宽790px，9:16，2K，阿里巴巴普惠体，无LOGO。`,
      `${productName} 信任背书图，白背景，检测报告单（示意，文字清晰），3条手写风格客户好评（“宝妈强烈推荐”“清洗超方便”），顶部大字“FDA认证｜98%宝妈推荐”，底部暖橙盾牌+白色对勾，宽790px，9:16，2K，阿里巴巴普惠体，无品牌LOGO。`,
      `${productName} 促销引导图，产品与赠品组合展示，右上角红色爆炸贴“限时优惠”，中间价格对比（原价划掉，现价标红），底部橙色按钮“立即抢购”，下方小字“7天试用 15天退货”，右下角暖橙盾牌+白色对勾，宽790px，9:16，2K，阿里巴巴普惠体，温馨风格。`,
    ];

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