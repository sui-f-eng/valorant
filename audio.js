/**
 * 轻量 Web Audio 命中 / 射击音效
 */
(function (global) {
  "use strict";

  var ctx = null;

  function getCtx() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    return ctx;
  }

  function resume() {
    var c = getCtx();
    if (c && c.state === "suspended") c.resume();
  }

  function beep(freq, duration, type, gainValue) {
    var c = getCtx();
    if (!c) return;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gainValue || 0.12, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration + 0.05);
  }

  global.AimAudio = {
    resume: resume,

    playHit: function (headshot) {
      resume();
      if (headshot) {
        beep(880, 0.06, "square", 0.1);
        setTimeout(function () {
          beep(1320, 0.05, "square", 0.08);
        }, 40);
      } else {
        beep(520, 0.07, "triangle", 0.11);
      }
    },

    playMiss: function () {
      resume();
      beep(180, 0.08, "sawtooth", 0.06);
    },

    playSpawn: function () {
      resume();
      beep(220, 0.03, "sine", 0.04);
    },
  };
})(typeof window !== "undefined" ? window : this);
