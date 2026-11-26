// 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-26 | 大模型：Auto
// 文件说明：Supabase Edge Function「sun-chat」
//          云端 AI 聊天：会话与消息持久化在 Supabase Postgres，
//          对 LLM API 的调用全部在本函数内完成（前端不接触任何模型密钥）；
//          未配置 SUN_LLM_API_KEY 时自动降级为内置规则引擎，保证功能可用
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUN_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sunJson(sunBody: unknown, sunStatus = 200) {
  return new Response(JSON.stringify(sunBody), {
    status: sunStatus,
    headers: { ...SUN_CORS, "Content-Type": "application/json" },
  });
}

/** 云端内置规则引擎（未配置 LLM Key 时的回复生成器） */
function sunRuleReply(sunText: string): string {
  const sunT = sunText.toLowerCase();
  if (/价格|多少钱|费用|贵不贵|价位/.test(sunT)) {
    return "云栖民宿的房型价格如下：山景大床房 588 元/晚、亲子木屋 788 元/晚、竹林庭院套房 1088 元/晚；节假日会有小幅上浮，连住 2 晚享 9 折。需要我帮您估算具体日期的费用吗？";
  }
  if (/预订|订房|预定|入住|有空房|房间|订个/.test(sunT)) {
    return "预订很方便：在本平台「在线预订」页选择日期与房型提交即可，提交后 10 分钟内管家会电话确认；也可直接致电前台。目前本月周末房源较紧张，建议提前 3 天预订。";
  }
  if (/退|取消|退款|改期/.test(sunT)) {
    return "退改政策：入住前 48 小时以上取消可全额退款；48 小时内取消收取首晚 30% 作为违约金；未入住且未取消不退款。如遇极端天气等不可抗力，可提供凭证免费改期。";
  }
  if (/泳池|停车|车位|wifi|早餐|设施|空调|投影/.test(sunT)) {
    return "民宿设施一览：免费停车场（约 20 个车位）、无边泳池（9:00-21:00 开放）、全屋千兆 WiFi、自助早餐（7:30-10:00，含现煮面档）、山景茶室与儿童游乐角，房间均配智能空调与投影仪。";
  }
  if (/位置|地址|交通|怎么走|地图|远不远|机场|高铁/.test(sunT)) {
    return "我们位于杭州市西湖区转塘街道云栖竹径旁，导航「云栖民宿」即可：地铁 6 号线云栖站 A 口步行 8 分钟；萧山机场车程约 50 分钟，可预约付费接送。";
  }
  if (/景点|周边|玩|游玩|爬山|茶园|推荐/.test(sunT)) {
    return "周边推荐：云栖竹径步道（步行 5 分钟）、梅家坞茶园（车程 10 分钟，可体验炒茶）、宋城千古情（车程 15 分钟）、灵隐寺（车程 25 分钟）。管家可帮您规划一日游路线。";
  }
  if (/你好|您好|hi|hello|在吗|早上好|晚上好/.test(sunT)) {
    return "您好，我是云栖民宿的 AI 管家小栖😊 关于房型价格、预订流程、周边玩法都可以直接问我～";
  }
  if (/谢谢|感谢|thanks/.test(sunT)) {
    return "不客气，祝您入住愉快！有任何需要随时找我～";
  }
  return "收到您的消息啦～我是云栖民宿 AI 管家。您可以问我：房型与价格、预订与退改政策、设施（泳池/停车/早餐）、位置交通、周边景点推荐。请问想了解哪方面呢？";
}

/** 会话上下文：取最近 8 条消息拼成 OpenAI 兼容报文 */
async function sunFetchHistory(
  sunDbUrl: string,
  sunKey: string,
  sunSessionId: string,
): Promise<Array<{ role: string; content: string }>> {
  const sunUrl = `${sunDbUrl}/sun_chat_messages?select=sun_role,sun_content&sun_session_id=eq.${sunSessionId}&order=sun_id.desc&limit=8`;
  const sunRes = await fetch(sunUrl, {
    headers: { apikey: sunKey, Authorization: `Bearer ${sunKey}` },
  });
  if (!sunRes.ok) return [];
  const sunRows = (await sunRes.json()) as Array<{ sun_role: string; sun_content: string }>;
  return sunRows.reverse().map((sunRow) => ({ role: sunRow.sun_role, content: sunRow.sun_content }));
}

