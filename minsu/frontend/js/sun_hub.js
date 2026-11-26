/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-19 | 大模型：Auto
 * 文件说明：云栖酒店服务网站交互脚本（canvas 粒子背景、板块卡片光晕跟随、锚点平滑滚动、
 *           板块跳转前的高亮反馈、接口健康状态控制台输出）
 */
(function sunHubPage() {
  'use strict';

  const sunReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= 一、canvas 粒子背景动画 ================= */
  const sunCanvas = document.getElementById('sun_hub_canvas_bg');
  if (sunCanvas && sunCanvas.getContext) {
    const sunCtx = sunCanvas.getContext('2d');
    const sunPointer = { sunX: -9999, sunY: -9999, sunActive: false };
    let sunParticles = [];
    let sunWidth = 0;
    let sunHeight = 0;
    let sunDpr = 1;

    const sunCreateParticle = () => ({
      sunX: Math.random() * sunWidth,
      sunY: Math.random() * sunHeight,
      sunVx: (Math.random() - 0.5) * 0.28,
      sunVy: (Math.random() - 0.5) * 0.28,
      sunRadius: Math.random() * 1.5 + 0.6,
      sunAlpha: Math.random() * 0.5 + 0.25,
      sunHue: Math.random() > 0.5 ? 276 : 216
    });

    const sunBuildParticles = () => {
      const sunArea = sunWidth * sunHeight;
      const sunCount = Math.min(140, Math.max(38, Math.round(sunArea / 14000)));
      sunParticles = Array.from({ length: sunCount }, sunCreateParticle);
    };

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

    const sunDrawFrame = () => {
      sunCtx.clearRect(0, 0, sunWidth, sunHeight);
      sunCtx.globalCompositeOperation = 'lighter';

      sunParticles.forEach((sunDot) => {
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

        if (sunDot.sunX < -20) sunDot.sunX = sunWidth + 20;
        if (sunDot.sunX > sunWidth + 20) sunDot.sunX = -20;
        if (sunDot.sunY < -20) sunDot.sunY = sunHeight + 20;
        if (sunDot.sunY > sunHeight + 20) sunDot.sunY = -20;

        sunCtx.beginPath();
        sunCtx.fillStyle = `hsla(${sunDot.sunHue}, 90%, 76%, ${sunDot.sunAlpha})`;
        sunCtx.arc(sunDot.sunX, sunDot.sunY, sunDot.sunRadius, 0, Math.PI * 2);
        sunCtx.fill();
      });

      for (let sunI = 0; sunI < sunParticles.length; sunI += 1) {
        for (let sunJ = sunI + 1; sunJ < sunParticles.length; sunJ += 1) {
          const sunGap = Math.hypot(
            sunParticles[sunI].sunX - sunParticles[sunJ].sunX,
            sunParticles[sunI].sunY - sunParticles[sunJ].sunY
          );
          if (sunGap < 128) {
            sunCtx.beginPath();
            sunCtx.strokeStyle = `rgba(170, 150, 255, ${0.16 * (1 - sunGap / 128)})`;
            sunCtx.lineWidth = 0.7;
            sunCtx.moveTo(sunParticles[sunI].sunX, sunParticles[sunI].sunY);
            sunCtx.lineTo(sunParticles[sunJ].sunX, sunParticles[sunJ].sunY);
            sunCtx.stroke();
          }
        }
      }

      sunCtx.globalCompositeOperation = 'source-over';
    };

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

  /* ================= 二、板块卡片光晕跟随鼠标 ================= */
  document.querySelectorAll('.sun_hub_board').forEach((sunBoard) => {
    sunBoard.addEventListener('mousemove', (sunEvent) => {
      const sunRect = sunBoard.getBoundingClientRect();
      sunBoard.style.setProperty('--sun_mx', `${sunEvent.clientX - sunRect.left}px`);
      sunBoard.style.setProperty('--sun_my', `${sunEvent.clientY - sunRect.top}px`);
    });
  });

  /* ================= 三、首屏按钮锚点平滑滚动 ================= */
  document.querySelectorAll('a[href^="#sun_hub_"]').forEach((sunAnchor) => {
    sunAnchor.addEventListener('click', (sunEvent) => {
      const sunTarget = document.querySelector(sunAnchor.getAttribute('href'));
      if (!sunTarget) return;
      sunEvent.preventDefault();
      sunTarget.scrollIntoView({ behavior: sunReduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ================= 四、板块卡片跳转前高亮反馈 ================= */
  document.querySelectorAll('.sun_hub_board').forEach((sunBoard) => {
    sunBoard.addEventListener('click', () => {
      sunBoard.style.transform = 'translateY(-7px) scale(0.985)';
      window.setTimeout(() => {
        sunBoard.style.transform = '';
      }, 220);
    });
  });

  /* ================= 五、后端健康状态输出到控制台 ================= */
  const sunCheckBackend = async () => {
    try {
      const sunRes = await fetch('/api/health');
      const sunJson = await sunRes.json();
      console.log('[sun_hub] GET /api/health ->', sunJson);
    } catch (sunError) {
      console.error('[sun_hub] 后端接口请求失败（合集页静态功能不受影响）：', sunError);
    }
  };

  sunCheckBackend();
})();
