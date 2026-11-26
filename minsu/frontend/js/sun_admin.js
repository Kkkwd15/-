/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-19 | 大模型：Auto
 * 文件说明：后台管理页交互脚本
 *          管理员登录（token 鉴权）、仪表盘 canvas 图表（后端真实数据驱动）、
 *          房源 / 订单 / 住客三实体的增删改查（搜索 + 分页 + 详情弹窗）
 */
(function () {
  'use strict';

  const SUN_API = '/api/admin';
  const SUN_TOKEN_KEY = 'sun_admin_token';
  const SUN_NAME_KEY = 'sun_admin_name';

  /* ---------- DOM 引用集中管理 ---------- */
  const sunEl = {
    loginPanel: document.getElementById('sunAdmLoginPanel'),
    loginForm: document.getElementById('sunAdmLoginForm'),
    loginUser: document.getElementById('sunAdmLoginUser'),
    loginPass: document.getElementById('sunAdmLoginPass'),
    loginError: document.getElementById('sunAdmLoginError'),
    layout: document.getElementById('sunAdmLayout'),
    who: document.getElementById('sunAdmWho'),
    logoutBtn: document.getElementById('sunAdmLogoutBtn'),
    sideItems: Array.from(document.querySelectorAll('.sun_adm_side__item')),
    views: {
      dashboard: document.getElementById('sunAdmViewDashboard'),
      rooms: document.getElementById('sunAdmViewRooms'),
      orders: document.getElementById('sunAdmViewOrders'),
      guests: document.getElementById('sunAdmViewGuests')
    },
    kpis: document.getElementById('sunAdmKpis'),
    chartTrend: document.getElementById('sunAdmChartTrend'),
    chartRoomType: document.getElementById('sunAdmChartRoomType'),
    chartOrderStatus: document.getElementById('sunAdmChartOrderStatus'),
    chartSentiment: document.getElementById('sunAdmChartSentiment'),
    modal: document.getElementById('sunAdmModal'),
    modalCard: document.getElementById('sunAdmModalCard'),
    room: {
      keyword: document.getElementById('sunAdmRoomKeyword'),
      type: document.getElementById('sunAdmRoomType'),
      searchBtn: document.getElementById('sunAdmRoomSearchBtn'),
      addBtn: document.getElementById('sunAdmRoomAddBtn'),
      tbody: document.getElementById('sunAdmRoomTbody'),
      pager: document.getElementById('sunAdmRoomPager')
    },
    order: {
      keyword: document.getElementById('sunAdmOrderKeyword'),
      status: document.getElementById('sunAdmOrderStatus'),
      searchBtn: document.getElementById('sunAdmOrderSearchBtn'),
      addBtn: document.getElementById('sunAdmOrderAddBtn'),
      tbody: document.getElementById('sunAdmOrderTbody'),
      pager: document.getElementById('sunAdmOrderPager')
    },
    guest: {
      keyword: document.getElementById('sunAdmGuestKeyword'),
      vip: document.getElementById('sunAdmGuestVip'),
      searchBtn: document.getElementById('sunAdmGuestSearchBtn'),
      addBtn: document.getElementById('sunAdmGuestAddBtn'),
      tbody: document.getElementById('sunAdmGuestTbody'),
      pager: document.getElementById('sunAdmGuestPager')
    }
  };

  /* 每个实体的查询状态（页码 / 搜索关键字 / 筛选） */
  const sunQuery = {
    rooms: { page: 1, size: 8, keyword: '', type: '' },
    orders: { page: 1, size: 8, keyword: '', status: '' },
    guests: { page: 1, size: 8, keyword: '', vip: '' }
  };

  const SUN_COLORS = ['#2fd4a4', '#8b5cd6', '#f4a63a', '#e46a6a', '#4aa3f0', '#9aa8b8'];

  /* ---------- 通用工具 ---------- */
  function sunGetToken() { return localStorage.getItem(SUN_TOKEN_KEY) || ''; }
  function sunMoney(n) { return Number(n || 0).toFixed(2); }
  function sunEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- 统一请求封装：带 Authorization，401 自动回到登录 ---------- */
  async function sunRequest(sunPath, sunOpt) {
    const sunOpt2 = sunOpt || {};
    console.log('[sun_admin] 请求 ->', sunOpt2.method || 'GET', SUN_API + sunPath, sunOpt2.body || '');
    const res = await fetch(SUN_API + sunPath, {
      method: sunOpt2.method || 'GET',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        sunGetToken() ? { Authorization: 'Bearer ' + sunGetToken() } : {}
      ),
      body: sunOpt2.body ? JSON.stringify(sunOpt2.body) : undefined
    });
    const sunJson = await res.json().catch(() => ({ code: 5000, msg: '响应解析失败', data: null }));
    console.log('[sun_admin] 响应 <-', SUN_API + sunPath, sunJson);
    if (sunJson.code === 4001) {
      sunShowLogin('登录已过期或尚未登录，请重新登录');
      throw new Error(sunJson.msg);
    }
    if (sunJson.code !== 0) throw new Error(sunJson.msg || '请求失败');
    return sunJson.data;
  }

  /* ---------- 登录 / 登出 ---------- */
  function sunShowLogin(sunMsg) {
    localStorage.removeItem(SUN_TOKEN_KEY);
    localStorage.removeItem(SUN_NAME_KEY);
    sunEl.layout.hidden = true;
    sunEl.loginPanel.hidden = false;
    sunEl.who.hidden = true;
    sunEl.logoutBtn.hidden = true;
    if (sunMsg) {
      sunEl.loginError.textContent = sunMsg;
      sunEl.loginError.hidden = false;
    }
  }

  function sunShowLayout() {
    sunEl.loginPanel.hidden = true;
    sunEl.layout.hidden = false;
    sunEl.who.textContent = '管理员：' + (localStorage.getItem(SUN_NAME_KEY) || '');
    sunEl.who.hidden = false;
    sunEl.logoutBtn.hidden = false;
  }

  sunEl.loginForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    sunEl.loginError.hidden = true;
    try {
      console.log('[sun_admin] 登录请求 ->', { sunUsername: sunEl.loginUser.value });
      const res = await fetch(SUN_API + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sunUsername: sunEl.loginUser.value.trim(),
          sunPassword: sunEl.loginPass.value
        })
      });
      const sunJson = await res.json();
      console.log('[sun_admin] 登录响应 <-', sunJson);
      if (sunJson.code !== 0) throw new Error(sunJson.msg || '登录失败');
      localStorage.setItem(SUN_TOKEN_KEY, sunJson.data.sunToken);
      localStorage.setItem(SUN_NAME_KEY, sunJson.data.sunAdmin.sunRealName);
      sunShowLayout();
      sunSwitchView('dashboard');
    } catch (sunErr) {
      sunEl.loginError.textContent = sunErr.message;
      sunEl.loginError.hidden = false;
    }
  });

  sunEl.logoutBtn.addEventListener('click', async () => {
    try { await sunRequest('/logout', { method: 'POST' }); } catch (e) { /* 忽略 */ }
    sunShowLogin('已退出登录');
  });

  /* ---------- 视图切换 ---------- */
  function sunSwitchView(sunView) {
    sunEl.sideItems.forEach((btn) =>
      btn.classList.toggle('sun_adm_side__item--on', btn.dataset.sunView === sunView));
    Object.keys(sunEl.views).forEach((k) => { sunEl.views[k].hidden = k !== sunView; });
    if (sunView === 'dashboard') sunRenderDashboard();
    if (sunView === 'rooms') sunLoadRooms();
    if (sunView === 'orders') sunLoadOrders();
    if (sunView === 'guests') sunLoadGuests();
  }
  sunEl.sideItems.forEach((btn) =>
    btn.addEventListener('click', () => sunSwitchView(btn.dataset.sunView)));

  /* ---------- 分页组件 ---------- */
  function sunRenderPager(sunBox, sunTotal, sunPage, sunSize, sunOnPage) {
    const sunPages = Math.max(1, Math.ceil(sunTotal / sunSize));
    let sunHtml = '<button ' + (sunPage <= 1 ? 'disabled' : '') +
      ' data-sun-page="' + (sunPage - 1) + '">上一页</button>';
    const sunStart = Math.max(1, Math.min(sunPage - 2, sunPages - 4));
    const sunEnd = Math.min(sunPages, sunStart + 4);
    for (let i = sunStart; i <= sunEnd; i++) {
      sunHtml += '<button class="' + (i === sunPage ? 'sun_adm_pager__on' : '') +
        '" data-sun-page="' + i + '">' + i + '</button>';
    }
    sunHtml += '<button ' + (sunPage >= sunPages ? 'disabled' : '') +
      ' data-sun-page="' + (sunPage + 1) + '">下一页</button>' +
      '<span>共 ' + sunTotal + ' 条 · 第 ' + sunPage + '/' + sunPages + ' 页</span>';
    sunBox.innerHTML = sunHtml;
    sunBox.querySelectorAll('button[data-sun-page]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = parseInt(b.dataset.sunPage, 10);
        if (p >= 1 && p <= sunPages) sunOnPage(p);
      }));
  }

  /* ---------- 弹窗 ---------- */
  function sunOpenModal(sunHtml) {
    sunEl.modalCard.innerHTML = sunHtml +
      '<div class="sun_adm_modal__foot"><button class="sun_adm_btn" type="button" data-sun-close="1">关闭</button></div>';
    sunEl.modal.hidden = false;
    sunEl.modalCard.querySelectorAll('[data-sun-close]').forEach((b) =>
      b.addEventListener('click', sunCloseModal));
  }
  function sunCloseModal() { sunEl.modal.hidden = true; sunEl.modalCard.innerHTML = ''; }

  /* ================================================================
     房源管理
  ================================================================ */
  async function sunLoadRooms() {
    const q = sunQuery.rooms;
    try {
      const data = await sunRequest('/rooms?sunPage=' + q.page + '&sunSize=' + q.size +
        '&sunKeyword=' + encodeURIComponent(q.keyword) + '&sunType=' + encodeURIComponent(q.type));
      if (!data.sunList.length) {
        sunEl.room.tbody.innerHTML = '<tr><td colspan="7" class="sun_adm_empty">暂无房源</td></tr>';
      } else {
        sunEl.room.tbody.innerHTML = data.sunList.map((r) => `
          <tr>
            <td>${r.sun_id}</td>
            <td>${sunEsc(r.sun_name)}</td>
            <td>${sunEsc(r.sun_type)}</td>
            <td>￥${sunMoney(r.sun_price)}</td>
            <td>${r.sun_stock}</td>
            <td>${r.sun_status === 1
              ? '<span class="sun_adm_tag sun_adm_tag--on">上架</span>'
              : '<span class="sun_adm_tag sun_adm_tag--off">下架</span>'}</td>
            <td><span class="sun_adm_ops">
              <button class="sun_adm_btn sun_adm_btn--mini" data-sun-act="detail" data-sun-id="${r.sun_id}">详情</button>
              <button class="sun_adm_btn sun_adm_btn--mini sun_adm_btn--ghost" data-sun-act="edit" data-sun-id="${r.sun_id}">编辑</button>
              <button class="sun_adm_btn sun_adm_btn--mini sun_adm_btn--danger" data-sun-act="del" data-sun-id="${r.sun_id}">删除</button>
            </span></td>
          </tr>`).join('');
        sunEl.room.tbody.querySelectorAll('button[data-sun-act]').forEach((b) =>
          b.addEventListener('click', () => sunRoomAction(b.dataset.sunAct, b.dataset.sunId)));
      }
      sunRenderPager(sunEl.room.pager, data.sunTotal, data.sunPage, data.sunSize,
        (p) => { q.page = p; sunLoadRooms(); });
    } catch (sunErr) {
      console.error('[sun_admin] 房源列表失败：', sunErr.message);
    }
  }

  async function sunRoomAction(sunAct, sunId) {
    if (sunAct === 'detail') {
      const r = await sunRequest('/rooms/' + sunId);
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">房源详情 #${r.sun_id}</h3>
        <div class="sun_adm_detail__grid">
          <div><p class="sun_adm_detail__label">房源名称</p><p class="sun_adm_detail__value">${sunEsc(r.sun_name)}</p></div>
          <div><p class="sun_adm_detail__label">房型</p><p class="sun_adm_detail__value">${sunEsc(r.sun_type)}</p></div>
          <div><p class="sun_adm_detail__label">价格/晚</p><p class="sun_adm_detail__value">￥${sunMoney(r.sun_price)}</p></div>
          <div><p class="sun_adm_detail__label">剩余库存</p><p class="sun_adm_detail__value">${r.sun_stock} 间</p></div>
          <div><p class="sun_adm_detail__label">面积</p><p class="sun_adm_detail__value">${r.sun_area} ㎡</p></div>
          <div><p class="sun_adm_detail__label">楼层</p><p class="sun_adm_detail__value">${sunEsc(r.sun_floor)}</p></div>
          <div><p class="sun_adm_detail__label">状态</p><p class="sun_adm_detail__value">${r.sun_status === 1 ? '上架' : '下架'}</p></div>
          <div><p class="sun_adm_detail__label">创建时间</p><p class="sun_adm_detail__value">${sunEsc(r.sun_created_at)}</p></div>
          <div class="sun_adm_detail__full"><p class="sun_adm_detail__label">房源介绍</p><p class="sun_adm_detail__value">${sunEsc(r.sun_desc) || '—'}</p></div>
        </div>`);
      return;
    }
    if (sunAct === 'edit' || sunAct === 'add') {
      let r = { sun_name: '', sun_type: '大床房', sun_price: '', sun_stock: 5, sun_area: 20, sun_floor: '2F', sun_status: 1, sun_desc: '' };
      if (sunAct === 'edit') r = await sunRequest('/rooms/' + sunId);
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">${sunAct === 'add' ? '新增房源' : '编辑房源 #' + r.sun_id}</h3>
        <form id="sunAdmRoomForm">
          <label class="sun_adm_field"><span class="sun_adm_field__label">房源名称 *</span>
            <input class="sun_adm_field__input" name="sunName" required value="${sunEsc(r.sun_name)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">房型 *</span>
            <select class="sun_adm_field__input" name="sunType">
              ${['大床房', '双床房', '亲子房', '景观套房'].map((t) =>
                '<option ' + (t === r.sun_type ? 'selected' : '') + '>' + t + '</option>').join('')}
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">价格/晚（元）*</span>
            <input class="sun_adm_field__input" name="sunPrice" type="number" step="0.01" min="0" required value="${sunEsc(r.sun_price)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">剩余库存</span>
            <input class="sun_adm_field__input" name="sunStock" type="number" min="0" value="${r.sun_stock}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">面积（㎡）</span>
            <input class="sun_adm_field__input" name="sunArea" type="number" min="1" value="${r.sun_area}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">楼层</span>
            <input class="sun_adm_field__input" name="sunFloor" value="${sunEsc(r.sun_floor)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">状态</span>
            <select class="sun_adm_field__input" name="sunStatus">
              <option value="1" ${r.sun_status === 1 ? 'selected' : ''}>上架</option>
              <option value="0" ${r.sun_status === 0 ? 'selected' : ''}>下架</option>
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">房源介绍</span>
            <input class="sun_adm_field__input" name="sunDesc" value="${sunEsc(r.sun_desc)}" /></label>
          <div class="sun_adm_modal__foot">
            <button class="sun_adm_btn" type="button" data-sun-close="1">取消</button>
            <button class="sun_adm_btn sun_adm_btn--primary" type="submit">保存</button>
          </div>
        </form>`);
      sunEl.modalCard.querySelectorAll('[data-sun-close]').forEach((b) =>
        b.addEventListener('click', sunCloseModal));
      document.getElementById('sunAdmRoomForm').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const body = {
          sunName: fd.get('sunName'), sunType: fd.get('sunType'),
          sunPrice: parseFloat(fd.get('sunPrice')), sunStock: parseInt(fd.get('sunStock'), 10) || 0,
          sunArea: parseInt(fd.get('sunArea'), 10) || 20, sunFloor: fd.get('sunFloor'),
          sunStatus: parseInt(fd.get('sunStatus'), 10), sunDesc: fd.get('sunDesc')
        };
        try {
          await sunRequest(sunAct === 'add' ? '/rooms' : '/rooms/' + r.sun_id,
            { method: sunAct === 'add' ? 'POST' : 'PUT', body });
          sunCloseModal();
          sunLoadRooms();
        } catch (e) { console.error('[sun_admin] 保存房源失败：', e.message); }
      });
      return;
    }
    if (sunAct === 'del') {
      if (!window.confirm('确认删除该房源？')) return;
      try {
        await sunRequest('/rooms/' + sunId, { method: 'DELETE' });
        sunLoadRooms();
      } catch (e) { window.alert(e.message); }
    }
  }

  sunEl.room.searchBtn.addEventListener('click', () => {
    sunQuery.rooms.keyword = sunEl.room.keyword.value.trim();
    sunQuery.rooms.type = sunEl.room.type.value;
    sunQuery.rooms.page = 1;
    sunLoadRooms();
  });
  sunEl.room.keyword.addEventListener('keydown', (e) => { if (e.key === 'Enter') sunEl.room.searchBtn.click(); });
  sunEl.room.type.addEventListener('change', () => sunEl.room.searchBtn.click());
  sunEl.room.addBtn.addEventListener('click', () => sunRoomAction('add'));

  /* ================================================================
     订单管理
  ================================================================ */
  async function sunLoadOrders() {
    const q = sunQuery.orders;
    try {
      const data = await sunRequest('/orders?sunPage=' + q.page + '&sunSize=' + q.size +
        '&sunKeyword=' + encodeURIComponent(q.keyword) + '&sunStatus=' + encodeURIComponent(q.status));
      const sunTag = { '待入住': 'sun_adm_tag--wait', '已入住': 'sun_adm_tag--info', '已退房': 'sun_adm_tag--on', '已取消': 'sun_adm_tag--off' };
      if (!data.sunList.length) {
        sunEl.order.tbody.innerHTML = '<tr><td colspan="7" class="sun_adm_empty">暂无订单</td></tr>';
      } else {
        sunEl.order.tbody.innerHTML = data.sunList.map((o) => `
          <tr>
            <td>${sunEsc(o.sun_order_no)}</td>
            <td>${sunEsc(o.sun_guest_name)}</td>
            <td>${sunEsc(o.sun_room_name)}</td>
            <td>${sunEsc(o.sun_checkin)} → ${sunEsc(o.sun_checkout)}</td>
            <td>￥${sunMoney(o.sun_amount)}</td>
            <td><span class="sun_adm_tag ${sunTag[o.sun_status] || ''}">${sunEsc(o.sun_status)}</span></td>
            <td><span class="sun_adm_ops">
              <button class="sun_adm_btn sun_adm_btn--mini" data-sun-act="detail" data-sun-id="${o.sun_id}">详情</button>
              <button class="sun_adm_btn sun_adm_btn--mini sun_adm_btn--ghost" data-sun-act="edit" data-sun-id="${o.sun_id}">编辑</button>
              <button class="sun_adm_btn sun_adm_btn--mini sun_adm_btn--danger" data-sun-act="del" data-sun-id="${o.sun_id}">删除</button>
            </span></td>
          </tr>`).join('');
        sunEl.order.tbody.querySelectorAll('button[data-sun-act]').forEach((b) =>
          b.addEventListener('click', () => sunOrderAction(b.dataset.sunAct, b.dataset.sunId)));
      }
      sunRenderPager(sunEl.order.pager, data.sunTotal, data.sunPage, data.sunSize,
        (p) => { q.page = p; sunLoadOrders(); });
    } catch (sunErr) {
      console.error('[sun_admin] 订单列表失败：', sunErr.message);
    }
  }

  async function sunOrderAction(sunAct, sunId) {
    if (sunAct === 'detail') {
      const o = await sunRequest('/orders/' + sunId);
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">订单详情</h3>
        <div class="sun_adm_detail__grid">
          <div class="sun_adm_detail__full"><p class="sun_adm_detail__label">订单号</p><p class="sun_adm_detail__value">${sunEsc(o.sun_order_no)}</p></div>
          <div><p class="sun_adm_detail__label">住客</p><p class="sun_adm_detail__value">${sunEsc(o.sun_guest_name)}（${sunEsc(o.sun_guest_phone)}，${sunEsc(o.sun_guest_vip)}）</p></div>
          <div><p class="sun_adm_detail__label">房源</p><p class="sun_adm_detail__value">${sunEsc(o.sun_room_name)}（${sunEsc(o.sun_room_type)}，门市价 ￥${sunMoney(o.sun_room_price)}）</p></div>
          <div><p class="sun_adm_detail__label">入住 → 离店</p><p class="sun_adm_detail__value">${sunEsc(o.sun_checkin)} → ${sunEsc(o.sun_checkout)}（${o.sun_nights} 晚）</p></div>
          <div><p class="sun_adm_detail__label">订单金额</p><p class="sun_adm_detail__value">￥${sunMoney(o.sun_amount)}</p></div>
          <div><p class="sun_adm_detail__label">状态</p><p class="sun_adm_detail__value">${sunEsc(o.sun_status)}</p></div>
          <div><p class="sun_adm_detail__label">下单时间</p><p class="sun_adm_detail__value">${sunEsc(o.sun_created_at)}</p></div>
          <div class="sun_adm_detail__full"><p class="sun_adm_detail__label">备注</p><p class="sun_adm_detail__value">${sunEsc(o.sun_remark) || '—'}</p></div>
        </div>`);
      return;
    }
    if (sunAct === 'edit') {
      const o = await sunRequest('/orders/' + sunId);
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">编辑订单 ${sunEsc(o.sun_order_no)}</h3>
        <form id="sunAdmOrderEditForm">
          <label class="sun_adm_field"><span class="sun_adm_field__label">入住日期</span>
            <input class="sun_adm_field__input" name="sunCheckin" type="date" required value="${sunEsc(o.sun_checkin)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">离店日期</span>
            <input class="sun_adm_field__input" name="sunCheckout" type="date" required value="${sunEsc(o.sun_checkout)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">晚数</span>
            <input class="sun_adm_field__input" name="sunNights" type="number" min="1" value="${o.sun_nights}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">金额（元）</span>
            <input class="sun_adm_field__input" name="sunAmount" type="number" step="0.01" min="0" value="${sunEsc(o.sun_amount)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">状态</span>
            <select class="sun_adm_field__input" name="sunStatus">
              ${['待入住', '已入住', '已退房', '已取消'].map((s) =>
                '<option ' + (s === o.sun_status ? 'selected' : '') + '>' + s + '</option>').join('')}
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">备注</span>
            <input class="sun_adm_field__input" name="sunRemark" value="${sunEsc(o.sun_remark)}" /></label>
          <div class="sun_adm_modal__foot">
            <button class="sun_adm_btn" type="button" data-sun-close="1">取消</button>
            <button class="sun_adm_btn sun_adm_btn--primary" type="submit">保存</button>
          </div>
        </form>`);
      sunEl.modalCard.querySelectorAll('[data-sun-close]').forEach((b) =>
        b.addEventListener('click', sunCloseModal));
      document.getElementById('sunAdmOrderEditForm').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        try {
          await sunRequest('/orders/' + o.sun_id, {
            method: 'PUT',
            body: {
              sunCheckin: fd.get('sunCheckin'), sunCheckout: fd.get('sunCheckout'),
              sunNights: parseInt(fd.get('sunNights'), 10) || 1,
              sunAmount: parseFloat(fd.get('sunAmount')) || 0,
              sunStatus: fd.get('sunStatus'), sunRemark: fd.get('sunRemark')
            }
          });
          sunCloseModal();
          sunLoadOrders();
        } catch (e) { console.error('[sun_admin] 保存订单失败：', e.message); }
      });
      return;
    }
    if (sunAct === 'add') {
      const [sunGuests, sunRooms] = await Promise.all([
        sunRequest('/guests?sunPage=1&sunSize=50'),
        sunRequest('/rooms?sunPage=1&sunSize=50')
      ]);
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">新增订单</h3>
        <form id="sunAdmOrderAddForm">
          <label class="sun_adm_field"><span class="sun_adm_field__label">住客 *</span>
            <select class="sun_adm_field__input" name="sunGuestId" required>
              ${sunGuests.sunList.map((g) => '<option value="' + g.sun_id + '">' +
                sunEsc(g.sun_name) + '（' + sunEsc(g.sun_phone) + '）</option>').join('')}
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">房源 *</span>
            <select class="sun_adm_field__input" name="sunRoomId" id="sunAdmOrderRoomSel" required>
              ${sunRooms.sunList.filter((r) => r.sun_status === 1).map((r) =>
                '<option value="' + r.sun_id + '" data-sun-price="' + r.sun_price + '">' +
                sunEsc(r.sun_name) + ' ￥' + sunMoney(r.sun_price) + '/晚</option>').join('')}
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">入住日期 *</span>
            <input class="sun_adm_field__input" name="sunCheckin" type="date" required /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">离店日期 *</span>
            <input class="sun_adm_field__input" name="sunCheckout" type="date" required /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">金额（元，留空按 房价×晚数 自动计算）</span>
            <input class="sun_adm_field__input" name="sunAmount" type="number" step="0.01" min="0" placeholder="自动计算" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">状态</span>
            <select class="sun_adm_field__input" name="sunStatus">
              <option>待入住</option><option>已入住</option><option>已退房</option><option>已取消</option>
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">备注</span>
            <input class="sun_adm_field__input" name="sunRemark" /></label>
          <div class="sun_adm_modal__foot">
            <button class="sun_adm_btn" type="button" data-sun-close="1">取消</button>
            <button class="sun_adm_btn sun_adm_btn--primary" type="submit">创建订单</button>
          </div>
        </form>`);
      sunEl.modalCard.querySelectorAll('[data-sun-close]').forEach((b) =>
        b.addEventListener('click', sunCloseModal));
      document.getElementById('sunAdmOrderAddForm').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        try {
          await sunRequest('/orders', {
            method: 'POST',
            body: {
              sunGuestId: parseInt(fd.get('sunGuestId'), 10),
              sunRoomId: parseInt(fd.get('sunRoomId'), 10),
              sunCheckin: fd.get('sunCheckin'), sunCheckout: fd.get('sunCheckout'),
              sunAmount: fd.get('sunAmount') ? parseFloat(fd.get('sunAmount')) : undefined,
              sunStatus: fd.get('sunStatus'), sunRemark: fd.get('sunRemark')
            }
          });
          sunCloseModal();
          sunLoadOrders();
        } catch (e) { console.error('[sun_admin] 创建订单失败：', e.message); }
      });
      return;
    }
    if (sunAct === 'del') {
      if (!window.confirm('确认删除该订单？')) return;
      try {
        await sunRequest('/orders/' + sunId, { method: 'DELETE' });
        sunLoadOrders();
      } catch (e) { window.alert(e.message); }
    }
  }

  sunEl.order.searchBtn.addEventListener('click', () => {
    sunQuery.orders.keyword = sunEl.order.keyword.value.trim();
    sunQuery.orders.status = sunEl.order.status.value;
    sunQuery.orders.page = 1;
    sunLoadOrders();
  });
  sunEl.order.keyword.addEventListener('keydown', (e) => { if (e.key === 'Enter') sunEl.order.searchBtn.click(); });
  sunEl.order.status.addEventListener('change', () => sunEl.order.searchBtn.click());
  sunEl.order.addBtn.addEventListener('click', () => sunOrderAction('add'));

  /* ================================================================
     住客管理
  ================================================================ */
  async function sunLoadGuests() {
    const q = sunQuery.guests;
    try {
      const data = await sunRequest('/guests?sunPage=' + q.page + '&sunSize=' + q.size +
        '&sunKeyword=' + encodeURIComponent(q.keyword) + '&sunVip=' + encodeURIComponent(q.vip));
      if (!data.sunList.length) {
        sunEl.guest.tbody.innerHTML = '<tr><td colspan="8" class="sun_adm_empty">暂无住客</td></tr>';
      } else {
        sunEl.guest.tbody.innerHTML = data.sunList.map((g) => `
          <tr>
            <td>${g.sun_id}</td>
            <td>${sunEsc(g.sun_name)}</td>
            <td>${sunEsc(g.sun_phone)}</td>
            <td>${g.sun_vip_level === '金卡'
              ? '<span class="sun_adm_tag sun_adm_tag--wait">' + sunEsc(g.sun_vip_level) + '</span>'
              : '<span class="sun_adm_tag sun_adm_tag--violet">' + sunEsc(g.sun_vip_level) + '</span>'}</td>
            <td>${g.sun_total_orders}</td>
            <td>￥${sunMoney(g.sun_total_spend)}</td>
            <td>${g.sun_status === 1
              ? '<span class="sun_adm_tag sun_adm_tag--on">正常</span>'
              : '<span class="sun_adm_tag sun_adm_tag--off">拉黑</span>'}</td>
            <td><span class="sun_adm_ops">
              <button class="sun_adm_btn sun_adm_btn--mini" data-sun-act="detail" data-sun-id="${g.sun_id}">详情</button>
              <button class="sun_adm_btn sun_adm_btn--mini sun_adm_btn--ghost" data-sun-act="edit" data-sun-id="${g.sun_id}">编辑</button>
              <button class="sun_adm_btn sun_adm_btn--mini sun_adm_btn--danger" data-sun-act="del" data-sun-id="${g.sun_id}">删除</button>
            </span></td>
          </tr>`).join('');
        sunEl.guest.tbody.querySelectorAll('button[data-sun-act]').forEach((b) =>
          b.addEventListener('click', () => sunGuestAction(b.dataset.sunAct, b.dataset.sunId)));
      }
      sunRenderPager(sunEl.guest.pager, data.sunTotal, data.sunPage, data.sunSize,
        (p) => { q.page = p; sunLoadGuests(); });
    } catch (sunErr) {
      console.error('[sun_admin] 住客列表失败：', sunErr.message);
    }
  }

  async function sunGuestAction(sunAct, sunId) {
    if (sunAct === 'detail') {
      const g = await sunRequest('/guests/' + sunId);
      const sunOrdersHtml = (g.sun_orders || []).length
        ? '<table><thead><tr><th>订单号</th><th>房源</th><th>入住 → 离店</th><th>金额</th><th>状态</th></tr></thead><tbody>' +
          g.sun_orders.map((o) => '<tr><td>' + sunEsc(o.sun_order_no) + '</td><td>' + sunEsc(o.sun_room_name) +
            '</td><td>' + sunEsc(o.sun_checkin) + ' → ' + sunEsc(o.sun_checkout) + '</td><td>￥' +
            sunMoney(o.sun_amount) + '</td><td>' + sunEsc(o.sun_status) + '</td></tr>').join('') +
          '</tbody></table>'
        : '<p class="sun_adm_detail__value">暂无订单记录</p>';
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">住客详情 #${g.sun_id}</h3>
        <div class="sun_adm_detail__grid">
          <div><p class="sun_adm_detail__label">姓名</p><p class="sun_adm_detail__value">${sunEsc(g.sun_name)}</p></div>
          <div><p class="sun_adm_detail__label">手机号</p><p class="sun_adm_detail__value">${sunEsc(g.sun_phone)}</p></div>
          <div><p class="sun_adm_detail__label">性别</p><p class="sun_adm_detail__value">${sunEsc(g.sun_gender)}</p></div>
          <div><p class="sun_adm_detail__label">会员等级</p><p class="sun_adm_detail__value">${sunEsc(g.sun_vip_level)}</p></div>
          <div><p class="sun_adm_detail__label">累计订单</p><p class="sun_adm_detail__value">${g.sun_total_orders} 单</p></div>
          <div><p class="sun_adm_detail__label">累计消费</p><p class="sun_adm_detail__value">￥${sunMoney(g.sun_total_spend)}</p></div>
          <div><p class="sun_adm_detail__label">状态</p><p class="sun_adm_detail__value">${g.sun_status === 1 ? '正常' : '拉黑'}</p></div>
          <div><p class="sun_adm_detail__label">注册时间</p><p class="sun_adm_detail__value">${sunEsc(g.sun_created_at)}</p></div>
          <div class="sun_adm_detail__full"><p class="sun_adm_detail__label">备注</p><p class="sun_adm_detail__value">${sunEsc(g.sun_note) || '—'}</p></div>
        </div>
        <div class="sun_adm_detail__orders">
          <p class="sun_adm_detail__label">最近订单（最多 10 条）</p>
          ${sunOrdersHtml}
        </div>`);
      return;
    }
    if (sunAct === 'edit' || sunAct === 'add') {
      let g = { sun_name: '', sun_phone: '', sun_gender: '保密', sun_vip_level: '普通', sun_note: '', sun_status: 1 };
      if (sunAct === 'edit') g = await sunRequest('/guests/' + sunId);
      sunOpenModal(`
        <h3 class="sun_adm_modal__title">${sunAct === 'add' ? '新增住客' : '编辑住客 #' + g.sun_id}</h3>
        <form id="sunAdmGuestForm">
          <label class="sun_adm_field"><span class="sun_adm_field__label">姓名 *</span>
            <input class="sun_adm_field__input" name="sunName" required value="${sunEsc(g.sun_name)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">手机号 *</span>
            <input class="sun_adm_field__input" name="sunPhone" required value="${sunEsc(g.sun_phone)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">性别</span>
            <select class="sun_adm_field__input" name="sunGender">
              ${['女', '男', '保密'].map((s) =>
                '<option ' + (s === g.sun_gender ? 'selected' : '') + '>' + s + '</option>').join('')}
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">会员等级</span>
            <select class="sun_adm_field__input" name="sunVipLevel">
              ${['普通', '银卡', '金卡'].map((s) =>
                '<option ' + (s === g.sun_vip_level ? 'selected' : '') + '>' + s + '</option>').join('')}
            </select></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">备注</span>
            <input class="sun_adm_field__input" name="sunNote" value="${sunEsc(g.sun_note)}" /></label>
          <label class="sun_adm_field"><span class="sun_adm_field__label">状态</span>
            <select class="sun_adm_field__input" name="sunStatus">
              <option value="1" ${g.sun_status === 1 ? 'selected' : ''}>正常</option>
              <option value="0" ${g.sun_status === 0 ? 'selected' : ''}>拉黑</option>
            </select></label>
          <div class="sun_adm_modal__foot">
            <button class="sun_adm_btn" type="button" data-sun-close="1">取消</button>
            <button class="sun_adm_btn sun_adm_btn--primary" type="submit">保存</button>
          </div>
        </form>`);
      sunEl.modalCard.querySelectorAll('[data-sun-close]').forEach((b) =>
        b.addEventListener('click', sunCloseModal));
      document.getElementById('sunAdmGuestForm').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const body = {
          sunName: fd.get('sunName'), sunPhone: fd.get('sunPhone'),
          sunGender: fd.get('sunGender'), sunVipLevel: fd.get('sunVipLevel'),
          sunNote: fd.get('sunNote'), sunStatus: parseInt(fd.get('sunStatus'), 10)
        };
        try {
          await sunRequest(sunAct === 'add' ? '/guests' : '/guests/' + g.sun_id,
            { method: sunAct === 'add' ? 'POST' : 'PUT', body });
          sunCloseModal();
          sunLoadGuests();
        } catch (e) { console.error('[sun_admin] 保存住客失败：', e.message); }
      });
      return;
    }
    if (sunAct === 'del') {
      if (!window.confirm('确认删除该住客？')) return;
      try {
        await sunRequest('/guests/' + sunId, { method: 'DELETE' });
        sunLoadGuests();
      } catch (e) { window.alert(e.message); }
    }
  }

  sunEl.guest.searchBtn.addEventListener('click', () => {
    sunQuery.guests.keyword = sunEl.guest.keyword.value.trim();
    sunQuery.guests.vip = sunEl.guest.vip.value;
    sunQuery.guests.page = 1;
    sunLoadGuests();
  });
  sunEl.guest.keyword.addEventListener('keydown', (e) => { if (e.key === 'Enter') sunEl.guest.searchBtn.click(); });
  sunEl.guest.vip.addEventListener('change', () => sunEl.guest.searchBtn.click());
  sunEl.guest.addBtn.addEventListener('click', () => sunGuestAction('add'));

  /* ================================================================
     数据仪表盘（canvas 图表，全部由 /api/admin/dashboard 真实数据驱动）
  ================================================================ */
  function sunHiDpi(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 640;
    const h = 300;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  function sunDrawFrame(ctx, w, h) {
    ctx.strokeStyle = '#223048';
    ctx.fillStyle = '#9db4d6';
    ctx.font = '11px "PingFang SC", sans-serif';
  }

  /* 图 1：近 7 日订单量（柱）+ 订单金额（折线） */
  function sunDrawTrend(canvas, sunDays) {
    const { ctx, w, h } = sunHiDpi(canvas);
    sunDrawFrame(ctx, w, h);
    const sunPad = { l: 40, r: 56, t: 26, b: 34 };
    const sunMaxCnt = Math.max(1, ...sunDays.map((d) => d.sun_count));
    const sunMaxAmt = Math.max(1, ...sunDays.map((d) => d.sun_amount));
    const sunInnerW = w - sunPad.l - sunPad.r;
    const sunInnerH = h - sunPad.t - sunPad.b;
    const sunStep = sunInnerW / Math.max(1, sunDays.length);

    /* 网格与左轴刻度 */
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = sunPad.t + sunInnerH * (1 - i / 4);
      ctx.strokeStyle = '#1c2a3f';
      ctx.beginPath(); ctx.moveTo(sunPad.l, y); ctx.lineTo(w - sunPad.r, y); ctx.stroke();
      ctx.fillStyle = '#6d84a8';
      ctx.fillText(String(Math.round(sunMaxCnt * i / 4)), sunPad.l - 6, y + 4);
    }
    sunDays.forEach((d, i) => {
      const x = sunPad.l + sunStep * i + sunStep / 2;
      ctx.fillStyle = '#6d84a8';
      ctx.textAlign = 'center';
      ctx.fillText(d.sun_date.slice(5), x, h - 14);
    });

    sunDays.forEach((d, i) => {
      const sunBarH = sunInnerH * (d.sun_count / sunMaxCnt);
      const x = sunPad.l + sunStep * i + sunStep * 0.28;
      const bw = sunStep * 0.44;
      const grad = ctx.createLinearGradient(0, sunPad.t + sunInnerH - sunBarH, 0, sunPad.t + sunInnerH);
      grad.addColorStop(0, '#2fd4a4');
      grad.addColorStop(1, 'rgba(47, 212, 164, .35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, sunPad.t + sunInnerH - sunBarH, bw, sunBarH);
      ctx.fillStyle = '#d8e6f5';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.sun_count), x + bw / 2, sunPad.t + sunInnerH - sunBarH - 6);
    });

    /* 金额折线（右轴） */
    ctx.strokeStyle = '#f4a63a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    sunDays.forEach((d, i) => {
      const x = sunPad.l + sunStep * i + sunStep / 2;
      const y = sunPad.t + sunInnerH * (1 - d.sun_amount / sunMaxAmt);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    sunDays.forEach((d, i) => {
      const x = sunPad.l + sunStep * i + sunStep / 2;
      const y = sunPad.t + sunInnerH * (1 - d.sun_amount / sunMaxAmt);
      ctx.fillStyle = '#f4a63a';
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    });

    /* 图例 */
    ctx.fillStyle = '#2fd4a4';
    ctx.fillRect(sunPad.l, 8, 12, 8);
    ctx.fillStyle = '#9db4d6'; ctx.textAlign = 'left';
    ctx.fillText('订单量（左轴）', sunPad.l + 16, 16);
    ctx.fillStyle = '#f4a63a';
    ctx.beginPath(); ctx.arc(sunPad.l + 130, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9db4d6';
    ctx.fillText('订单金额（右轴，峰值 ￥' + sunMoney(sunMaxAmt) + '）', sunPad.l + 138, 16);
  }

  /* 图 2：房型分布饼图 */
  function sunDrawPie(canvas, sunItems) {
    const { ctx, w, h } = sunHiDpi(canvas);
    const sunTotal = sunItems.reduce((s, d) => s + d.sun_count, 0) || 1;
    const cx = w * 0.36, cy = h / 2, r = Math.min(h / 2 - 30, 92);
    let sunAngle = -Math.PI / 2;
    sunItems.forEach((d, i) => {
      const sunSlice = (d.sun_count / sunTotal) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sunAngle, sunAngle + sunSlice);
      ctx.closePath();
      ctx.fillStyle = SUN_COLORS[i % SUN_COLORS.length];
      ctx.fill();
      const sunMid = sunAngle + sunSlice / 2;
      if (d.sun_count / sunTotal > 0.07) {
        ctx.fillStyle = '#0d1420';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(d.sun_count / sunTotal * 100) + '%',
          cx + Math.cos(sunMid) * r * 0.62, cy + Math.sin(sunMid) * r * 0.62 + 4);
      }
      sunAngle += sunSlice;
    });
    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    sunItems.forEach((d, i) => {
      const y = 70 + i * 22;
      ctx.fillStyle = SUN_COLORS[i % SUN_COLORS.length];
      ctx.fillRect(w * 0.68, y - 9, 12, 9);
      ctx.fillStyle = '#9db4d6';
      ctx.fillText(sunItems[i].sun_type + '：' + sunItems[i].sun_count + ' 间', w * 0.68 + 18, y);
    });
    ctx.fillStyle = '#6d84a8';
    ctx.fillText('合计 ' + sunTotal + ' 间房源', w * 0.68, 70 + sunItems.length * 22 + 6);
  }

  /* 图 3：订单状态环形图 */
  function sunDrawDonut(canvas, sunItems) {
    const { ctx, w, h } = sunHiDpi(canvas);
    const sunTotal = sunItems.reduce((s, d) => s + d.sun_count, 0) || 1;
    const cx = w * 0.36, cy = h / 2, r = Math.min(h / 2 - 30, 92);
    let sunAngle = -Math.PI / 2;
    sunItems.forEach((d, i) => {
      const sunSlice = (d.sun_count / sunTotal) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, sunAngle, sunAngle + sunSlice);
      ctx.arc(cx, cy, r * 0.58, sunAngle + sunSlice, sunAngle, true);
      ctx.closePath();
      ctx.fillStyle = SUN_COLORS[i % SUN_COLORS.length];
      ctx.fill();
      sunAngle += sunSlice;
    });
    ctx.fillStyle = '#d8e6f5';
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(sunTotal), cx, cy + 2);
    ctx.font = '11px "PingFang SC", sans-serif';
    ctx.fillStyle = '#6d84a8';
    ctx.fillText('订单总数', cx, cy + 20);

    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    sunItems.forEach((d, i) => {
      const y = 66 + i * 24;
      ctx.fillStyle = SUN_COLORS[i % SUN_COLORS.length];
      ctx.fillRect(w * 0.68, y - 9, 12, 9);
      ctx.fillStyle = '#9db4d6';
      ctx.fillText(d.sun_status + '：' + d.sun_count + ' 单（' +
        Math.round(d.sun_count / sunTotal * 100) + '%）', w * 0.68 + 18, y);
    });
  }

  /* 图 4：情感分布柱状图 */
  function sunDrawSentBars(canvas, sunItems) {
    const { ctx, w, h } = sunHiDpi(canvas);
    const sunPad = { l: 40, r: 30, t: 46, b: 34 };
    const sunInnerW = w - sunPad.l - sunPad.r;
    const sunInnerH = h - sunPad.t - sunPad.b;
    const sunMax = Math.max(1, ...sunItems.map((d) => d.sun_count));
    const sunColor = { '好评': '#2fd4a4', '中评': '#f4a63a', '差评': '#e46a6a' };

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = sunPad.t + sunInnerH * (1 - i / 4);
      ctx.strokeStyle = '#1c2a3f';
      ctx.beginPath(); ctx.moveTo(sunPad.l, y); ctx.lineTo(w - sunPad.r, y); ctx.stroke();
      ctx.fillStyle = '#6d84a8';
      ctx.fillText(String(Math.round(sunMax * i / 4)), sunPad.l - 6, y + 4);
    }

    const sunStep = sunInnerW / Math.max(1, sunItems.length);
    sunItems.forEach((d, i) => {
      const sunBarH = sunInnerH * (d.sun_count / sunMax);
      const x = sunPad.l + sunStep * i + sunStep * 0.3;
      const bw = sunStep * 0.4;
      ctx.fillStyle = sunColor[d.sun_label] || SUN_COLORS[i % SUN_COLORS.length];
      ctx.fillRect(x, sunPad.t + sunInnerH - sunBarH, bw, sunBarH);
      ctx.fillStyle = '#d8e6f5';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.sun_count), x + bw / 2, sunPad.t + sunInnerH - sunBarH - 6);
      ctx.fillStyle = '#9db4d6';
      ctx.fillText(d.sun_label, x + bw / 2, h - 14);
    });
    const sunTotal = sunItems.reduce((s, d) => s + d.sun_count, 0);
    ctx.fillStyle = '#6d84a8';
    ctx.textAlign = 'left';
    ctx.fillText('AI 情感识别累计分析评论：' + sunTotal + ' 条（数据来自 sun_sentiment_item 表）', sunPad.l, 18);
  }

  async function sunRenderDashboard() {
    try {
      const d = await sunRequest('/dashboard');
      const k = d.sunKpi;
      sunEl.kpis.innerHTML = `
        <div class="sun_adm_kpi"><p class="sun_adm_kpi__label">房源总数</p><p class="sun_adm_kpi__value">${k.sunRoomTotal}</p></div>
        <div class="sun_adm_kpi"><p class="sun_adm_kpi__label">上架中</p><p class="sun_adm_kpi__value sun_adm_kpi__value--violet">${k.sunRoomOnline}</p></div>
        <div class="sun_adm_kpi"><p class="sun_adm_kpi__label">订单总数</p><p class="sun_adm_kpi__value">${k.sunOrderTotal}</p></div>
        <div class="sun_adm_kpi"><p class="sun_adm_kpi__label">累计营收（不含取消）</p><p class="sun_adm_kpi__value sun_adm_kpi__value--amber">￥${sunMoney(k.sunRevenue)}</p></div>
        <div class="sun_adm_kpi"><p class="sun_adm_kpi__label">待入住订单</p><p class="sun_adm_kpi__value sun_adm_kpi__value--violet">${k.sunOrderPending}</p></div>
        <div class="sun_adm_kpi"><p class="sun_adm_kpi__label">住客总数</p><p class="sun_adm_kpi__value">${k.sunGuestTotal}</p></div>`;

      /* 近 7 日补零，保证日期连续 */
      const sunMap = {};
      d.sunSevenDays.forEach((r) => { sunMap[r.sun_date] = r; });
      const sunDays = [];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(Date.now() - i * 86400000);
        const sunKey = dt.getFullYear() + '-' +
          String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        const r = sunMap[sunKey];
        sunDays.push({
          sun_date: sunKey,
          sun_count: r ? Number(r.sun_count) : 0,
          sun_amount: r ? Number(r.sun_amount) : 0
        });
      }
      sunDrawTrend(sunEl.chartTrend, sunDays);
      sunDrawPie(sunEl.chartRoomType, d.sunRoomType);
      sunDrawDonut(sunEl.chartOrderStatus, d.sunOrderStatus);
      sunDrawSentBars(sunEl.chartSentiment, d.sunSentiment);
    } catch (sunErr) {
      console.error('[sun_admin] 仪表盘加载失败：', sunErr.message);
    }
  }

  window.addEventListener('resize', () => {
    if (!sunEl.layout.hidden && !sunEl.views.dashboard.hidden) sunRenderDashboard();
  });

  /* ---------- 初始化：已有 token 则直接进入管理界面 ---------- */
  if (sunGetToken()) {
    sunShowLayout();
    sunSwitchView('dashboard');
  }
})();
