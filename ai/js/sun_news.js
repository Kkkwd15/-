/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-23 | 大模型：Auto
 * 文件说明：科技 AI 新闻页逻辑（Supabase PostgREST 直连，零依赖原生实现）
 *          数据表 public.sun_ai_news 由 Supabase MCP 创建，RLS 允许匿名只读
 */
(function sunNews() {
  'use strict';

  /** Supabase 项目配置（publishable key 仅开放只读权限，可安全暴露在前端） */
  const SUN_SUPABASE_URL = 'https://wpttyixtaxungbgoiknn.supabase.co';
  const SUN_SUPABASE_KEY = 'sb_publishable_NDlrGXcMug3cdoQJsM4cOQ_rrdPuDrO';
  const SUN_TABLE = 'sun_ai_news';
  const SUN_PAGE_SIZE = 8;

  const sunEl = {
    bg: document.getElementById('sun_news_bg'),
    statTotal: document.getElementById('sun_stat_total'),
    statCategories: document.getElementById('sun_stat_categories'),
    statLatest: document.getElementById('sun_stat_latest'),
    tabs: document.getElementById('sun_news_tabs'),
    search: document.getElementById('sun_news_search'),
    sort: document.getElementById('sun_news_sort'),
    status: document.getElementById('sun_news_status'),
    list: document.getElementById('sun_news_list'),
    more: document.getElementById('sun_news_more'),
    footTotal: document.getElementById('sun_foot_total')
  };

  let sunCategory = '';
  let sunKeyword = '';
  let sunPage = 1;
  let sunTotal = 0;
  let sunSearchTimer = 0;

  /* ============ 粒子背景（与平台其他页面一致） ============ */
  function sunStartBackground() {
    const sunCtx = sunEl.bg.getContext('2d');
    let sunWidth = 0;
    let sunHeight = 0;
    let sunNodes = [];

    function sunResize() {
      const sunDpr = window.devicePixelRatio || 1;
      sunWidth = window.innerWidth;
      sunHeight = window.innerHeight;
      sunEl.bg.width = sunWidth * sunDpr;
      sunEl.bg.height = sunHeight * sunDpr;
      sunCtx.setTransform(sunDpr, 0, 0, sunDpr, 0, 0);
      const sunCount = Math.min(70, Math.floor((sunWidth * sunHeight) / 26000));
      sunNodes = Array.from({ length: sunCount }, () => ({
        sunX: Math.random() * sunWidth,
        sunY: Math.random() * sunHeight,
        sunVx: (Math.random() - 0.5) * 0.45,
        sunVy: (Math.random() - 0.5) * 0.45,
        sunR: Math.random() * 1.6 + 0.6
      }));
    }

    function sunFrame() {
      sunCtx.clearRect(0, 0, sunWidth, sunHeight);
      sunNodes.forEach((sunNode) => {
        sunNode.sunX += sunNode.sunVx;
        sunNode.sunY += sunNode.sunVy;
        if (sunNode.sunX < 0 || sunNode.sunX > sunWidth) sunNode.sunVx *= -1;
        if (sunNode.sunY < 0 || sunNode.sunY > sunHeight) sunNode.sunVy *= -1;
        sunCtx.beginPath();
        sunCtx.arc(sunNode.sunX, sunNode.sunY, sunNode.sunR, 0, Math.PI * 2);
        sunCtx.fillStyle = 'rgba(108, 229, 196, 0.5)';
        sunCtx.fill();
      });
      for (let sunA = 0; sunA < sunNodes.length; sunA += 1) {
        for (let sunB = sunA + 1; sunB < sunNodes.length; sunB += 1) {
          const sunDx = sunNodes[sunA].sunX - sunNodes[sunB].sunX;
          const sunDy = sunNodes[sunA].sunY - sunNodes[sunB].sunY;
          const sunDist = Math.hypot(sunDx, sunDy);
          if (sunDist < 130) {
            sunCtx.beginPath();
            sunCtx.moveTo(sunNodes[sunA].sunX, sunNodes[sunA].sunY);
            sunCtx.lineTo(sunNodes[sunB].sunX, sunNodes[sunB].sunY);
            sunCtx.strokeStyle = `rgba(127, 177, 255, ${0.16 * (1 - sunDist / 130)})`;
            sunCtx.stroke();
          }
        }
      }
      requestAnimationFrame(sunFrame);
    }

    sunResize();
    window.addEventListener('resize', sunResize);
    sunFrame();
  }

  /* ============ 工具 ============ */
  const sunEscapeHtml = (sunText) =>
    String(sunText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /** 相对时间：今天 / 昨天 / N 天前 / 具体日期 */
  function sunRelativeTime(sunValue) {
    const sunDate = new Date(sunValue);
    if (Number.isNaN(sunDate.getTime())) return '';
    const sunDays = Math.floor((Date.now() - sunDate.getTime()) / 86400000);
    if (sunDays <= 0) return '今天';
    if (sunDays === 1) return '昨天';
    if (sunDays < 7) return `${sunDays} 天前`;
    return `${sunDate.getMonth() + 1} 月 ${sunDate.getDate()} 日`;
  }

  /** 分类简称（用于标签展示） */
  const SUN_CAT_NAMES = {
    大模型: '大模型',
    芯片算力: '芯片',
    智能体: '智能体',
    机器人: '机器人',
    政策监管: '政策',
    开源生态: '开源',
    行业应用: '应用',
    行业动态: '动态'
  };

  /* ============ 数据请求（PostgREST） ============ */
  function sunBuildUrl() {
    const sunParams = new URLSearchParams();
    sunParams.set('select', 'sun_id,sun_title,sun_summary,sun_source,sun_category,sun_url,sun_hot,sun_published_at');
    if (sunCategory) sunParams.set('sun_category', `eq.${sunCategory}`);
    if (sunKeyword) {
      sunParams.set('or', `(sun_title.ilike.*${sunKeyword}*,sun_summary.ilike.*${sunKeyword}*)`);
    }
    sunParams.set('order', sunEl.sort.value || 'sun_published_at.desc');
    sunParams.set('limit', String(SUN_PAGE_SIZE));
    sunParams.set('offset', String((sunPage - 1) * SUN_PAGE_SIZE));
    return `${SUN_SUPABASE_URL}/rest/v1/${SUN_TABLE}?${sunParams.toString()}`;
  }

  async function sunFetchNews() {
    const sunRes = await fetch(sunBuildUrl(), {
      headers: { apikey: SUN_SUPABASE_KEY, Accept: 'application/json', Prefer: 'count=exact' }
    });
    if (!sunRes.ok) {
      const sunError = await sunRes.json().catch(() => ({}));
      throw new Error(sunError.message || `HTTP ${sunRes.status}`);
    }
    const sunRange = sunRes.headers.get('content-range') || '';
    if (sunRange.includes('/')) sunTotal = Number(sunRange.split('/')[1]) || 0;
    return sunRes.json();
  }

  /* ============ 渲染 ============ */
  function sunRenderList(sunRows, sunAppend) {
    const sunHtml = sunRows
      .map(
        (sunItem) => `
        <article class="sun_news__item${sunItem.sun_hot >= 85 ? ' sun_news__item--hot' : ''}">
          <div class="sun_news__item-head">
            <span class="sun_news__cat">${sunEscapeHtml(SUN_CAT_NAMES[sunItem.sun_category] || sunItem.sun_category)}</span>
            <span class="sun_news__title-link">${sunEscapeHtml(sunItem.sun_title)}</span>
          </div>
          <p class="sun_news__summary">${sunEscapeHtml(sunItem.sun_summary)}</p>
          <div class="sun_news__meta">
            <span>来源：<b>${sunEscapeHtml(sunItem.sun_source)}</b></span>
            <span>${sunRelativeTime(sunItem.sun_published_at)}</span>
            <span class="sun_news__hot">热度 ${sunItem.sun_hot}</span>
          </div>
        </article>`
      )
      .join('');
    if (sunAppend) sunEl.list.insertAdjacentHTML('beforeend', sunHtml);
    else sunEl.list.innerHTML = sunHtml;
  }

  function sunShowStatus(sunText, sunIsError) {
    sunEl.status.hidden = !sunText;
    sunEl.status.textContent = sunText || '';
    sunEl.status.classList.toggle('sun_news__status--error', !!sunIsError);
  }

  function sunUpdateStats(sunLatestLabel) {
    sunEl.statTotal.textContent = sunTotal;
    sunEl.footTotal.textContent = sunTotal;
    sunEl.statCategories.textContent = sunEl.tabs.querySelectorAll('.sun_news__tab').length - 1;
    sunEl.statLatest.textContent = sunLatestLabel || '–';
  }

  function sunUpdateMore() {
    const sunLoaded = sunEl.list.querySelectorAll('.sun_news__item').length;
    sunEl.more.hidden = sunLoaded >= sunTotal;
    sunEl.more.textContent = sunLoaded >= sunTotal ? '已加载全部' : '加载更多';
  }

  /* ============ 加载流程 ============ */
  async function sunLoad(sunAppend) {
    if (!sunAppend) {
      sunPage = 1;
      sunShowStatus('正在从 Supabase 加载新闻…', false);
    }
    sunEl.more.disabled = true;
    try {
      const sunRows = await sunFetchNews();
      if (!sunAppend) sunShowStatus('', false);
      if (!sunRows.length && !sunAppend) {
        sunEl.list.innerHTML = '';
        sunShowStatus('没有符合条件的新闻，换个关键词试试', false);
        sunEl.more.hidden = true;
        sunUpdateStats('');
        return;
      }
      sunRenderList(sunRows, sunAppend);
      let sunLatestLabel = '–';
      if (sunEl.sort.value === 'sun_published_at.desc' && !sunCategory && !sunKeyword && sunRows.length) {
        sunLatestLabel = sunRelativeTime(sunRows[0].sun_published_at);
      }
      sunUpdateStats(sunLatestLabel);
      sunUpdateMore();
      console.log(`[sun_news] GET /rest/v1/${SUN_TABLE} page=${sunPage} -> ${sunRows.length} rows, total=${sunTotal}`);
    } catch (sunError) {
      console.error('[sun_news] 加载失败：', sunError);
      sunShowStatus(`加载失败：${sunError.message}（请检查网络或 Supabase 项目状态）`, true);
    } finally {
      sunEl.more.disabled = false;
    }
  }

  /* ============ 分类标签 ============ */
  async function sunLoadTabs() {
    try {
      const sunRes = await fetch(
        `${SUN_SUPABASE_URL}/rest/v1/${SUN_TABLE}?select=sun_category&order=sun_category.asc`,
        { headers: { apikey: SUN_SUPABASE_KEY, Accept: 'application/json' } }
      );
      if (!sunRes.ok) throw new Error(`HTTP ${sunRes.status}`);
      const sunRows = await sunRes.json();
      const sunCats = [...new Set(sunRows.map((sunRow) => sunRow.sun_category))];
      sunEl.tabs.innerHTML =
        '<button class="sun_news__tab sun_news__tab--on" type="button" data-sun_cat="">全部</button>' +
        sunCats
          .map(
            (sunCat) =>
              `<button class="sun_news__tab" type="button" data-sun_cat="${sunEscapeHtml(sunCat)}">${sunEscapeHtml(SUN_CAT_NAMES[sunCat] || sunCat)}</button>`
          )
          .join('');
      console.log('[sun_news] 分类标签 ->', sunCats);
    } catch (sunError) {
      console.error('[sun_news] 分类加载失败：', sunError);
    }
  }

  /* ============ 事件绑定 ============ */
  sunEl.tabs.addEventListener('click', (sunEvent) => {
    const sunBtn = sunEvent.target.closest('.sun_news__tab');
    if (!sunBtn) return;
    sunCategory = sunBtn.dataset.sun_cat || '';
    sunEl.tabs.querySelectorAll('.sun_news__tab').forEach((sunTab) => {
      sunTab.classList.toggle('sun_news__tab--on', sunTab === sunBtn);
    });
    sunLoad(false);
  });

  sunEl.search.addEventListener('input', () => {
    window.clearTimeout(sunSearchTimer);
    sunSearchTimer = window.setTimeout(() => {
      sunKeyword = sunEl.search.value.trim();
      sunLoad(false);
    }, 350);
  });

  sunEl.sort.addEventListener('change', () => sunLoad(false));

  sunEl.more.addEventListener('click', () => {
    sunPage += 1;
    sunLoad(true);
  });

  /* ============ 初始化 ============ */
  sunStartBackground();
  sunLoadTabs();
  sunLoad(false);
})();

