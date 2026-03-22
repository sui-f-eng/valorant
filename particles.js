/**
 * 命中粒子与闪光
 */
(function (global) {
  "use strict";

  function Particle(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
  }

  Particle.prototype.update = function (dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 420 * dt;
    this.life -= dt;
    return this.life > 0;
  };

  Particle.prototype.draw = function (ctx) {
    var a = this.life / this.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (0.5 + 0.5 * a), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  global.AimParticles = {
    burst: function (list, x, y, headshot) {
      var n = headshot ? 18 : 12;
      var base = headshot ? "#fff5a0" : "#ff6b7a";
      var i;
      for (i = 0; i < n; i++) {
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        var sp = AimUtils.rand(120, 320);
        list.push(
          new Particle(
            x,
            y,
            Math.cos(ang) * sp,
            Math.sin(ang) * sp - 80,
            AimUtils.rand(0.35, 0.55),
            i % 3 === 0 ? "#ffffff" : base,
            AimUtils.rand(3, 7)
          )
        );
      }
    },

    flash: function (list, x, y) {
      list.push({
        x: x,
        y: y,
        r: 8,
        life: 0.12,
        maxLife: 0.12,
        update: function (dt) {
          this.life -= dt;
          this.r += 280 * dt;
          return this.life > 0;
        },
        draw: function (ctx) {
          var a = this.life / this.maxLife;
          ctx.globalAlpha = a * 0.45;
          ctx.strokeStyle = "#ff4655";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
    },
  };
})(typeof window !== "undefined" ? window : this);