/** 调用 LLM API（OpenAI 兼容协议，密钥只存在于 Edge Function 环境变量） */
async function sunCallLlm(
  sunMessages: Array<{ role: string; content: string }>,
): Promise<{ sunReply: string; sunModel: string; sunUsage: unknown }> {
  const sunApiKey = Deno.env.get("SUN_LLM_API_KEY")!;
  const sunBaseUrl = Deno.env.get("SUN_LLM_BASE_URL") ?? "https://api.siliconflow.cn/v1";
  const sunModel = Deno.env.get("SUN_LLM_MODEL") ?? "deepseek-ai/DeepSeek-V3";
  const sunSystem =
    "你是「云栖民宿」的 AI 管家小栖，热情、简洁、专业。解答房型价格（山景大床房 588、亲子木屋 788、竹林庭院套房 1088）、" +
    "预订与退改政策（48 小时前免费取消）、设施（免费停车/无边泳池/千兆 WiFi/自助早餐）、交通（地铁 6 号线云栖站 A 口步行 8 分钟）与周边景点。" +
    "非民宿问题也请礼貌回应并引导回住宿话题，回复控制在 200 字以内。";

  const sunRes = await fetch(`${sunBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sunApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: sunModel,
      messages: [{ role: "system", content: sunSystem }, ...sunMessages],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });
  if (!sunRes.ok) throw new Error(`LLM HTTP ${sunRes.status}`);
  const sunData = await sunRes.json();
  const sunReply = sunData?.choices?.[0]?.message?.content?.trim();
  if (!sunReply) throw new Error("LLM 空回复");
  return { sunReply, sunModel, sunUsage: sunData.usage ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SUN_CORS });
  if (req.method !== "POST") return sunJson({ code: 4000, msg: "仅支持 POST 请求" }, 405);

  const sunDbUrl = `${Deno.env.get("SUPABASE_URL")}/rest/v1`;
  const sunKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sunDbHeaders = {
    apikey: sunKey,
    Authorization: `Bearer ${sunKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  try {
    const sunBody = await req.json().catch(() => ({}));
    const sunMessage = String(sunBody?.sunMessage ?? "").trim();
    let sunSid = String(sunBody?.sunSessionId ?? "").trim();
    if (!sunMessage) return sunJson({ code: 4101, msg: "消息内容不能为空" }, 400);
    if (sunMessage.length > 2000) return sunJson({ code: 4102, msg: "消息长度超出限制（≤2000 字）" }, 400);

    // 1. 会话：不存在则创建（标题取首条消息前 30 字）
    let sunTitle = "";
    if (sunSid) {
      const sunCheck = await fetch(`${sunDbUrl}/sun_chat_sessions?select=sun_id,sun_title&sun_id=eq.${sunSid}`, {
        headers: { apikey: sunKey, Authorization: `Bearer ${sunKey}` },
      });
      const sunFound = await sunCheck.json();
      if (!Array.isArray(sunFound) || !sunFound.length) sunSid = "";
      else sunTitle = sunFound[0].sun_title;
    }
    if (!sunSid) {
      sunTitle = sunMessage.slice(0, 30);
      const sunCreate = await fetch(`${sunDbUrl}/sun_chat_sessions`, {
        method: "POST",
        headers: sunDbHeaders,
        body: JSON.stringify({ sun_title: sunTitle }),
      });
      if (!sunCreate.ok) throw new Error(`创建会话失败 HTTP ${sunCreate.status}`);
      const sunCreated = await sunCreate.json();
      sunSid = sunCreated[0].sun_id;
    }

    // 2. 落库用户消息
    await fetch(`${sunDbUrl}/sun_chat_messages`, {
      method: "POST",
      headers: sunDbHeaders,
      body: JSON.stringify({ sun_session_id: sunSid, sun_role: "user", sun_content: sunMessage, sun_engine: "-" }),
    });

    // 3. 生成回复：配置了 SUN_LLM_API_KEY 走真实 LLM API，否则降级规则引擎
    let sunReply = "";
    let sunEngine = "rule-engine";
    let sunModel = "-";
    let sunUsage: unknown = null;
    const sunHasLlm = !!Deno.env.get("SUN_LLM_API_KEY");
    if (sunHasLlm) {
      try {
        const sunHistory = await sunFetchHistory(sunDbUrl, sunKey, sunSid);
        const sunLlm = await sunCallLlm([...sunHistory, { role: "user", content: sunMessage }]);
        sunReply = sunLlm.sunReply;
        sunModel = sunLlm.sunModel;
        sunUsage = sunLlm.sunUsage;
        sunEngine = "llm-api";
      } catch (sunError) {
        console.error("[sun-chat] LLM 调用失败，降级规则引擎：", sunError.message);
      }
    }
    if (!sunReply) sunReply = sunRuleReply(sunMessage);

    // 4. 落库助手回复
    const sunSaveRes = await fetch(`${sunDbUrl}/sun_chat_messages`, {
      method: "POST",
      headers: sunDbHeaders,
      body: JSON.stringify({ sun_session_id: sunSid, sun_role: "assistant", sun_content: sunReply, sun_engine: sunEngine }),
    });
    if (!sunSaveRes.ok) throw new Error(`保存回复失败 HTTP ${sunSaveRes.status}`);

    return sunJson({
      code: 0,
      msg: "ok",
      data: { sunSessionId: sunSid, sunTitle, sunReply, sunEngine, sunModel, sunUsage },
    });
  } catch (sunError) {
    console.error("[sun-chat] 处理异常：", sunError);
    return sunJson({ code: 5000, msg: `服务异常：${sunError.message}` }, 500);
  }
});

