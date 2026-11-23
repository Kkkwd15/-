/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-12 | 大模型：Auto
 * 文件说明：知识库管理页逻辑（上传解析进度、文件列表、片段预览、RAG 问答）
 */
(function sunKbPage() {
  'use strict';

  const SUN_API = '/api/kb';

  const sunEl = {
    fileInput: document.getElementById('sun_file_input'),
    zone: document.getElementById('sun_upload_zone'),
    progress: document.getElementById('sun_upload_progress'),
    bar: document.getElementById('sun_upload_bar'),
    progressText: document.getElementById('sun_upload_text'),
    fileList: document.getElementById('sun_file_list'),
    askForm: document.getElementById('sun_ask_form'),
    askInput: document.getElementById('sun_ask_input'),
    askBtn: document.getElementById('sun_ask_btn'),
    answerBox: document.getElementById('sun_answer_box'),
    answerBadge: document.getElementById('sun_answer_badge'),
    answerMeta: document.getElementById('sun_answer_meta'),
    answerText: document.getElementById('sun_answer_text'),
    answerSources: document.getElementById('sun_answer_sources'),
    modal: document.getElementById('sun_chunk_modal'),
    modalTitle: document.getElementById('sun_chunk_title'),
    modalBody: document.getElementById('sun_chunk_body'),
    modalClose: document.getElementById('sun_chunk_close'),
    statFiles: document.getElementById('sun_stat_files'),
    statChunks: document.getElementById('sun_stat_chunks'),
    statChars: document.getElementById('sun_stat_chars'),
    statAsks: document.getElementById('sun_stat_asks')
  };

  /* ============ 工具 ============ */
  const sunEscapeHtml = (sunText) =>
    String(sunText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const sunFormatSize = (sunBytes) => {
    const sunSize = Number(sunBytes) || 0;
    if (sunSize < 1024) return `${sunSize} B`;
    if (sunSize < 1024 * 1024) return `${(sunSize / 1024).toFixed(1)} KB`;
    return `${(sunSize / 1024 / 1024).toFixed(2)} MB`;
  };

  const sunExtClass = (sunExt) => {
    const sunKey = String(sunExt || '').toLowerCase();
    if (sunKey === 'pdf') return 'sun_kb_file__ext--pdf';
    if (sunKey === 'ppt' || sunKey === 'pptx') return 'sun_kb_file__ext--ppt';
    if (sunKey === 'doc' || sunKey === 'docx') return 'sun_kb_file__ext--doc';
    return 'sun_kb_file__ext--txt';
  };

  /* ============ 统计 ============ */
  async function sunLoadStats() {
    try {
      const sunRes = await fetch(`${SUN_API}/stats`);
      const sunJson = await sunRes.json();
      console.log('[sun_kb] GET /api/kb/stats ->', sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);
      const sunData = sunJson.data;
      sunEl.statFiles.textContent = sunData.sunFileTotal;
      sunEl.statChunks.textContent = sunData.sunChunkTotal;
      sunEl.statChars.textContent = sunData.sunCharTotal;
      sunEl.statAsks.textContent = sunData.sunAskTotal;
    } catch (sunError) {
      console.error('[sun_kb] 统计加载失败：', sunError);
    }
  }

  /* ============ 文件列表 ============ */
  function sunRenderFiles(sunList) {
    sunEl.fileList.innerHTML = '';

    if (!sunList.length) {
      const sunEmpty = document.createElement('div');
      sunEmpty.className = 'sun_kb_empty';
      sunEmpty.textContent = '知识库还没有文件，先上传一个 doc / pdf / ppt / txt 文件吧';
      sunEl.fileList.appendChild(sunEmpty);
      return;
    }

    sunList.forEach((sunFile) => {
      const sunItem = document.createElement('article');
      sunItem.className = 'sun_kb_file';
      sunItem.innerHTML = `
        <span class="sun_kb_file__ext ${sunExtClass(sunFile.sun_file_ext)}">${sunEscapeHtml(sunFile.sun_file_ext)}</span>
        <div>
          <p class="sun_kb_file__name">${sunEscapeHtml(sunFile.sun_file_name)}</p>
          <p class="sun_kb_file__meta">
            ${sunFormatSize(sunFile.sun_file_size)} · <b>${sunFile.sun_chunk_count}</b> 个片段 · ${sunFile.sun_char_count} 字符 · 上传于 ${sunEscapeHtml(sunFile.sun_created_at)}
          </p>
        </div>
        <div class="sun_kb_file__actions">
          <button class="sun_kb_btn" type="button" data-sun_action="chunks">查看片段</button>
          <button class="sun_kb_btn sun_kb_btn--danger" type="button" data-sun_action="delete">删除</button>
        </div>`;

      sunItem.querySelector('[data-sun_action="chunks"]').addEventListener('click', () => {
        sunShowChunks(sunFile);
      });
      sunItem.querySelector('[data-sun_action="delete"]').addEventListener('click', () => {
        sunDeleteFile(sunFile);
      });

      sunEl.fileList.appendChild(sunItem);
    });
  }

  async function sunLoadFiles() {
    try {
      const sunRes = await fetch(`${SUN_API}/files`);
      const sunJson = await sunRes.json();
      console.log('[sun_kb] GET /api/kb/files ->', sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);
      sunRenderFiles(sunJson.data.sunList || []);
    } catch (sunError) {
      console.error('[sun_kb] 文件列表加载失败：', sunError);
      sunEl.fileList.innerHTML = '<div class="sun_kb_empty">文件列表加载失败，请确认后端服务已启动</div>';
    }
  }

  /* ============ 片段预览 ============ */
  async function sunShowChunks(sunFile) {
    try {
      const sunRes = await fetch(`${SUN_API}/files/${sunFile.sun_id}/chunks`);
      const sunJson = await sunRes.json();
      console.log(`[sun_kb] GET /api/kb/files/${sunFile.sun_id}/chunks ->`, sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);

      sunEl.modalTitle.textContent = `${sunFile.sun_file_name} · 共 ${sunJson.data.sunTotal} 个片段`;
      sunEl.modalBody.innerHTML = sunJson.data.sunList
        .map(
          (sunChunk) => `
          <div class="sun_kb_chunk">
            <div class="sun_kb_chunk__head">
              <b>#${sunChunk.sun_chunk_index} ${sunEscapeHtml(sunChunk.sun_section)}</b>
              <span>${sunChunk.sun_char_len} 字符</span>
            </div>
            <p class="sun_kb_chunk__text">${sunEscapeHtml(sunChunk.sun_content)}</p>
          </div>`
        )
        .join('');
      sunEl.modal.hidden = false;
    } catch (sunError) {
      console.error('[sun_kb] 片段加载失败：', sunError);
      window.alert(`片段加载失败：${sunError.message}`);
    }
  }

  /* ============ 上传 ============ */
  function sunUploadFile(sunFile) {
    if (!sunFile) return;
    const sunFormData = new FormData();
    sunFormData.append('sunFile', sunFile);

    sunEl.progress.hidden = false;
    sunEl.bar.style.width = '0%';
    sunEl.progressText.textContent = `正在上传并解析：${sunFile.name}`;

    const sunXhr = new XMLHttpRequest();
    sunXhr.open('POST', `${SUN_API}/files`);

    sunXhr.upload.addEventListener('progress', (sunEvent) => {
      if (!sunEvent.lengthComputable) return;
      const sunPercent = Math.round((sunEvent.loaded / sunEvent.total) * 100);
      sunEl.bar.style.width = `${sunPercent}%`;
      sunEl.progressText.textContent = sunPercent < 100 ? `上传中 ${sunPercent}%` : '上传完成，正在解析切片…';
    });

    sunXhr.addEventListener('load', () => {
      let sunJson = null;
      try {
        sunJson = JSON.parse(sunXhr.responseText);
      } catch (sunError) {
        console.error('[sun_kb] 响应解析失败：', sunError, sunXhr.responseText);
      }
      console.log('[sun_kb] POST /api/kb/files ->', sunJson);

      if (!sunJson || sunJson.code !== 0) {
        sunEl.bar.style.width = '100%';
        sunEl.progressText.textContent = `上传失败：${(sunJson && sunJson.msg) || '服务器无响应'}`;
        window.setTimeout(() => {
          sunEl.progress.hidden = true;
        }, 2600);
        return;
      }

      sunEl.bar.style.width = '100%';
      sunEl.progressText.textContent = `「${sunJson.data.sunFile.sun_file_name}」解析完成，生成 ${sunJson.data.sunFile.sun_chunk_count} 个片段`;
      window.setTimeout(() => {
        sunEl.progress.hidden = true;
      }, 2200);
      sunLoadStats();
      sunLoadFiles();
    });

    sunXhr.addEventListener('error', () => {
      console.error('[sun_kb] 上传请求失败');
      sunEl.progressText.textContent = '上传失败：网络或服务异常';
    });

    sunXhr.send(sunFormData);
  }

  /* ============ 删除 ============ */
  async function sunDeleteFile(sunFile) {
    if (!window.confirm(`确定删除「${sunFile.sun_file_name}」及其 ${sunFile.sun_chunk_count} 个片段吗？`)) return;
    try {
      const sunRes = await fetch(`${SUN_API}/files/${sunFile.sun_id}`, { method: 'DELETE' });
      const sunJson = await sunRes.json();
      console.log(`[sun_kb] DELETE /api/kb/files/${sunFile.sun_id} ->`, sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg);
      sunLoadStats();
      sunLoadFiles();
    } catch (sunError) {
      console.error('[sun_kb] 删除失败：', sunError);
      window.alert(`删除失败：${sunError.message}`);
    }
  }

  /* ============ 问答 ============ */
  async function sunAsk(sunQuestion) {
    const sunText = String(sunQuestion || '').trim();
    if (!sunText) return;

    sunEl.askBtn.disabled = true;
    sunEl.askBtn.textContent = '检索中';
    sunEl.answerBox.hidden = false;
    sunEl.answerBadge.className = 'sun_kb_answer__badge';
    sunEl.answerBadge.textContent = '检索中';
    sunEl.answerMeta.textContent = '';
    sunEl.answerText.textContent = '正在检索知识库…';
    sunEl.answerSources.innerHTML = '';

    try {
      const sunRes = await fetch(`${SUN_API}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sunQuestion: sunText, sunTopK: 4 })
      });
      const sunJson = await sunRes.json();
      console.log('[sun_kb] POST /api/kb/ask ->', sunJson);

      if (sunJson.code !== 0) {
        throw new Error(sunJson.msg || '检索失败');
      }

      const sunData = sunJson.data;
      const sunHit = sunData.sunAnswerType === 'kb';
      sunEl.answerBadge.className = `sun_kb_answer__badge${sunHit ? '' : ' sun_kb_answer__badge--miss'}`;
      sunEl.answerBadge.textContent = sunHit ? '知识库命中' : '未命中';
      sunEl.answerMeta.textContent = `${sunData.sunQuestion} · 检索 ${sunData.sunChunkTotal} 个片段 · 最高相似度 ${sunData.sunTopScore}%`;
      sunEl.answerText.textContent = sunData.sunAnswer;

      sunEl.answerSources.innerHTML = (sunData.sunSources || [])
        .map(
          (sunSource, sunIndex) => `
          <div class="sun_kb_source">
            <b>【${sunIndex + 1}】${sunEscapeHtml(sunSource.sunFileName)}</b> · ${sunEscapeHtml(sunSource.sunSection)} ·
            片段 #${sunSource.sunChunkIndex} · <span>相似度 ${sunSource.sunScore}%</span><br />
            ${sunEscapeHtml(sunSource.sunSnippet)}…
          </div>`
        )
        .join('');

      sunLoadStats();
    } catch (sunError) {
      console.error('[sun_kb] 问答失败：', sunError);
      sunEl.answerBadge.className = 'sun_kb_answer__badge sun_kb_answer__badge--miss';
      sunEl.answerBadge.textContent = '请求失败';
      sunEl.answerText.textContent = `问答请求失败：${sunError.message}`;
    } finally {
      sunEl.askBtn.disabled = false;
      sunEl.askBtn.textContent = '提问';
    }
  }

  /* ============ 事件绑定 ============ */
  sunEl.zone.addEventListener('click', () => sunEl.fileInput.click());

  sunEl.fileInput.addEventListener('change', () => {
    const sunSelected = sunEl.fileInput.files && sunEl.fileInput.files[0];
    if (sunSelected) sunUploadFile(sunSelected);
    sunEl.fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((sunEventName) => {
    sunEl.zone.addEventListener(sunEventName, (sunEvent) => {
      sunEvent.preventDefault();
      sunEl.zone.classList.add('sun_kb_upload--drag');
    });
  });

  ['dragleave', 'drop'].forEach((sunEventName) => {
    sunEl.zone.addEventListener(sunEventName, (sunEvent) => {
      sunEvent.preventDefault();
      sunEl.zone.classList.remove('sun_kb_upload--drag');
    });
  });

  sunEl.zone.addEventListener('drop', (sunEvent) => {
    const sunDropped = sunEvent.dataTransfer && sunEvent.dataTransfer.files;
    if (sunDropped && sunDropped[0]) sunUploadFile(sunDropped[0]);
  });

  sunEl.askForm.addEventListener('submit', (sunEvent) => {
    sunEvent.preventDefault();
    sunAsk(sunEl.askInput.value);
  });

  document.querySelectorAll('.sun_kb_sample').forEach((sunBtn) => {
    sunBtn.addEventListener('click', () => {
      sunEl.askInput.value = sunBtn.dataset.sun_question || sunBtn.textContent;
      sunAsk(sunEl.askInput.value);
    });
  });

  sunEl.modalClose.addEventListener('click', () => {
    sunEl.modal.hidden = true;
  });

  sunEl.modal.addEventListener('click', (sunEvent) => {
    if (sunEvent.target === sunEl.modal) sunEl.modal.hidden = true;
  });

  document.addEventListener('keydown', (sunEvent) => {
    if (sunEvent.key === 'Escape' && !sunEl.modal.hidden) {
      sunEl.modal.hidden = true;
    }
  });

  /* ============ 初始化 ============ */
  sunLoadStats();
  sunLoadFiles();
})();
