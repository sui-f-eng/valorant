/**
 * DOM 绑定、菜单、灵敏度与跟手度
 */
(function (global) {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function fmtTime(t) {
    var s = Math.max(0, Math.ceil(t));
    return s + "s";
  }

  function fmtPct(hits, shots) {
    if (!shots) return "—";
    return Math.round((100 * hits) / shots) + "%";
  }

  function init() {
    var canvas = $("game-canvas");
    var overlay = $("overlay");
    var hudScore = $("hud-score");
    var hudAcc = $("hud-acc");
    var hudTime = $("hud-time");
    var hudCombo = $("hud-combo");
    var toast = $("toast");
    var sensSlider = $("sensitivity");
    var sensVal = $("sensitivity-val");
    var smoothSlider = $("smooth");
    var smoothVal = $("smooth-val");
    var recoilSlider = $("recoil");
    var recoilVal = $("recoil-val");
    var btnStart = $("btn-start");
    var btnRestart = $("btn-restart");
    var endTitle = $("end-title");
    var endDetail = $("end-detail");
    var bestEl = $("best-score");

    var toastTimer = null;
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add("show");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove("show");
      }, 420);
    }

    var game = new global.AimGame(canvas, {
      onHud: function (d) {
        hudScore.textContent = String(d.score);
        hudAcc.textContent = fmtPct(d.hits, d.shots);
        hudTime.textContent = fmtTime(d.timeLeft);
        hudCombo.textContent = d.combo > 0 ? "×" + d.combo : "—";
        bestEl.innerHTML =
          "最高分：<strong>" + d.highScore + "</strong>（本地）";
      },
      onMiss: function () {
        showToast("未命中");
      },
      onEnd: function (d) {
        endTitle.textContent = "回合结束";
        endDetail.innerHTML =
          "得分 <strong>" +
          d.score +
          "</strong> · 命中 " +
          d.hits +
          "/" +
          d.shots +
          " · 最高连击 " +
          d.maxCombo +
          "<br/>最高分：" +
          d.highScore;
        overlay.classList.remove("hidden");
        $("panel-menu").classList.add("hidden");
        $("panel-end").classList.remove("hidden");
      },
    });

    game.refreshHud();

    function readSliders() {
      game.sensitivity = parseFloat(sensSlider.value, 10) / 100;
      game.smooth = parseFloat(smoothSlider.value, 10) / 100;
      game.recoilAmount = parseFloat(recoilSlider.value, 10) / 100;
      sensVal.textContent = game.sensitivity.toFixed(2);
      smoothVal.textContent = game.smooth.toFixed(2);
      recoilVal.textContent = game.recoilAmount.toFixed(2);
    }

    sensSlider.addEventListener("input", readSliders);
    smoothSlider.addEventListener("input", readSliders);
    recoilSlider.addEventListener("input", readSliders);
    readSliders();

    game.startRenderLoop();

    function onResize() {
      game.resize();
    }
    global.addEventListener("resize", onResize);
    global.addEventListener("orientationchange", onResize);
    onResize();

    canvas.addEventListener(
      "touchstart",
      function (e) {
        e.preventDefault();
        game.onTouchStart(e);
      },
      { passive: false }
    );
    canvas.addEventListener(
      "touchmove",
      function (e) {
        e.preventDefault();
        game.onTouchMove(e);
      },
      { passive: false }
    );
    canvas.addEventListener("touchend", function (e) {
      game.onTouchEnd(e);
    });
    canvas.addEventListener("touchcancel", function (e) {
      game.onTouchEnd(e);
    });

    function openMenu() {
      overlay.classList.remove("hidden");
      $("panel-menu").classList.remove("hidden");
      $("panel-end").classList.add("hidden");
    }

    btnStart.addEventListener("click", function () {
      global.AimAudio.resume();
      overlay.classList.add("hidden");
      readSliders();
      game.start();
    });

    btnRestart.addEventListener("click", function () {
      global.AimAudio.resume();
      overlay.classList.add("hidden");
      readSliders();
      game.start();
    });

    openMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
