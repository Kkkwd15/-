/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-12 | 大模型：Auto
 * 文件说明：AI 聊天界面逻辑（会话加载、消息收发、打字动效、移动端抽屉）
 */
(function sunChatPage() {
  'use strict';

  const SUN_API = '/api/chat';

  /* ============ 状态 ============ */
  let sunCurrentSessionId = null;
  let sunSending = false;
  let sunUseKb = true;
  // 语音提问状态
  let sunVoiceRec = null;
  let sunVoiceOn = false;
  let sunVoiceFinal = '';
  let sunVoiceBase = '';
  const SUN_TIP_DEFAULT = 'Enter 发送 · Shift + Enter 换行 · 点击麦克风可语音提问（转文字后自动发送）';

  /* ============ DOM ============ */
  const sunEl = {
    sessionList: document.getElementById('sun_session_list'),
    messages: document.getElementById('sun_messages'),
    welcome: document.getElementById('sun_welcome'),
    title: document.getElementById('sun_chat_title'),
    input: document.getElementById('sun_input'),
    form: document.getElementById('sun_composer'),
    voiceBtn: document.getElementById('sun_btn_voice'),
    tip: document.getElementById('sun_composer_tip'),
    sendBtn: document.getElementById('sun_btn_send'),
    newBtn: document.getElementById('sun_btn_new'),
    deleteBtn: document.getElementById('sun_btn_delete'),
    kbBtn: document.getElementById('sun_btn_kb'),
    menuBtn: document.getElementById('sun_btn_menu'),
    sidebar: document.getElementById('sun_sidebar'),
    mask: document.getElementById('sun_mask')
  };

  /* ============ 工具函数 ============ */
  const sunEscapeHtml = (sunText) =>
    String(sunText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /** 轻量格式化：**加粗** 与 `代码` */
  const sunFormatText = (sunText) => {
    let sunHtml = sunEscapeHtml(sunText);
    sunHtml = sunHtml.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    sunHtml = sunHtml.replace(/`([^`]+)`/g, '<strong>$1</strong>');
    return sunHtml;
  };

  const sunFormatTime = (sunValue) => {
    if (!sunValue) return '';
    const sunDate = new Date(String(sunValue).replace(/-/g, '/'));
    if (Number.isNaN(sunDate.getTime())) return String(sunValue).slice(11, 16);
    const sunPad = (sunNum) => String(sunNum).padStart(2, '0');
    return `${sunPad(sunDate.getHours())}:${sunPad(sunDate.getMinutes())}`;
  };

  const sunScrollToBottom = () => {
    sunEl.messages.scrollTop = sunEl.messages.scrollHeight;
  };

  const sunToggleWelcome = (sunVisible) => {
    sunEl.welcome.style.display = sunVisible ? 'block' : 'none';
  };

  const sunSetSending = (sunValue) => {
    sunSending = sunValue;
    sunEl.sendBtn.disabled = sunValue;
  };

  /* ============ 消息渲染 ============ */
  function sunRenderMessage({ sunRole, sunContent, sunTime, sunSources = [] }) {
    const sunItem = document.createElement('article');
    sunItem.className = `sun_msg sun_msg--${sunRole === 'user' ? 'user' : 'ai'}`;

    const sunAvatar = document.createElement('span');
    sunAvatar.className = 'sun_msg__avatar';
    sunAvatar.textContent = sunRole === 'user' ? '孙' : '栖';

    const sunBody = document.createElement('div');
    sunBody.className = 'sun_msg__body';

    const sunBubble = document.createElement('div');
    sunBubble.className = 'sun_msg__bubble';
    sunBubble.innerHTML = sunFormatText(sunContent);

    const sunTimeEl = document.createElement('div');
    sunTimeEl.className = 'sun_msg__time';
    sunTimeEl.textContent = sunTime || sunFormatTime(new Date());

    sunBody.appendChild(sunBubble);

    if (sunSources && sunSources.length) {
      const sunSourceBox = document.createElement('div');
      sunSourceBox.className = 'sun_msg__sources';
      sunSourceBox.innerHTML = sunSources
        .map(
          (sunSource, sunIndex) =>
            `<div class="sun_msg__source">【${sunIndex + 1}】<b>《${sunEscapeHtml(sunSource.sunFileName)}》</b> · ${sunEscapeHtml(sunSource.sunSection)} · 片段 #${sunSource.sunChunkIndex} · 相似度 ${sunSource.sunScore}%</div>`
        )
        .join('');
      sunBody.appendChild(sunSourceBox);
    }

    sunBody.appendChild(sunTimeEl);
    sunItem.appendChild(sunAvatar);
    sunItem.appendChild(sunBody);
    sunEl.messages.appendChild(sunItem);

    sunScrollToBottom();
    return sunItem;
  }

  /** 打字指示气泡 */
  function sunShowTyping() {
    const sunItem = document.createElement('article');
    sunItem.className = 'sun_msg sun_msg--ai';
    sunItem.id = 'sun_typing_item';
    sunItem.innerHTML = `
      <span class="sun_msg__avatar">栖</span>
      <div class="sun_msg__body">
        <div class="sun_msg__bubble">
          <span class="sun_typing"><span></span><span></span><span></span></span>
        </div>
      </div>`;
    sunEl.messages.appendChild(sunItem);
    sunScrollToBottom();
    return sunItem;
  }

  function sunRemoveTyping() {
    const sunTyping = document.getElementById('sun_typing_item');
    if (sunTyping) sunTyping.remove();
  }

  /* ============ 会话列表 ============ */
  function sunRenderSessions(sunList) {
    sunEl.sessionList.innerHTML = '';

    if (!sunList.length) {
      const sunEmpty = document.createElement('li');
      sunEmpty.className = 'sun_session';
      sunEmpty.innerHTML = '<p class="sun_session__meta" style="padding:10px 12px;">暂无历史会话，点击上方按钮开始</p>';
      sunEl.sessionList.appendChild(sunEmpty);
      return;
    }

    sunList.forEach((sunSession) => {
      const sunLi = document.createElement('li');
      sunLi.className = 'sun_session';

      const sunBtn = document.createElement('button');
      sunBtn.type = 'button';
      sunBtn.className = 'sun_session__btn';
      if (sunSession.sun_id === sunCurrentSessionId) {
        sunBtn.classList.add('sun_session__btn--active');
      }
      sunBtn.innerHTML = `
        <span class="sun_session__title">${sunEscapeHtml(sunSession.sun_title)}</span>
        <span class="sun_session__meta">${sunSession.sun_message_count} 条消息 · ${sunFormatTime(sunSession.sun_updated_at)}</span>`;

      const sunDel = document.createElement('button');
      sunDel.type = 'button';
      sunDel.className = 'sun_session__del';
      sunDel.title = '删除该会话';
      sunDel.innerHTML = '&times;';

      sunDel.addEventListener('click', (sunEvent) => {
        sunEvent.stopPropagation();
        sunDeleteSession(sunSession.sun_id);
      });

      sunBtn.appendChild(sunDel);
      sunBtn.addEventListener('click', () => {
        sunOpenSession(sunSession.sun_id);
        sunCloseSidebar();
      });

      sunLi.appendChild(sunBtn);
      sunEl.sessionList.appendChild(sunLi);
    });
  }

  async function sunLoadSessions() {
    try {
      const sunRes = await fetch(`${SUN_API}/sessions`);
      const sunJson = await sunRes.json();
      console.log('[sun_chat] GET /api/chat/sessions ->', sunJson);

      if (sunJson.code !== 0) {
        throw new Error(sunJson.msg || '会话列表加载失败');
      }
      sunRenderSessions(sunJson.data.sunList || []);
      return sunJson.data.sunList || [];
    } catch (sunError) {
      console.error('[sun_chat] 会话列表加载失败：', sunError);
      sunEl.sessionList.innerHTML = '<li class="sun_session"><p class="sun_session__meta" style="padding:10px 12px;">会话列表加载失败，请确认后端已启动</p></li>';
      return [];
    }
  }

  /* ============ 打开会话 ============ */
  async function sunOpenSession(sunSessionId) {
    try {
      sunCurrentSessionId = sunSessionId;
      sunToggleWelcome(false);
      sunEl.messages.querySelectorAll('.sun_msg').forEach((sunNode) => sunNode.remove());

      const sunRes = await fetch(`${SUN_API}/sessions/${sunSessionId}/messages`);
      const sunJson = await sunRes.json();
      console.log(`[sun_chat] GET /api/chat/sessions/${sunSessionId}/messages ->`, sunJson);

      if (sunJson.code !== 0) {
        throw new Error(sunJson.msg || '消息加载失败');
      }

      const { sunSession, sunList } = sunJson.data;
      sunEl.title.textContent = sunSession.sun_title;

      if (!sunList.length) {
        sunToggleWelcome(true);
      } else {
        sunList.forEach((sunItem) => {
          sunRenderMessage({
            sunRole: sunItem.sun_role,
            sunContent: sunItem.sun_content,
            sunTime: sunFormatTime(sunItem.sun_created_at)
          });
        });
      }

      sunLoadSessions();
      sunScrollToBottom();
    } catch (sunError) {
      console.error('[sun_chat] 消息加载失败：', sunError);
      sunRenderMessage({ sunRole: 'ai', sunContent: `消息加载失败：${sunError.message}` });
    }
  }

  /* ============ 发送消息 ============ */
  async function sunSendMessage(sunText) {
    const sunContent = String(sunText || '').trim();
    if (!sunContent || sunSending) return;

    sunToggleWelcome(false);
    sunRenderMessage({ sunRole: 'user', sunContent });
    sunEl.input.value = '';
    sunEl.input.style.height = 'auto';
    sunSetSending(true);
    sunShowTyping();

    try {
      const sunRes = await fetch(`${SUN_API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sunSessionId: sunCurrentSessionId, sunContent, sunUseKb })
      });
      const sunJson = await sunRes.json();
      console.log('[sun_chat] POST /api/chat/messages ->', sunJson);

      if (sunJson.code !== 0) {
        throw new Error(sunJson.msg || '发送失败');
      }

      const { sunSession, sunAiMessage, sunIntent, sunReplyMs, sunSources } = sunJson.data;
      console.log(`[sun_chat] 意图=${sunIntent} 耗时=${sunReplyMs}ms 知识库引用=${(sunSources || []).length}`);

      sunCurrentSessionId = sunSession.sun_id;
      sunEl.title.textContent = sunSession.sun_title;

      // 模拟思考时间，让打字动效可见
      await new Promise((sunDone) => setTimeout(sunDone, 320));
      sunRemoveTyping();
      sunRenderMessage({ sunRole: 'ai', sunContent: sunAiMessage.sunContent, sunSources });
      sunLoadSessions();
    } catch (sunError) {
      console.error('[sun_chat] 消息发送失败：', sunError);
      sunRemoveTyping();
      sunRenderMessage({ sunRole: 'ai', sunContent: `抱歉，消息发送失败：${sunError.message}` });
    } finally {
      sunSetSending(false);
      sunEl.input.focus();
    }
  }

  /* ============ 新建 / 删除会话 ============ */
  function sunStartNewChat() {
    sunCurrentSessionId = null;
    sunEl.title.textContent = '新的对话';
    sunEl.messages.querySelectorAll('.sun_msg').forEach((sunNode) => sunNode.remove());
    sunToggleWelcome(true);
    sunLoadSessions();
    sunEl.input.focus();
    sunCloseSidebar();
    console.log('[sun_chat] 已切换到新对话');
  }

  async function sunDeleteSession(sunSessionId) {
    if (!window.confirm('确定删除该会话及其全部消息吗？')) return;
    try {
      const sunRes = await fetch(`${SUN_API}/sessions/${sunSessionId}`, { method: 'DELETE' });
      const sunJson = await sunRes.json();
      console.log(`[sun_chat] DELETE /api/chat/sessions/${sunSessionId} ->`, sunJson);

      if (sunJson.code !== 0) {
        throw new Error(sunJson.msg || '删除失败');
      }
      if (sunCurrentSessionId === sunSessionId) {
        sunStartNewChat();
      } else {
        sunLoadSessions();
      }
    } catch (sunError) {
      console.error('[sun_chat] 删除会话失败：', sunError);
      window.alert(`删除失败：${sunError.message}`);
    }
  }

  /* ============ 移动端抽屉 ============ */
  function sunOpenSidebar() {
    sunEl.sidebar.classList.add('sun_sidebar--open');
    sunEl.mask.hidden = false;
  }

  function sunCloseSidebar() {
    sunEl.sidebar.classList.remove('sun_sidebar--open');
    sunEl.mask.hidden = true;
  }

  /* ============ 输入框自适应高度 ============ */
  function sunAutoGrow() {
    sunEl.input.style.height = 'auto';
    sunEl.input.style.height = `${Math.min(sunEl.input.scrollHeight, 148)}px`;
  }

  /* ============ 事件绑定 ============ */
  /* ============ 语音提问（浏览器 SpeechRecognition） ============ */
  function sunSetTip(sunText, sunIsVoice) {
    if (!sunEl.tip) return;
    sunEl.tip.textContent = sunText;
    sunEl.tip.classList.toggle('sun_composer__tip--voice', !!sunIsVoice);
  }

  function sunSyncInput() {
    sunEl.input.value = `${sunVoiceBase}${sunVoiceFinal}`.trim();
    sunEl.input.style.height = 'auto';
    sunEl.input.style.height = `${Math.min(sunEl.input.scrollHeight, 148)}px`;
  }

  function sunInitVoiceChat() {
    const sunCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!sunCtor) {
      if (sunEl.voiceBtn) {
        sunEl.voiceBtn.disabled = true;
        sunEl.voiceBtn.title = '当前浏览器不支持语音识别，请使用 Chrome / Edge';
      }
      sunSetTip('当前浏览器不支持语音识别，请使用 Chrome / Edge 打开本页', false);
      console.warn('[sun_voice] 浏览器不支持 SpeechRecognition');
      return;
    }

    sunVoiceRec = new sunCtor();
    sunVoiceRec.lang = 'zh-CN';
    sunVoiceRec.continuous = true;
    sunVoiceRec.interimResults = true;

    sunVoiceRec.addEventListener('start', () => {
      sunVoiceOn = true;
      sunEl.voiceBtn.classList.add('sun_composer__voice--on');
      sunSetTip('正在聆听…再次点击麦克风结束并发送', true);
      console.log('[sun_voice] 开始语音输入');
    });

    sunVoiceRec.addEventListener('result', (sunEvent) => {
      let sunFinalPart = '';
      let sunInterimPart = '';
      for (let sunIndex = sunEvent.resultIndex; sunIndex < sunEvent.results.length; sunIndex += 1) {
        const sunResult = sunEvent.results[sunIndex];
        if (sunResult.isFinal) sunFinalPart += sunResult[0].transcript;
        else sunInterimPart += sunResult[0].transcript;
      }
      if (sunFinalPart) {
        sunVoiceFinal += sunFinalPart;
        console.log('[sun_voice] 转写 ->', sunVoiceFinal.trim());
      }
      // 实时把识别中的文字显示在输入框
      sunEl.input.value = `${sunVoiceBase}${sunVoiceFinal}${sunInterimPart}`.trim();
      sunEl.input.style.height = 'auto';
      sunEl.input.style.height = `${Math.min(sunEl.input.scrollHeight, 148)}px`;
      sunSetTip(sunInterimPart ? `识别中：${sunInterimPart}` : '正在聆听…再次点击麦克风结束并发送', true);
    });

    sunVoiceRec.addEventListener('error', (sunEvent) => {
      console.error('[sun_voice] 识别出错：', sunEvent.error);
      sunVoiceOn = false;
      sunEl.voiceBtn.classList.remove('sun_composer__voice--on');
      // 还原为说话前的输入内容，避免残留半句
      sunVoiceFinal = '';
      sunSyncInput();
      const sunErrorText = { 'not-allowed': '麦克风权限被拒绝，请在地址栏允许麦克风访问', 'no-speech': '没有检测到语音，请靠近麦克风再试', network: '语音服务网络异常，请检查网络后重试' }[sunEvent.error] || sunEvent.error;
      sunSetTip(`语音识别失败：${sunErrorText}`, false);
    });

    sunVoiceRec.addEventListener('end', () => {
      sunVoiceOn = false;
      sunEl.voiceBtn.classList.remove('sun_composer__voice--on');
      const sunSpoken = `${sunVoiceBase}${sunVoiceFinal}`.trim();
      sunVoiceFinal = '';
      if (sunSpoken) {
        sunSetTip(`已转写：“${sunSpoken.slice(0, 24)}${sunSpoken.length > 24 ? '…' : ''}”，正在发送`, true);
        sunEl.input.value = sunSpoken;
        window.setTimeout(() => {
          sunSendMessage(sunSpoken);
          sunSetTip(SUN_TIP_DEFAULT, false);
        }, 260);
      } else {
        sunSetTip('未识别到语音内容，请重试', false);
      }
      console.log('[sun_voice] 语音输入结束');
    });
  }

  function sunToggleVoice() {
    if (!sunVoiceRec) return;
    if (sunVoiceOn) {
      sunVoiceRec.stop();
      return;
    }
    sunVoiceBase = sunEl.input.value.trim() ? `${sunEl.input.value.trim()}` : '';
    sunVoiceFinal = '';
    try {
      sunVoiceRec.start();
    } catch (sunError) {
      console.warn('[sun_voice] 启动失败：', sunError.message);
    }
  }

  sunEl.form.addEventListener('submit', (sunEvent) => {
    sunEvent.preventDefault();
    sunSendMessage(sunEl.input.value);
  });

  sunEl.input.addEventListener('input', sunAutoGrow);

  sunEl.input.addEventListener('keydown', (sunEvent) => {
    if (sunEvent.key === 'Enter' && !sunEvent.shiftKey && !sunEvent.isComposing) {
      sunEvent.preventDefault();
      sunSendMessage(sunEl.input.value);
    }
  });

  sunEl.newBtn.addEventListener('click', sunStartNewChat);

  sunEl.deleteBtn.addEventListener('click', () => {
    if (!sunCurrentSessionId) {
      window.alert('当前还没有可删除的会话');
      return;
    }
    sunDeleteSession(sunCurrentSessionId);
  });

  sunEl.kbBtn.addEventListener('click', () => {
    sunUseKb = !sunUseKb;
    sunEl.kbBtn.classList.toggle('sun_chat_head__kb--on', sunUseKb);
    console.log(`[sun_chat] 知识库检索：${sunUseKb ? '开启' : '关闭'}`);
  });

  sunEl.menuBtn.addEventListener('click', sunOpenSidebar);
  sunEl.mask.addEventListener('click', sunCloseSidebar);

  if (sunEl.voiceBtn) sunEl.voiceBtn.addEventListener('click', sunToggleVoice);

  document.querySelectorAll('.sun_chip').forEach((sunChip) => {
    sunChip.addEventListener('click', () => {
      sunSendMessage(sunChip.dataset.sun_prompt || sunChip.textContent);
    });
  });

  /* ============ 初始化 ============ */
  sunInitVoiceChat();

  (async function sunInit() {
    sunEl.input.focus();
    const sunList = await sunLoadSessions();
    if (sunList.length) {
      sunOpenSession(sunList[0].sun_id);
    } else {
      sunToggleWelcome(true);
    }
  })();
})();
