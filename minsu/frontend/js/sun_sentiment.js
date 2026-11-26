/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-16 | 大模型：Auto
 * 文件说明：商业评论情感分析页逻辑
 *          Excel 上传（进度条）、canvas 饼状图、精选评论、分类明细、历史任务；
 *          大模型的请求与响应报文同时输出到浏览器控制台
 */
(function sunSentimentPage() {
  'use strict';

  const SUN_API = '/api/sentiment';

  const SUN_LABELS = [
    { sunKey: 'good', sunName: '好评', sunColor: '#6ce5c4', sunCountKey: 'sunGoodCount', sunPctKey: 'sunGood' },
    { sunKey: 'mid', sunName: '中评', sunColor: '#7fb1ff', sunCountKey: 'sunMidCount', sunPctKey: 'sunMid' },
    { sunKey: 'bad', sunName: '差评', sunColor: '#ff8a8a', sunCountKey: 'sunBadCount', sunPctKey: 'sunBad' }
  ];

  const sunEl = {
    fileInput: document.getElementById('sun_emo_file'),
    zone: document.getElementById('sun_emo_zone'),
    progress: document.getElementById('sun_emo_progress'),
    bar: document.getElementById('sun_emo_bar'),
    progressText: document.getElementById('sun_emo_progress_text'),
    historySection: document.getElementById('sun_emo_history_section'),
    history: document.getElementById('sun_emo_history'),
    result: document.getElementById('sun_emo_result'),
    resultMeta: document.getElementById('sun_emo_result_meta'),
    total: document.getElementById('sun_emo_total'),
    good: document.getElementById('sun_emo_good'),
    mid: document.getElementById('sun_emo_mid'),
    bad: document.getElementById('sun_emo_bad'),
    cost: document.getElementById('sun_emo_cost'),
    pie: document.getElementById('sun_emo_pie'),
    pieTotal: document.getElementById('sun_emo_pie_total'),
    legend: document.getElementById('sun_emo_legend'),
    featuredList: document.getElementById('sun_emo_featured_list'),
    tableBody: document.getElementById('sun_emo_table_body'),
    llmSection: document.getElementById('sun_emo_llm_section'),
    llmRequest: document.getElementById('sun_emo_llm_request'),
    llmResponse: document.getElementById('sun_emo_llm_response'),
    bg: document.getElementById('sun_emo_bg'),
    // 图片识别
    imgInput: document.getElementById('sun_emo_img_file'),
    imgZone: document.getElementById('sun_emo_img_zone'),
    ocrBox: document.getElementById('sun_emo_ocr_box'),
    ocrMeta: document.getElementById('sun_emo_ocr_meta'),
    ocrPreview: document.getElementById('sun_emo_ocr_preview'),
    ocrText: document.getElementById('sun_emo_ocr_text'),
    // 语音识别
    voiceBtn: document.getElementById('sun_emo_voice_btn'),
    voiceBtnText: document.getElementById('sun_emo_voice_btn_text'),
    voiceHint: document.getElementById('sun_emo_voice_hint'),
    voiceText: document.getElementById('sun_emo_voice_text'),
    voiceStatus: document.getElementById('sun_emo_voice_status'),
    voiceAnalyze: document.getElementById('sun_emo_voice_analyze')
  };

  let sunPieAnimId = 0;
  let sunPieData = null;
  let sunRecognition = null;
  let sunRecording = false;

  /** 任务来源名称 */
  const SUN_SOURCE_NAME = { excel: 'Excel', image: '图片', voice: '语音', text: '文本' };

  /* ============ 工具 ============ */
  const sunEscapeHtml = (sunText) =>
    String(sunText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /** 统一明细字段（上传接口为驼峰，历史详情为数据库列名） */
  function sunNormalizeItem(sunItem) {
    return {
      sunRowIndex: sunItem.sunRowIndex || sunItem.sun_row_index,
      sunComment: sunItem.sunComment || sunItem.sun_comment,
      sunLabel: sunItem.sunLabel || sunItem.sun_label,
      sunScore: sunItem.sunScore != null ? sunItem.sunScore : sunItem.sun_score,
      sunReason: sunItem.sunReason || sunItem.sun_reason
    };
  }

  const sunLabelMeta = (sunLabel) => SUN_LABELS.find((sunMeta) => sunMeta.sunName === sunLabel) || SUN_LABELS[1];
  const sunTagClass = (sunLabel) => ({ 好评: 'sun_emo_tag--good', 中评: 'sun_emo_tag--mid', 差评: 'sun_emo_tag--bad' }[sunLabel] || 'sun_emo_tag--mid');
  const sunItemClass = (sunLabel) => ({ 好评: 'sun_emo_featured__item--good', 中评: 'sun_emo_featured__item--mid', 差评: 'sun_emo_featured__item--bad' }[sunLabel] || 'sun_emo_featured__item--mid');

  /* ============ 粒子背景 ============ */
  function sunStartBackground() {
    const sunCanvas = sunEl.bg;
    const sunCtx = sunCanvas.getContext('2d');
    let sunWidth = 0;
    let sunHeight = 0;
    let sunDots = [];

    const sunResize = () => {
      const sunDpr = Math.min(window.devicePixelRatio || 1, 2);
      sunWidth = window.innerWidth;
      sunHeight = window.innerHeight;
      sunCanvas.width = sunWidth * sunDpr;
      sunCanvas.height = sunHeight * sunDpr;
      sunCanvas.style.width = `${sunWidth}px`;
      sunCanvas.style.height = `${sunHeight}px`;
      sunCtx.setTransform(sunDpr, 0, 0, sunDpr, 0, 0);
      sunDots = Array.from({ length: Math.min(60, Math.floor((sunWidth * sunHeight) / 32000)) }, () => ({
        sunX: Math.random() * sunWidth,
        sunY: Math.random() * sunHeight,
        sunVx: (Math.random() - 0.5) * 0.28,
        sunVy: (Math.random() - 0.5) * 0.28,
        sunR: Math.random() * 1.6 + 0.7
      }));
    };

    const sunTick = () => {
      sunCtx.clearRect(0, 0, sunWidth, sunHeight);
      sunDots.forEach((sunDot) => {
        sunDot.sunX += sunDot.sunVx;
        sunDot.sunY += sunDot.sunVy;
        if (sunDot.sunX < 0 || sunDot.sunX > sunWidth) sunDot.sunVx *= -1;
        if (sunDot.sunY < 0 || sunDot.sunY > sunHeight) sunDot.sunVy *= -1;
        sunCtx.beginPath();
        sunCtx.arc(sunDot.sunX, sunDot.sunY, sunDot.sunR, 0, Math.PI * 2);
        sunCtx.fillStyle = 'rgba(255, 190, 170, 0.5)';
        sunCtx.fill();
      });
      for (let sunI = 0; sunI < sunDots.length; sunI += 1) {
        for (let sunJ = sunI + 1; sunJ < sunDots.length; sunJ += 1) {
          const sunDx = sunDots[sunI].sunX - sunDots[sunJ].sunX;
          const sunDy = sunDots[sunI].sunY - sunDots[sunJ].sunY;
          const sunDist = Math.sqrt(sunDx * sunDx + sunDy * sunDy);
          if (sunDist < 150) {
            sunCtx.beginPath();
            sunCtx.moveTo(sunDots[sunI].sunX, sunDots[sunI].sunY);
            sunCtx.lineTo(sunDots[sunJ].sunX, sunDots[sunJ].sunY);
            sunCtx.strokeStyle = `rgba(255, 180, 160, ${0.14 * (1 - sunDist / 150)})`;
            sunCtx.lineWidth = 1;
            sunCtx.stroke();
          }
        }
      }
      requestAnimationFrame(sunTick);
    };

    sunResize();
    window.addEventListener('resize', sunResize);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(sunTick);
    }
  }

  /* ============ 饼状图 ============ */
  function sunDrawPie(sunData, sunProgress) {
    const sunCanvas = sunEl.pie;
    const sunCtx = sunCanvas.getContext('2d');
    const sunDpr = Math.min(window.devicePixelRatio || 1, 2);
    const sunSize = 320;
    sunCanvas.width = sunSize * sunDpr;
    sunCanvas.height = sunSize * sunDpr;
    sunCtx.setTransform(sunDpr, 0, 0, sunDpr, 0, 0);
    sunCtx.clearRect(0, 0, sunSize, sunSize);

    const sunCx = sunSize / 2;
    const sunCy = sunSize / 2;
    const sunR = sunSize / 2 - 18;
    const sunInner = sunR * 0.62;
    const sunTotal = sunData.reduce((sunAcc, sunSlice) => sunAcc + sunSlice.sunCount, 0) || 1;
    let sunAngle = -Math.PI / 2;

    sunData.forEach((sunSlice) => {
      const sunSweep = (sunSlice.sunCount / sunTotal) * Math.PI * 2 * sunProgress;
      if (sunSweep <= 0) return;
      const sunEnd = sunAngle + sunSweep;

      sunCtx.beginPath();
      sunCtx.arc(sunCx, sunCy, sunR, sunAngle, sunEnd);
      sunCtx.arc(sunCx, sunCy, sunInner, sunEnd, sunAngle, true);
      sunCtx.closePath();
      sunCtx.fillStyle = sunSlice.sunColor;
      sunCtx.globalAlpha = 0.92;
      sunCtx.fill();
      sunCtx.globalAlpha = 1;

      // 扇区外标签（动画结束时绘制）
      if (sunProgress >= 1 && sunSlice.sunCount > 0) {
        const sunMid = sunAngle + sunSweep / 2;
        const sunLabelR = sunR + 12;
        const sunLx = sunCx + Math.cos(sunMid) * sunLabelR;
        const sunLy = sunCy + Math.sin(sunMid) * sunLabelR;
        sunCtx.font = '600 12px -apple-system, "PingFang SC", sans-serif';
        sunCtx.textAlign = Math.cos(sunMid) >= 0 ? 'left' : 'right';
        sunCtx.textBaseline = 'middle';
        sunCtx.fillStyle = '#eef3ff';
        sunCtx.fillText(`${sunSlice.sunName} ${(sunSlice.sunCount / sunTotal * 100).toFixed(0)}%`, sunLx, sunLy);
      }

      sunAngle = sunEnd;
    });
  }

  function sunAnimatePie(sunData) {
    cancelAnimationFrame(sunPieAnimId);
    const sunStartAt = performance.now();
    const sunDuration = 850;

    const sunStep = (sunNow) => {
      const sunT = Math.min(1, (sunNow - sunStartAt) / sunDuration);
      const sunEase = 1 - Math.pow(1 - sunT, 3);
      sunDrawPie(sunData, sunEase);
      if (sunT < 1) {
        sunPieAnimId = requestAnimationFrame(sunStep);
      }
    };
    sunPieAnimId = requestAnimationFrame(sunStep);
  }

  /* ============ 渲染结果 ============ */
  function sunRender(sunData) {
    const sunTask = sunData.sunTask;
    sunEl.result.hidden = false;
    sunEl.llmSection.hidden = false;

    sunEl.resultMeta.textContent = `${sunTask.sunFileName} · 来源：${SUN_SOURCE_NAME[sunTask.sunSource] || 'Excel'} · 共 ${sunTask.sunCommentTotal} 条评论 · 分析于 ${new Date().toLocaleTimeString()}`;
    sunEl.total.textContent = sunTask.sunCommentTotal;
    sunEl.good.textContent = sunTask.sunGoodCount;
    sunEl.mid.textContent = sunTask.sunMidCount;
    sunEl.bad.textContent = sunTask.sunBadCount;
    sunEl.cost.textContent = `${sunTask.sunDurationMs}ms`;
    sunEl.pieTotal.textContent = sunTask.sunCommentTotal;

    // 图例
    sunEl.legend.innerHTML = SUN_LABELS.map((sunMeta) => {
      const sunCount = sunTask[sunMeta.sunCountKey];
      const sunPct = sunTask.sunPercent[sunMeta.sunPctKey];
      return `<span class="sun_emo_legend__item"><i style="background:${sunMeta.sunColor}"></i>${sunMeta.sunName} ${sunCount} 条（${sunPct}%）</span>`;
    }).join('');

    // 饼图
    sunPieData = SUN_LABELS.map((sunMeta) => ({
      sunName: sunMeta.sunName,
      sunColor: sunMeta.sunColor,
      sunCount: sunTask[sunMeta.sunCountKey]
    }));
    sunAnimatePie(sunPieData);

    // 精选评论
    sunEl.featuredList.innerHTML = (sunData.sunFeatured || [])
      .map(
        (sunItem) => `
        <div class="sun_emo_featured__item ${sunItemClass(sunItem.sunLabel)}">
          <div class="sun_emo_featured__head">
            <span class="sun_emo_tag ${sunTagClass(sunItem.sunLabel)}">${sunEscapeHtml(sunItem.sunLabel)}</span>
            <span class="sun_emo_featured__score">#${sunItem.sunRowIndex} · 分值 ${sunItem.sunScore > 0 ? '+' : ''}${sunItem.sunScore}</span>
          </div>
          <p class="sun_emo_featured__text">${sunEscapeHtml(sunItem.sunComment)}</p>
        </div>`
      )
      .join('');

    // 明细表
    sunEl.tableBody.innerHTML = (sunData.sunItems || [])
      .map((sunRaw) => {
        const sunItem = sunNormalizeItem(sunRaw);
        return `
        <tr>
          <td>${sunItem.sunRowIndex}</td>
          <td>${sunEscapeHtml(sunItem.sunComment)}</td>
          <td><span class="sun_emo_tag ${sunTagClass(sunItem.sunLabel)}">${sunEscapeHtml(sunItem.sunLabel)}</span></td>
          <td>${sunItem.sunScore > 0 ? '+' : ''}${sunItem.sunScore}</td>
          <td>${sunEscapeHtml(sunItem.sunReason || '')}</td>
        </tr>`;
      })
      .join('');

    // 大模型报文（页面 + 控制台同步输出）
    sunEl.llmRequest.textContent = JSON.stringify(sunData.sunLlmRequest, null, 2);
    sunEl.llmResponse.textContent = JSON.stringify(sunData.sunLlmResponse, null, 2);
    console.log('[sun_llm] 请求 ->', sunData.sunLlmRequest);
    console.log('[sun_llm] 响应 <-', sunData.sunLlmResponse);
  }

  /* ============ 历史任务 ============ */
  async function sunLoadHistory() {
    try {
      const sunRes = await fetch(`${SUN_API}/tasks`);
      const sunJson = await sunRes.json();
      console.log('[sun_sentiment] GET /api/sentiment/tasks ->', sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);

      sunEl.historySection.hidden = !sunJson.data.sunList.length;
      sunEl.history.innerHTML = sunJson.data.sunList
        .map(
          (sunTask) =>
            `<button class="sun_emo_history__chip" type="button" data-sun_id="${sunTask.sun_id}">
              <span class="sun_emo_history__src sun_emo_history__src--${sunTask.sun_source || 'excel'}">${SUN_SOURCE_NAME[sunTask.sun_source] || 'Excel'}</span>
              ${sunEscapeHtml(sunTask.sun_file_name)}
              <em>${sunTask.sun_good_count}/${sunTask.sun_mid_count}/${sunTask.sun_bad_count}</em>
            </button>`
        )
        .join('');

      sunEl.history.querySelectorAll('.sun_emo_history__chip').forEach((sunChip) => {
        sunChip.addEventListener('click', () => sunLoadTask(Number(sunChip.dataset.sun_id)));
      });

      // 页面打开时自动展示最近一次的分析结果（带 #image/#voice 哈希直达时不打扰）
      if (!window.location.hash && sunJson.data.sunList.length) {
        sunLoadTask(sunJson.data.sunList[0].sun_id);
      }
      console.log('[sun_sentiment] 历史任务加载完成，共', sunJson.data.sunList.length, '个');
    } catch (sunError) {
      console.error('[sun_sentiment] 历史任务加载失败：', sunError);
    }
  }

  async function sunLoadTask(sunTaskId) {
    try {
      const sunRes = await fetch(`${SUN_API}/tasks/${sunTaskId}`);
      const sunJson = await sunRes.json();
      console.log(`[sun_sentiment] GET /api/sentiment/tasks/${sunTaskId} ->`, sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);
      sunRender(sunJson.data);
      sunEl.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (sunError) {
      console.error('[sun_sentiment] 任务详情加载失败：', sunError);
    }
  }

  /* ============ 上传（Excel / 图片） ============ */
  function sunUploadFile(sunFile, sunKind = 'excel') {
    if (!sunFile) return;
    const sunIsImage = sunKind === 'image';
    const sunFormData = new FormData();
    sunFormData.append(sunIsImage ? 'sunImage' : 'sunExcel', sunFile);

    sunEl.progress.hidden = false;
    sunEl.bar.style.width = '0%';
    sunEl.progressText.textContent = sunIsImage ? `正在识别图片文字：${sunFile.name}` : `正在上传并分类：${sunFile.name}`;

    const sunXhr = new XMLHttpRequest();
    sunXhr.open('POST', sunIsImage ? `${SUN_API}/ocr` : `${SUN_API}/upload`);

    sunXhr.upload.addEventListener('progress', (sunEvent) => {
      if (!sunEvent.lengthComputable) return;
      const sunPercent = Math.round((sunEvent.loaded / sunEvent.total) * 100);
      sunEl.bar.style.width = `${sunPercent}%`;
      sunEl.progressText.textContent = sunPercent < 100 ? `上传中 ${sunPercent}%` : sunIsImage ? '图片识别中（OCR）…' : '上传完成，大模型逐条分类中…';
    });

    sunXhr.addEventListener('load', () => {
      let sunJson = null;
      try {
        sunJson = JSON.parse(sunXhr.responseText);
      } catch (sunError) {
        console.error('[sun_sentiment] 响应解析失败：', sunError);
      }
      console.log(sunIsImage ? '[sun_sentiment] POST /api/sentiment/ocr ->' : '[sun_sentiment] POST /api/sentiment/upload ->', sunJson);

      if (!sunJson || sunJson.code !== 0) {
        sunEl.progressText.textContent = `处理失败：${(sunJson && sunJson.msg) || '服务器无响应'}`;
        window.setTimeout(() => {
          sunEl.progress.hidden = true;
        }, 3000);
        return;
      }

      const sunTask = sunJson.data.sunTask;
      sunEl.bar.style.width = '100%';
      sunEl.progressText.textContent = sunIsImage
        ? `「${sunTask.sunFileName}」识别 ${sunTask.sunCommentTotal} 条评论：好评 ${sunTask.sunGoodCount} / 中评 ${sunTask.sunMidCount} / 差评 ${sunTask.sunBadCount}`
        : `「${sunTask.sunFileName}」分类完成：好评 ${sunTask.sunGoodCount} / 中评 ${sunTask.sunMidCount} / 差评 ${sunTask.sunBadCount}`;

      // 图片识别：展示 OCR 原文与缩略图
      if (sunIsImage && sunJson.data.sunOcr) {
        const sunOcr = sunJson.data.sunOcr;
        sunEl.ocrBox.hidden = false;
        sunEl.ocrMeta.textContent = `${sunOcr.sunEngine} · 识别 ${sunOcr.sunLineCount} 行 → ${sunOcr.sunCommentCount} 条评论 · 耗时 ${sunOcr.sunOcrMs}ms`;
        sunEl.ocrText.textContent = sunOcr.sunRawText;
        sunEl.ocrPreview.src = sunOcr.sunPreviewUrl || '';
        sunEl.ocrPreview.hidden = !sunOcr.sunPreviewUrl;
        console.log('[sun_ocr] 识别文本 ->', sunOcr.sunRawText);
      }

      window.setTimeout(() => {
        sunEl.progress.hidden = true;
      }, 2400);
      sunRender(sunJson.data);
      sunLoadHistory();
    });

    sunXhr.addEventListener('error', () => {
      console.error('[sun_sentiment] 请求失败');
      sunEl.progressText.textContent = '上传失败：网络或服务异常';
    });

    sunXhr.send(sunFormData);
  }

  /* ============ 语音识别（浏览器 SpeechRecognition） ============ */
  function sunInitVoice() {
    const sunCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!sunCtor) {
      sunEl.voiceBtnText.textContent = '当前浏览器不支持语音识别';
      sunEl.voiceBtn.disabled = true;
      sunEl.voiceHint.textContent = '请使用 Chrome / Edge 打开本页，或在下方文本框手动输入评论后点击分析';
      console.warn('[sun_voice] 浏览器不支持 SpeechRecognition');
      return;
    }

    sunRecognition = new sunCtor();
    sunRecognition.lang = 'zh-CN';
    sunRecognition.continuous = true;
    sunRecognition.interimResults = true;

    sunRecognition.addEventListener('start', () => {
      sunRecording = true;
      sunEl.voiceBtn.classList.add('sun_emo_voice__btn--on');
      sunEl.voiceBtnText.textContent = '停止识别';
      sunEl.voiceStatus.textContent = '正在聆听，请口述评论…';
      console.log('[sun_voice] 开始识别');
    });

    sunRecognition.addEventListener('result', (sunEvent) => {
      let sunFinal = '';
      let sunInterim = '';
      for (let sunIndex = sunEvent.resultIndex; sunIndex < sunEvent.results.length; sunIndex += 1) {
        const sunResult = sunEvent.results[sunIndex];
        if (sunResult.isFinal) sunFinal += sunResult[0].transcript;
        else sunInterim += sunResult[0].transcript;
      }
      if (sunFinal) {
        sunEl.voiceText.value += (sunEl.voiceText.value && !/\n$/.test(sunEl.voiceText.value) ? '\n' : '') + sunFinal.trim();
        console.log('[sun_voice] 最终转写 ->', sunFinal.trim());
      }
      sunEl.voiceStatus.textContent = sunInterim ? `识别中：${sunInterim}` : '正在聆听，请口述评论…';
    });

    sunRecognition.addEventListener('error', (sunEvent) => {
      console.error('[sun_voice] 识别出错：', sunEvent.error);
      sunEl.voiceStatus.textContent = `识别中断：${sunEvent.error}`;
      sunStopVoice();
    });

    sunRecognition.addEventListener('end', () => {
      sunRecording = false;
      sunEl.voiceBtn.classList.remove('sun_emo_voice__btn--on');
      sunEl.voiceBtnText.textContent = '开始语音识别';
      sunEl.voiceStatus.textContent = '识别结束，可编辑文字后点击「分析这段语音评论」';
      console.log('[sun_voice] 识别结束');
    });
  }

  function sunStopVoice() {
    if (sunRecognition && sunRecording) sunRecognition.stop();
  }

  function sunToggleVoice() {
    if (!sunRecognition) return;
    if (sunRecording) {
      sunStopVoice();
      return;
    }
    sunEl.voiceText.focus();
    sunRecognition.start();
  }

  async function sunAnalyzeVoice() {
    const sunText = sunEl.voiceText.value.trim();
    if (!sunText) {
      sunEl.voiceStatus.textContent = '还没有语音转写内容，请先录音或手动输入';
      return;
    }

    sunEl.voiceAnalyze.disabled = true;
    sunEl.voiceStatus.textContent = '大模型分类中…';
    try {
      const sunRes = await fetch(`${SUN_API}/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sunText, sunSource: 'voice', sunFileName: '语音评论（麦克风转写）' })
      });
      const sunJson = await sunRes.json();
      console.log('[sun_sentiment] POST /api/sentiment/text ->', sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);

      sunEl.voiceStatus.textContent = `分类完成：好评 ${sunJson.data.sunTask.sunGoodCount} / 中评 ${sunJson.data.sunTask.sunMidCount} / 差评 ${sunJson.data.sunTask.sunBadCount}`;
      sunRender(sunJson.data);
      sunLoadHistory();
    } catch (sunError) {
      console.error('[sun_sentiment] 语音文本分析失败：', sunError);
      sunEl.voiceStatus.textContent = `分析失败：${sunError.message}`;
    } finally {
      sunEl.voiceAnalyze.disabled = false;
    }
  }

  /* ============ 输入方式切换 ============ */
  function sunBindTabs() {
    const sunTabs = document.querySelectorAll('.sun_emo_tab');
    const sunPanels = document.querySelectorAll('.sun_emo_panel');
    sunTabs.forEach((sunTab) => {
      sunTab.addEventListener('click', () => {
        const sunKey = sunTab.dataset.sun_tab;
        sunTabs.forEach((sunItem) => sunItem.classList.toggle('sun_emo_tab--on', sunItem === sunTab));
        sunPanels.forEach((sunPanel) => {
          sunPanel.hidden = sunPanel.dataset.sun_panel !== sunKey;
        });
        if (sunKey !== 'voice') sunStopVoice();
        window.history.replaceState(null, '', `#${sunKey}`);
        console.log(`[sun_sentiment] 切换输入方式：${sunKey}`);
      });
    });
  }

  /* ============ 事件绑定 ============ */
  sunEl.zone.addEventListener('click', () => sunEl.fileInput.click());

  sunEl.fileInput.addEventListener('change', () => {
    const sunSelected = sunEl.fileInput.files && sunEl.fileInput.files[0];
    if (sunSelected) sunUploadFile(sunSelected, 'excel');
    sunEl.fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((sunEventName) => {
    sunEl.zone.addEventListener(sunEventName, (sunEvent) => {
      sunEvent.preventDefault();
      sunEl.zone.classList.add('sun_emo_upload--drag');
    });
  });

  ['dragleave', 'drop'].forEach((sunEventName) => {
    sunEl.zone.addEventListener(sunEventName, (sunEvent) => {
      sunEvent.preventDefault();
      sunEl.zone.classList.remove('sun_emo_upload--drag');
    });
  });

  sunEl.zone.addEventListener('drop', (sunEvent) => {
    const sunDropped = sunEvent.dataTransfer && sunEvent.dataTransfer.files;
    if (sunDropped && sunDropped[0]) sunUploadFile(sunDropped[0], 'excel');
  });

  // 图片识别：点击 / 选择 / 拖拽
  sunEl.imgZone.addEventListener('click', () => sunEl.imgInput.click());

  sunEl.imgInput.addEventListener('change', () => {
    const sunSelected = sunEl.imgInput.files && sunEl.imgInput.files[0];
    if (sunSelected) sunUploadFile(sunSelected, 'image');
    sunEl.imgInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((sunEventName) => {
    sunEl.imgZone.addEventListener(sunEventName, (sunEvent) => {
      sunEvent.preventDefault();
      sunEl.imgZone.classList.add('sun_emo_upload--drag');
    });
  });

  ['dragleave', 'drop'].forEach((sunEventName) => {
    sunEl.imgZone.addEventListener(sunEventName, (sunEvent) => {
      sunEvent.preventDefault();
      sunEl.imgZone.classList.remove('sun_emo_upload--drag');
    });
  });

  sunEl.imgZone.addEventListener('drop', (sunEvent) => {
    const sunDropped = sunEvent.dataTransfer && sunEvent.dataTransfer.files;
    if (sunDropped && sunDropped[0]) sunUploadFile(sunDropped[0], 'image');
  });

  // 语音识别
  sunEl.voiceBtn.addEventListener('click', sunToggleVoice);
  sunEl.voiceAnalyze.addEventListener('click', sunAnalyzeVoice);

  window.addEventListener('resize', () => {
    if (sunPieData) sunDrawPie(sunPieData, 1);
  });

  /* ============ 初始化 ============ */
  sunStartBackground();
  sunBindTabs();
  sunInitVoice();
  // 支持 #image / #voice 直达对应输入方式
  const sunHashTab = document.querySelector(`.sun_emo_tab[data-sun_tab="${(window.location.hash || '').replace('#', '')}"]`);
  if (sunHashTab) sunHashTab.click();
  sunLoadHistory();
})();
