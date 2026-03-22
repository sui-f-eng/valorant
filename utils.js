/**
 * 数学与工具函数
 */
(function (global) {
  "use strict";

  global.AimUtils = {
    clamp: function (v, min, max) {
      return Math.max(min, Math.min(max, v));
    },

    lerp: function (a, b, t) {
      return a + (b - a) * t;
    },

    distSq: function (ax, ay, bx, by) {
      var dx = ax - bx;
      var dy = ay - by;
      return dx * dx + dy * dy;
    },

    rand: function (min, max) {
      return min + Math.random() * (max - min);
    },

    randInt: function (min, max) {
      return Math.floor(min + Math.random() * (max - min + 1));
    },
  };
})(typeof window !== "undefined" ? window : this);
