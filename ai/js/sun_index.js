/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-12 | 大模型：Auto
 * 文件说明：首页交互脚本（canvas 粒子背景动画、卡片光晕、锚点平滑滚动、接口数据控制台输出）
 */
(function sunIndexPage() {
  'use strict';

  /* ================= 一、canvas 粒子背景动画 ================= */
  const sunCanvas = document.getElementById('sun_canvas_bg');
  const sunReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (sunCanvas && sunCanvas.getContext) {
    const sunCtx = sunCanvas.getContext('2d');
    const sunPointer = { sunX: -9999, sunY: -9999, sunActive: false };
    let sunParticles = [];
    let sunWidth = 0;
    let sunHeight = 0;
    let sunDpr = 1;

    /** 单个粒子 */
    const sunCreateParticle = () => ({
      sunX: Math.random() * sunWidth,
      sunY: Math.random() * sunHeight,
      sunVx: (Math.random() - 0.5) * 0.28,
      sunVy: (Math.random() - 0.5) * 0.28,
      sunRadius: Math.random() * 1.5 + 0.6,
      sunAlpha: Math.random() * 0.5 + 0.25,
      sunHue: Math.random() > 0.62 ? 168 : 216
    });

    /** 依据画布尺寸重建粒子 */
    const sunBuildParticles = () => {
      const sunArea = sunWidth * sunHeight;
      const sunCount = Math.min(140, Math.max(38, Math.round(sunArea / 14000)));
      sunParticles = Array.from({ length: sunCount }, sunCreateParticle);
    };

    /** 画布尺寸自适应（含高清屏） */
    const sunResizeCanvas = () => {
      sunDpr = Math.min(window.devicePixelRatio || 1, 2);
      sunWidth = window.innerWidth;
      sunHeight = window.innerHeight;
      sunCanvas.width = Math.floor(sunWidth * sunDpr);
      sunCanvas.height = Math.floor(sunHeight * sunDpr);
      sunCanvas.style.width = `${sunWidth}px`;
      sunCanvas.style.height = `${sunHeight}px`;
      sunCtx.setTransform(sunDpr, 0, 0, sunDpr, 0, 0);
      sunBuildParticles();
    };

    /** 绘制一帧 */
    const sunDrawFrame = () => {
      sunCtx.clearRect(0, 0, sunWidth, sunHeight);
      sunCtx.globalCompositeOperation = 'lighter';

      sunParticles.forEach((sunDot) => {
        // 鼠标轻微排斥
        if (sunPointer.sunActive) {
          const sunDx = sunDot.sunX - sunPointer.sunX;
          const sunDy = sunDot.sunY - sunPointer.sunY;
          const sunDist = Math.hypot(sunDx, sunDy);
          if (sunDist < 130 && sunDist > 0.01) {
            const sunForce = (130 - sunDist) / 130;
            sunDot.sunX += (sunDx / sunDist) * sunForce * 1.5;
            sunDot.sunY += (sunDy / sunDist) * sunForce * 1.5;
          }
        }

        sunDot.sunX += sunDot.sunVx;
        sunDot.sunY += sunDot.sunVy;

        // 边界回弹
        if (sunDot.sunX < -20) sunDot.sunX = sunWidth + 20;
        if (sunDot.sunX > sunWidth + 20) sunDot.sunX = -20;
        if (sunDot.sunY < -20) sunDot.sunY = sunHeight + 20;
        if (sunDot.sunY > sunHeight + 20) sunDot.sunY = -20;

        // 粒子圆点
        sunCtx.beginPath();
        sunCtx.fillStyle = `hsla(${sunDot.sunHue}, 92%, 74%, ${sunDot.sunAlpha})`;
        sunCtx.arc(sunDot.sunX, sunDot.sunY, sunDot.sunRadius, 0, Math.PI * 2);
        sunCtx.fill();
      });

      // 邻近粒子连线
      for (let sunI = 0; sunI < sunParticles.length; sunI += 1) {
        for (let sunJ = sunI + 1; sunJ < sunParticles.length; sunJ += 1) {
          const sunA = sunParticles[sunI];
          const sunB = sunParticles[sunJ];
          const sunGap = Math.hypot(sunA.sunX - sunB.sunX, sunA.sunY - sunB.sunY);
          if (sunGap < 128) {
            sunCtx.beginPath();
            sunCtx.strokeStyle = `rgba(130, 190, 255, ${0.16 * (1 - sunGap / 128)})`;
            sunCtx.lineWidth = 0.7;
            sunCtx.moveTo(sunA.sunX, sunA.sunY);
            sunCtx.lineTo(sunB.sunX, sunB.sunY);
            sunCtx.stroke();
          }
        }
      }

      // 鼠标与邻近粒子的连线
      if (sunPointer.sunActive) {
        sunParticles.forEach((sunDot) => {
          const sunGap = Math.hypot(sunDot.sunX - sunPointer.sunX, sunDot.sunY - sunPointer.sunY);
          if (sunGap < 180) {
            sunCtx.beginPath();
            sunCtx.strokeStyle = `rgba(108, 229, 196, ${0.22 * (1 - sunGap / 180)})`;
            sunCtx.lineWidth = 0.8;
            sunCtx.moveTo(sunDot.sunX, sunDot.sunY);
            sunCtx.lineTo(sunPointer.sunX, sunPointer.sunY);
            sunCtx.stroke();
          }
        });
      }

      sunCtx.globalCompositeOperation = 'source-over';
    };

    /** 动画循环 */
    const sunAnimate = () => {
      sunDrawFrame();
      window.requestAnimationFrame(sunAnimate);
    };

    sunResizeCanvas();

    window.addEventListener('resize', sunResizeCanvas);
    window.addEventListener('mousemove', (sunEvent) => {
      sunPointer.sunX = sunEvent.clientX;
      sunPointer.sunY = sunEvent.clientY;
      sunPointer.sunActive = true;
    });
    window.addEventListener('mouseleave', () => {
      sunPointer.sunActive = false;
      sunPointer.sunX = -9999;
      sunPointer.sunY = -9999;
    });

    if (sunReduceMotion) {
      sunDrawFrame();
    } else {
      sunAnimate();
    }
  }

  /* ================= 二、卡片跟随鼠标的光晕 ================= */
  const sunCards = document.querySelectorAll('.sun_card--active');
  sunCards.forEach((sunCard) => {
    sunCard.addEventListener('mousemove', (sunEvent) => {
      const sunRect = sunCard.getBoundingClientRect();
      sunCard.style.setProperty('--sun_mx', `${sunEvent.clientX - sunRect.left}px`);
      sunCard.style.setProperty('--sun_my', `${sunEvent.clientY - sunRect.top}px`);
    });
  });

  /* ================= 三、已完成页面数量统计 ================= */
  const sunNavGrid = document.getElementById('sun_nav_grid');
  const sunPageCount = document.getElementById('sun_page_count');
  if (sunNavGrid && sunPageCount) {
    const sunDonePages = sunNavGrid.querySelectorAll('a.sun_card').length;
    sunPageCount.textContent = String(sunDonePages);
    console.log(`[sun_index] 页面导航已登记的已完成页面数量：${sunDonePages}`);
  }

  /* ================= 四、锚点平滑滚动 ================= */
  document.querySelectorAll('a[href^="#sun_"]').forEach((sunAnchor) => {
    sunAnchor.addEventListener('click', (sunEvent) => {
      const sunTarget = document.querySelector(sunAnchor.getAttribute('href'));
      if (!sunTarget) return;
      sunEvent.preventDefault();
      sunTarget.scrollIntoView({ behavior: sunReduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ================= 五、后端接口数据输出到控制台 ================= */
  const sunLoadServerData = async () => {
    try {
      const sunSiteRes = await fetch('/api/site-info');
      const sunSiteJson = await sunSiteRes.json();
      console.log('[sun_index] GET /api/site-info ->', sunSiteJson);

      const sunHealthRes = await fetch('/api/health');
      const sunHealthJson = await sunHealthRes.json();
      console.log('[sun_index] GET /api/health ->', sunHealthJson);
    } catch (sunError) {
      console.error('[sun_index] 接口请求失败：', sunError);
    }
  };

  sunLoadServerData();
})();
