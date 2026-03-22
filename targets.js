/**
 * 目标类型：静态 / 移动 / 反应靶
 */
(function (global) {
  "use strict";

  var U = global.AimUtils;

  function Target(cfg) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.r = cfg.r;
    this.mode = cfg.mode;
    this.vx = cfg.vx || 0;
    this.vy = cfg.vy || 0;
    this.life = cfg.life;
    this.maxLife = cfg.life;
    this.initialLife = cfg.mode === "reaction" ? cfg.life : 0;
    this.spawnT = cfg.spawnT || 0;
    this.pulse = 0;
  }

  Target.HEAD_RATIO = 0.32;

  Target.prototype.headRadius = function () {
    return this.r * Target.HEAD_RATIO;
  };

  Target.prototype.update = function (dt, w, h, gameTime) {
    this.pulse += dt * 6;
    if (this.mode === "reaction") {
      this.life -= dt;
      return this.life > 0;
    }
    if (this.mode === "moving") {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < this.r) {
        this.x = this.r;
        this.vx *= -1;
      } else if (this.x > w - this.r) {
        this.x = w - this.r;
        this.vx *= -1;
      }
      if (this.y < this.r) {
        this.y = this.r;
        this.vy *= -1;
      } else if (this.y > h - this.r) {
        this.y = h - this.r;
        this.vy *= -1;
      }
    }
    return true;
  };

  Target.prototype.draw = function (ctx) {
    var headR = this.headRadius();
    var alpha = 1;
    if (this.mode === "reaction" && this.initialLife > 0) {
      alpha = U.clamp(this.life / this.initialLife, 0.25, 1);
    }
    ctx.save();
    ctx.globalAlpha = alpha;

    var g = ctx.createRadialGradient(
      this.x - this.r * 0.3,
      this.y - this.r * 0.3,
      0,
      this.x,
      this.y,
      this.r
    );
    g.addColorStop(0, "rgba(255,120,130,0.95)");
    g.addColorStop(0.55, "rgba(255,70,85,0.85)");
    g.addColorStop(1, "rgba(140,30,45,0.9)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(10,14,20,0.75)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  };

  function pickMode(difficulty) {
    var r = Math.random();
    var staticP = U.clamp(0.36 - difficulty * 0.04, 0.22, 0.4);
    var moveP = 0.38;
    if (r < staticP) return "static";
    if (r < staticP + moveP) return "moving";
    return "reaction";
  }

  function spawn(w, h, gameTime, difficulty) {
    var r = U.clamp(U.rand(22, 38) - difficulty * 2, 18, 40);
    var margin = r + 8;
    var x = U.rand(margin, w - margin);
    var y = U.rand(margin, h - margin);
    var mode = pickMode(difficulty);

    var vx = 0;
    var vy = 0;
    if (mode === "moving") {
      var sp = U.rand(45, 95) + difficulty * 15;
      var ang = Math.random() * Math.PI * 2;
      vx = Math.cos(ang) * sp;
      vy = Math.sin(ang) * sp;
    }

    var life = 9999;
    if (mode === "reaction") {
      life = U.clamp(0.55 - difficulty * 0.06, 0.28, 0.55);
    }

    return new Target({
      x: x,
      y: y,
      r: r,
      mode: mode,
      vx: vx,
      vy: vy,
      life: life,
      spawnT: gameTime,
    });
  }

  global.AimTargets = {
    Target: Target,
    spawn: spawn,
  };
})(typeof window !== "undefined" ? window : this);
