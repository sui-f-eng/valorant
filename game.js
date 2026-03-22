/**
 * 核心游戏循环、触控分区、准星绝对跟随、射击判定
 */
(function (global) {
  "use strict";

  var U = global.AimUtils;
  var Audio = global.AimAudio;
  var Particles = global.AimParticles;
  var Targets = global.AimTargets;

  var ROUND_SECONDS = 30;
  var SPAWN_MIN = 0.5;
  var SPAWN_MAX_START = 1.45;
  var STORAGE_KEY = "varolant_aim_highscore_v1";

  function HitMarker(x, y, t) {
    this.x = x;
    this.y = y;
    this.t = t;
    this.maxT = t;
  }

  function AimGame(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.callbacks = callbacks || {};

    this.w = 0;
    this.h = 0;
    this.dpr = 1;

    this.state = "menu";
    this.timeLeft = ROUND_SECONDS;
    this.score = 0;
    this.shots = 0;
    this.hits = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.highScore = 0;
    this.loadHighScore();

    this.sensitivity = 1;
    this.smooth = 0.88;
    this.recoilAmount = 1;

    this.targets = [];
    this.particles = [];
    this.hitMarkers = [];

    this.spawnTimer = 0;
    this.spawnInterval = SPAWN_MAX_START;
    this.difficulty = 0;
    this.elapsed = 0;

    this.aimTouchId = null;
    this.fingerX = 0;
    this.fingerY = 0;
    this.hasAimFinger = false;

    this.crossX = 0;
    this.crossY = 0;
    this.aimTargetX = 0;
    this.aimTargetY = 0;
    this.recoilX = 0;
    this.recoilY = 0;

    this.lastShotAt = -1;
    this._lastTs = 0;
    this._boundTick = this._tick.bind(this);
  }

  AimGame.prototype.loadHighScore = function () {
    try {
      var v = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      if (!isNaN(v)) this.highScore = v;
    } catch (e) {}
  };

  AimGame.prototype.saveHighScore = function () {
    try {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(STORAGE_KEY, String(this.highScore));
      }
    } catch (e) {}
  };

  AimGame.prototype.resize = function () {
    this.dpr = Math.min(global.devicePixelRatio || 1, 2.5);
    var rect = this.canvas.getBoundingClientRect();
    this.w = Math.floor(rect.width * this.dpr);
    this.h = Math.floor(rect.height * this.dpr);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.crossX = this.w * 0.5;
    this.crossY = this.h * 0.5;
    this.aimTargetX = this.crossX;
    this.aimTargetY = this.crossY;
  };

  AimGame.prototype.screenToCanvas = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var sx = this.w / rect.width;
    var sy = this.h / rect.height;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
  };

  AimGame.prototype.isRightZone = function (clientX) {
    return clientX >= global.innerWidth * 0.5;
  };

  AimGame.prototype.isLeftZone = function (clientX) {
    return clientX < global.innerWidth * 0.5;
  };

  AimGame.prototype.setAimFromClient = function (clientX, clientY) {
    var p = this.screenToCanvas(clientX, clientY);
    var cx = this.w * 0.5;
    var cy = this.h * 0.5;
    var tx = cx + (p.x - cx) * this.sensitivity;
    var ty = cy + (p.y - cy) * this.sensitivity;
    this.aimTargetX = U.clamp(tx, 8, this.w - 8);
    this.aimTargetY = U.clamp(ty, 8, this.h - 8);
  };

  AimGame.prototype.onTouchStart = function (e) {
    if (this.state !== "playing") return;
    var i;
    for (i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (this.isRightZone(t.clientX)) {
        if (this.aimTouchId === null) {
          this.aimTouchId = t.identifier;
          this.hasAimFinger = true;
          this.setAimFromClient(t.clientX, t.clientY);
        }
      } else if (this.isLeftZone(t.clientX)) {
        this.fire();
      }
    }
  };

  AimGame.prototype.onTouchMove = function (e) {
    if (this.state !== "playing" || this.aimTouchId === null) return;
    var i;
    for (i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === this.aimTouchId) {
        this.setAimFromClient(t.clientX, t.clientY);
        break;
      }
    }
  };

  AimGame.prototype.onTouchEnd = function (e) {
    var i;
    for (i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === this.aimTouchId) {
        this.aimTouchId = null;
        this.hasAimFinger = false;
      }
    }
  };

  AimGame.prototype.fire = function () {
    if (this.state !== "playing") return;
    this.shots += 1;
    this.lastShotAt = this.elapsed;

    var ax = this.crossX;
    var ay = this.crossY;
    var rec = 14 * this.recoilAmount;
    this.recoilX += U.rand(-rec, rec);
    this.recoilY += U.rand(-rec, rec);

    var best = -1;
    var bestD = 1e15;
    var j;
    for (j = 0; j < this.targets.length; j++) {
      var tar = this.targets[j];
      var d = U.distSq(ax, ay, tar.x, tar.y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }

    if (best >= 0) {
      var tg = this.targets[best];
      if (bestD <= tg.r * tg.r) {
        var hr = tg.headRadius();
        var headshot = U.distSq(ax, ay, tg.x, tg.y) <= hr * hr;
        var base = headshot ? 120 : 60;
        var mult = 1 + Math.min(this.combo, 20) * 0.05;
        var pts = Math.floor(base * mult);
        this.score += pts;
        this.hits += 1;
        this.combo += 1;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        Particles.burst(this.particles, tg.x, tg.y, headshot);
        Particles.flash(this.particles, tg.x, tg.y);
        this.hitMarkers.push(new HitMarker(tg.x, tg.y, 0.22));
        Audio.playHit(headshot);
        this.targets.splice(best, 1);
        this._notifyHud();
        return;
      }
    }

    this.combo = 0;
    Audio.playMiss();
    if (global.navigator && global.navigator.vibrate) {
      try {
        global.navigator.vibrate(18);
      } catch (err) {}
    }
    if (this.callbacks.onMiss) this.callbacks.onMiss();
    this._notifyHud();
  };

  AimGame.prototype._notifyHud = function () {
    if (this.callbacks.onHud) {
      this.callbacks.onHud({
        score: this.score,
        shots: this.shots,
        hits: this.hits,
        combo: this.combo,
        timeLeft: this.timeLeft,
        highScore: this.highScore,
      });
    }
  };

  AimGame.prototype.refreshHud = function () {
    this._notifyHud();
  };

  AimGame.prototype.startRenderLoop = function () {
    this._lastTs = performance.now();
    global.requestAnimationFrame(this._boundTick);
  };

  AimGame.prototype._tick = function (ts) {
    var dt = Math.min(0.05, (ts - this._lastTs) / 1000);
    this._lastTs = ts;
    this.update(dt);
    this.draw();
    global.requestAnimationFrame(this._boundTick);
  };

  AimGame.prototype.start = function () {
    Audio.resume();
    this.resize();
    this.state = "playing";
    this.timeLeft = ROUND_SECONDS;
    this.score = 0;
    this.shots = 0;
    this.hits = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.targets = [];
    this.particles = [];
    this.hitMarkers = [];
    this.spawnTimer = 0.15;
    this.spawnInterval = SPAWN_MAX_START;
    this.difficulty = 0;
    this.elapsed = 0;
    this.aimTouchId = null;
    this.hasAimFinger = false;
    this.crossX = this.w * 0.5;
    this.crossY = this.h * 0.5;
    this.aimTargetX = this.crossX;
    this.aimTargetY = this.crossY;
    this.recoilX = 0;
    this.recoilY = 0;
    this._notifyHud();
  };

  AimGame.prototype.update = function (dt) {
    if (this.state !== "playing") return;

    this.elapsed += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endRound();
      return;
    }

    this.difficulty = U.clamp(this.elapsed / ROUND_SECONDS, 0, 1);
    var targetInterval =
      SPAWN_MAX_START - (SPAWN_MAX_START - SPAWN_MIN) * this.difficulty;
    this.spawnInterval = targetInterval;

    this.spawnTimer -= dt;
    var maxTargets = 16;
    if (this.spawnTimer <= 0 && this.targets.length < maxTargets) {
      this.targets.push(Targets.spawn(this.w, this.h, this.elapsed, this.difficulty));
      this.spawnTimer = this.spawnInterval * U.rand(0.85, 1.1);
      Audio.playSpawn();
    } else if (this.targets.length >= maxTargets) {
      this.spawnTimer = U.rand(0.08, 0.15);
    }

    var recDamp = Math.pow(0.12, dt * 60);
    this.recoilX *= recDamp;
    this.recoilY *= recDamp;

    var destX = this.aimTargetX + this.recoilX;
    var destY = this.aimTargetY + this.recoilY;
    destX = U.clamp(destX, 8, this.w - 8);
    destY = U.clamp(destY, 8, this.h - 8);

    var k = U.clamp(this.smooth, 0.04, 1);
    if (k >= 0.999) {
      this.crossX = destX;
      this.crossY = destY;
    } else {
      var lerpK = 1 - Math.pow(1 - k, dt * 60);
      this.crossX = U.lerp(this.crossX, destX, lerpK);
      this.crossY = U.lerp(this.crossY, destY, lerpK);
    }

    var i;
    for (i = this.targets.length - 1; i >= 0; i--) {
      if (!this.targets[i].update(dt, this.w, this.h, this.elapsed)) {
        this.targets.splice(i, 1);
        this.combo = 0;
      }
    }

    for (i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      if (!p.update(dt)) this.particles.splice(i, 1);
    }

    for (i = this.hitMarkers.length - 1; i >= 0; i--) {
      var hm = this.hitMarkers[i];
      hm.t -= dt;
      if (hm.t <= 0) this.hitMarkers.splice(i, 1);
    }

    this._notifyHud();
  };

  AimGame.prototype.endRound = function () {
    this.state = "ended";
    this.saveHighScore();
    this._notifyHud();
    if (this.callbacks.onEnd) {
      this.callbacks.onEnd({
        score: this.score,
        shots: this.shots,
        hits: this.hits,
        maxCombo: this.maxCombo,
        highScore: this.highScore,
      });
    }
  };

  AimGame.prototype.drawBackground = function () {
    var ctx = this.ctx;
    var g = ctx.createLinearGradient(0, 0, this.w, this.h);
    g.addColorStop(0, "#0c1219");
    g.addColorStop(0.5, "#0a0e14");
    g.addColorStop(1, "#080b10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.strokeStyle = "rgba(255,70,85,0.07)";
    ctx.lineWidth = 1 * this.dpr;
    var step = 48 * this.dpr;
    var x;
    var y;
    for (x = 0; x < this.w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.h);
      ctx.stroke();
    }
    for (y = 0; y < this.h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }
  };

  AimGame.prototype.drawCrosshair = function () {
    var ctx = this.ctx;
    var x = this.crossX;
    var y = this.crossY;
    var s = 10 * this.dpr;
    var out = 18 * this.dpr;
    var thick = 2 * this.dpr;

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = thick;
    ctx.lineCap = "square";

    ctx.beginPath();
    ctx.moveTo(x - out, y);
    ctx.lineTo(x - s, y);
    ctx.moveTo(x + s, y);
    ctx.lineTo(x + out, y);
    ctx.moveTo(x, y - out);
    ctx.lineTo(x, y - s);
    ctx.moveTo(x, y + s);
    ctx.lineTo(x, y + out);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,70,85,0.95)";
    ctx.lineWidth = 1.2 * this.dpr;
    ctx.beginPath();
    ctx.arc(x, y, 2.2 * this.dpr, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,70,85,0.35)";
    ctx.beginPath();
    ctx.arc(x, y, 1 * this.dpr, 0, Math.PI * 2);
    ctx.fill();
  };

  AimGame.prototype.drawHitMarkers = function () {
    var ctx = this.ctx;
    var i;
    for (i = 0; i < this.hitMarkers.length; i++) {
      var hm = this.hitMarkers[i];
      var a = hm.t / hm.maxT;
      var L = 14 * this.dpr * (1.4 - a);
      ctx.strokeStyle = "rgba(255,255,255," + (0.2 + 0.75 * a) + ")";
      ctx.lineWidth = 2.2 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(hm.x - L, hm.y - L);
      ctx.lineTo(hm.x + L, hm.y + L);
      ctx.moveTo(hm.x + L, hm.y - L);
      ctx.lineTo(hm.x - L, hm.y + L);
      ctx.stroke();
    }
  };

  AimGame.prototype.draw = function () {
    var ctx = this.ctx;
    this.drawBackground();

    var i;
    for (i = 0; i < this.targets.length; i++) {
      this.targets[i].draw(ctx);
    }

    for (i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    this.drawHitMarkers();
    this.drawCrosshair();

    if (this.state === "playing" && this.lastShotAt >= 0 && this.elapsed - this.lastShotAt < 0.05) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 3 * this.dpr;
      ctx.beginPath();
      ctx.arc(this.crossX, this.crossY, 26 * this.dpr, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  AimGame.ROUND_SECONDS = ROUND_SECONDS;
  AimGame.STORAGE_KEY = STORAGE_KEY;

  global.AimGame = AimGame;
})(typeof window !== "undefined" ? window : this);
