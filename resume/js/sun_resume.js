/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-26 | 大模型：Auto
 * 文件说明：个人简历页逻辑 —— Canvas 粒子背景动画 + 滚动进场 + 技能条动画 + 打印
 */
(function sunResume() {
  'use strict';

  /* ============ Canvas 粒子背景（星尘 + 连线 + 鼠标互动） ============ */
  function sunStartBackground() {
    const sunCanvas = document.getElementById('sun_resume_bg');
    const sunCtx = sunCanvas.getContext('2d');
    let sunW = 0;
    let sunH = 0;
    let sunNodes = [];
    const sunMouse = { sunX: -9999, sunY: -9999 };

    function sunResize() {
      const sunDpr = Math.min(window.devicePixelRatio || 1, 2);
      sunW = window.innerWidth;
      sunH = window.innerHeight;
      sunCanvas.width = sunW * sunDpr;
      sunCanvas.height = sunH * sunDpr;
      sunCtx.setTransform(sunDpr, 0, 0, sunDpr, 0, 0);
      const sunCount = Math.min(110, Math.floor((sunW * sunH) / 16000));
      sunNodes = Array.from({ length: sunCount }, () => ({
        sunX: Math.random() * sunW,
        sunY: Math.random() * sunH,
        sunVx: (Math.random() - 0.5) * 0.35,
        sunVy: (Math.random() - 0.5) * 0.35,
        sunR: Math.random() * 1.9 + 0.7,
        sunHue: Math.random() < 0.5 ? '108, 229, 196' : Math.random() < 0.5 ? '127, 177, 255' : '181, 154, 255'
      }));
    }

    function sunFrame() {
      sunCtx.clearRect(0, 0, sunW, sunH);
      sunNodes.forEach((sunN) => {
        sunN.sunX += sunN.sunVx;
        sunN.sunY += sunN.sunVy;
        if (sunN.sunX < 0 || sunN.sunX > sunW) sunN.sunVx *= -1;
        if (sunN.sunY < 0 || sunN.sunY > sunH) sunN.sunVy *= -1;
        // 鼠标轻微吸引
        const sunMd = Math.hypot(sunN.sunX - sunMouse.sunX, sunN.sunY - sunMouse.sunY);
        if (sunMd < 160) {
          sunN.sunX += (sunMouse.sunX - sunN.sunX) * 0.006;
          sunN.sunY += (sunMouse.sunY - sunN.sunY) * 0.006;
        }
        sunCtx.beginPath();
        sunCtx.arc(sunN.sunX, sunN.sunY, sunN.sunR, 0, Math.PI * 2);
        sunCtx.fillStyle = `rgba(${sunN.sunHue}, 0.55)`;
        sunCtx.fill();
      });
      // 连线
      for (let sunA = 0; sunA < sunNodes.length; sunA += 1) {
        for (let sunB = sunA + 1; sunB < sunNodes.length; sunB += 1) {
          const sunDist = Math.hypot(sunNodes[sunA].sunX - sunNodes[sunB].sunX, sunNodes[sunA].sunY - sunNodes[sunB].sunY);
          if (sunDist < 120) {
            sunCtx.beginPath();
            sunCtx.moveTo(sunNodes[sunA].sunX, sunNodes[sunA].sunY);
            sunCtx.lineTo(sunNodes[sunB].sunX, sunNodes[sunB].sunY);
            sunCtx.strokeStyle = `rgba(127, 177, 255, ${0.14 * (1 - sunDist / 120)})`;
            sunCtx.stroke();
          }
        }
      }
      // 鼠标光晕
      if (sunMouse.sunX > -999) {
        const sunGlow = sunCtx.createRadialGradient(sunMouse.sunX, sunMouse.sunY, 0, sunMouse.sunX, sunMouse.sunY, 180);
        sunGlow.addColorStop(0, 'rgba(108, 229, 196, 0.07)');
        sunGlow.addColorStop(1, 'rgba(108, 229, 196, 0)');
        sunCtx.fillStyle = sunGlow;
        sunCtx.fillRect(sunMouse.sunX - 180, sunMouse.sunY - 180, 360, 360);
      }
      requestAnimationFrame(sunFrame);
    }

    window.addEventListener('resize', sunResize);
    window.addEventListener('mousemove', (sunE) => {
      sunMouse.sunX = sunE.clientX;
      sunMouse.sunY = sunE.clientY;
    });
    window.addEventListener('mouseout', () => {
      sunMouse.sunX = -9999;
      sunMouse.sunY = -9999;
    });
    sunResize();
    sunFrame();
  }

  /* ============ 滚动进场动画 ============ */
  function sunInitReveal() {
    const sunItems = document.querySelectorAll('.sun_reveal');
    const sunIo = new IntersectionObserver(
      (sunEntries) => {
        sunEntries.forEach((sunEntry, sunIndex) => {
          if (!sunEntry.isIntersecting) return;
          window.setTimeout(() => sunEntry.target.classList.add('sun_reveal--on'), sunIndex * 90);
          sunIo.unobserve(sunEntry.target);
        });
      },
      { threshold: 0.12 }
    );
    sunItems.forEach((sunItem) => sunIo.observe(sunItem));
  }

  /* ============ 技能条动画 ============ */
  function sunInitBars() {
    const sunBars = document.querySelectorAll('.sun_bar');
    const sunIo = new IntersectionObserver(
      (sunEntries) => {
        sunEntries.forEach((sunEntry) => {
          if (!sunEntry.isIntersecting) return;
          const sunBar = sunEntry.target;
          sunBar.querySelector('b').style.width = `${sunBar.dataset.sun_value}%`;
          sunIo.unobserve(sunBar);
        });
      },
      { threshold: 0.4 }
    );
    sunBars.forEach((sunBar) => sunIo.observe(sunBar));
  }

  /* ============ 打印 / 导出 PDF ============ */
  function sunInitPrint() {
    document.getElementById('sun_btn_print').addEventListener('click', () => window.print());
  }

  sunStartBackground();
  sunInitReveal();
  sunInitBars();
  sunInitPrint();
  // 兜底：无头浏览器 / 长页面 / 减弱动画环境下，2 秒后强制显示全部内容，避免内容不可见
  window.setTimeout(() => {
    document.querySelectorAll('.sun_reveal').forEach((sunItem) => sunItem.classList.add('sun_reveal--on'));
    document.querySelectorAll('.sun_bar').forEach((sunBar) => {
      sunBar.querySelector('b').style.width = `${sunBar.dataset.sun_value}%`;
    });
  }, 2000);
  console.log('[sun_resume] 简历页加载完成：Canvas 粒子背景 + 滚动进场 + 技能条动画');
})();
