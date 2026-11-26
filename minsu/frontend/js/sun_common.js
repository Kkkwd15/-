/**
 * 姓名：【孙宁】 | 学号：【24001011016】 | 时间：2026-11-26 | 大模型：Auto
 * 文件说明：新版首页 / 页面说明页公共脚本 —— Canvas 星尘背景 + 滚动进场 + 兜底显示
 */
(function sunCommon() {
  'use strict';

  function sunStartBackground() {
    const sunCanvas = document.getElementById('sun_home_bg') || document.getElementById('sun_doc_bg');
    if (!sunCanvas) return;
    const sunCtx = sunCanvas.getContext('2d');
    let sunW = 0, sunH = 0, sunNodes = [];
    const sunMouse = { sunX: -9999, sunY: -9999 };

    function sunResize() {
      const sunDpr = Math.min(window.devicePixelRatio || 1, 2);
      sunW = window.innerWidth; sunH = window.innerHeight;
      sunCanvas.width = sunW * sunDpr; sunCanvas.height = sunH * sunDpr;
      sunCtx.setTransform(sunDpr, 0, 0, sunDpr, 0, 0);
      const sunCount = Math.min(90, Math.floor((sunW * sunH) / 19000));
      sunNodes = Array.from({ length: sunCount }, () => ({
        sunX: Math.random() * sunW, sunY: Math.random() * sunH,
        sunVx: (Math.random() - .5) * .32, sunVy: (Math.random() - .5) * .32,
        sunR: Math.random() * 1.7 + .7,
        sunHue: ['108, 229, 196', '127, 177, 255', '181, 154, 255'][Math.floor(Math.random() * 3)]
      }));
    }

    function sunFrame() {
      sunCtx.clearRect(0, 0, sunW, sunH);
      for (let sunA = 0; sunA < sunNodes.length; sunA += 1) {
        const sunN = sunNodes[sunA];
        sunN.sunX += sunN.sunVx; sunN.sunY += sunN.sunVy;
        if (sunN.sunX < 0 || sunN.sunX > sunW) sunN.sunVx *= -1;
        if (sunN.sunY < 0 || sunN.sunY > sunH) sunN.sunVy *= -1;
        const sunMd = Math.hypot(sunN.sunX - sunMouse.sunX, sunN.sunY - sunMouse.sunY);
        if (sunMd < 150) {
          sunN.sunX += (sunMouse.sunX - sunN.sunX) * .005;
          sunN.sunY += (sunMouse.sunY - sunN.sunY) * .005;
        }
        sunCtx.beginPath();
        sunCtx.arc(sunN.sunX, sunN.sunY, sunN.sunR, 0, Math.PI * 2);
        sunCtx.fillStyle = `rgba(${sunN.sunHue}, .55)`;
        sunCtx.fill();
        for (let sunB = sunA + 1; sunB < sunNodes.length; sunB += 1) {
          const sunDist = Math.hypot(sunN.sunX - sunNodes[sunB].sunX, sunN.sunY - sunNodes[sunB].sunY);
          if (sunDist < 115) {
            sunCtx.beginPath();
            sunCtx.moveTo(sunN.sunX, sunN.sunY);
            sunCtx.lineTo(sunNodes[sunB].sunX, sunNodes[sunB].sunY);
            sunCtx.strokeStyle = `rgba(127, 177, 255, ${.12 * (1 - sunDist / 115)})`;
            sunCtx.stroke();
          }
        }
      }
      if (sunMouse.sunX > -999) {
        const sunGlow = sunCtx.createRadialGradient(sunMouse.sunX, sunMouse.sunY, 0, sunMouse.sunX, sunMouse.sunY, 170);
        sunGlow.addColorStop(0, 'rgba(108, 229, 196, .07)');
        sunGlow.addColorStop(1, 'rgba(108, 229, 196, 0)');
        sunCtx.fillStyle = sunGlow;
        sunCtx.fillRect(sunMouse.sunX - 170, sunMouse.sunY - 170, 340, 340);
      }
      requestAnimationFrame(sunFrame);
    }
    window.addEventListener('resize', sunResize);
    window.addEventListener('mousemove', (sunE) => { sunMouse.sunX = sunE.clientX; sunMouse.sunY = sunE.clientY; });
    window.addEventListener('mouseout', () => { sunMouse.sunX = -9999; sunMouse.sunY = -9999; });
    sunResize(); sunFrame();
  }

  function sunInitReveal() {
    const sunItems = document.querySelectorAll('.sun_reveal');
    const sunIo = new IntersectionObserver((sunEntries) => {
      sunEntries.forEach((sunEntry, sunIndex) => {
        if (!sunEntry.isIntersecting) return;
        window.setTimeout(() => sunEntry.target.classList.add('sun_reveal--on'), sunIndex * 80);
        sunIo.unobserve(sunEntry.target);
      });
    }, { threshold: .1 });
    sunItems.forEach((sunItem) => sunIo.observe(sunItem));
    // 兜底：无头浏览器 / 减弱动画环境，2 秒后强制显示所有内容
    window.setTimeout(() => {
      sunItems.forEach((sunItem) => sunItem.classList.add('sun_reveal--on'));
    }, 2000);
  }

  sunStartBackground();
  sunInitReveal();
  console.log('[sun_common] 导航页/说明页加载完成：Canvas 背景 + 进场动画');
})();
