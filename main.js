var canvas = document.getElementById("canvas"),
    stage = new createjs.StageGL(canvas, { transparent: true, antialias: true });
createjs.Ticker.on("tick", tick);
createjs.Ticker.timingMode = createjs.Ticker.RAF;
var w = 100, h = 100;

var params = {},
    search = window.location.search.substr(1).split("&");
for (var i = 0, l = search.length; i < l; i++) {
    var parts = search[i].split("=");
    params[parts[0]] = parts[1];
}

// Init Code
handleResize();

var ss, totalColors = 16;

createSprites();
function createSprites() {
    var sb = new createjs.SpriteSheetBuilder(),
        rect = new createjs.Rectangle(-5, -5, 10, 10);

    // 16 colors, 16 lightness
    var variations = 20;
    for (var i = 0; i < totalColors; i++) {
        var frames = [];
        for (var j = 0; j < variations + 1; j++) {
            var color = createjs.Graphics.getHSL(360 / totalColors * i | 0, 100, 100 - (50 * j / variations | 0)),
                star = new createjs.Shape();
            star.fillCmd = star.graphics.f(color).command;
            star.graphics.dp(0, 0, 3, 5, 3);
            var f = sb.addFrame(star, rect);
            frames.push(f);
        }
        sb.addAnimation("star-" + i, frames, null, 0.3);
    }
    var proj = new createjs.Shape();
    proj.graphics.f("white").dc(0, 0, 3);
    var f = sb.addFrame(proj, new createjs.Rectangle(-3, -3, 6, 6));
    sb.addAnimation("projectile", [f]);

    ss = sb.build();
}


var fws = [], ps = [],
    c = new createjs.Container();
stage.addChild(c);

function createFW() {
    var s = new createjs.Sprite(ss, "projectile")
        .set({
            x: Math.random() * w,
            y: h - 20
        });
    var t = new createjs.Point(Math.random() * (w / 2) + w / 4, h / 10),
        xd = t.x - s.x,
        yd = t.y - s.y,
        a = Math.atan2(yd, xd);
    s.set({
        tx: Math.cos(a) * -yd / 60,  //(Math.random() * 15-7.5),
        ty: Math.sin(a) * -yd / 60,  //(Math.random() * 8 + 3),
        pow: Math.random() * 30 + 20
    });
    stage.addChild(s);
    fws.push(s);
}
function explode(fw, index) {
    stage.removeChild(fw);
    fws.splice(index, 1);

    var count = 0, hue = Math.random() * (totalColors) | 0;
    if (Math.random() > 0.6) { hue = -1; }

    if (Math.random() < 0.5) {
        textwork(fw, hue);
    } else {
        firework(fw, hue);
    }
}

function firework(fw, hue) {
    var size = Math.random() * 5 + 10;
    for (var i = 0, l = size * 20; i < l; i++) {
        var p = getStar();
        if (p == null) { console.log("Out of particles"); return; }
        p.set({
            x: fw.x,
            y: fw.y,
        });
        var a = Math.random() * Math.PI * 2;
        p.set({
            tx: Math.cos(a) * Math.random() * size / 3,
            ty: Math.sin(a) * Math.random() * size / 3,
            gravity: 0.05,
            decay: 0.996,
            speedDecay: 0.965,
            scale: size / 10
        });
        p.gotoAndPlay("star-" + hue);
        stage.addChild(p);
        ps.push(p);
    }
}

function textwork(fw, hue) {
    var size = Math.random() * 60 + 60;
    var t = new createjs.Text(getWord(), "bold " + size + "px Arial", "white")
        .set({ alpha: 0.1, textAlign: "center" }),
        b = t.getBounds();
    t.cache(b.x, b.y, b.width, b.height);

    // Move the Container
    c.set({ x: fw.x, y: fw.y - b.height / 2, rotation: Math.random() * 20 - 10 });
    // Get the pixel data of the text
    var data = t.cacheCanvas.getContext("2d").getImageData(0, 0, b.width, b.height).data;

    for (var i = 0, l = 300 * t.text.length; i < l; i++) {
        var px = Math.random() * b.width | 0,
            py = Math.random() * b.height | 0,
            pIndex = py * (b.width | 0) + px;
        var dpa = data[pIndex * 4 + 3];
        if (dpa == 0 || dpa == null) { continue; }

        var tp = c.localToGlobal(px + b.x, py + b.y);
        var p = getStar();
        if (p == null) { console.log("Out of particles"); return; }
        p.set({
            flicker: true,
            x: tp.x, y: tp.y,
            tx: Math.random() * 0, ty: 0.01,
            alpha: 1.5, scale: Math.random() * 0.5 + 0.75,
            gravity: 0.01 + Math.random() / 60,
            decay: 0.992,
            speedDecay: 1
        });
        p.gotoAndPlay(hue == -1 ? 0 : "star-" + hue);
        stage.addChild(p);
        ps.push(p);
    }
    t.uncache();
}

stage.on("stagemousedown", createFW);


// Tick Code
function tick(event) {

    // Projectiles
    for (var i = fws.length - 1; i >= 0; i--) {
        var fw = fws[i];
        fw.x += fw.tx;
        fw.y += fw.ty;
        fw.ty += 0.1;
        fw.scale *= 0.99;
        if (fw.ty > 0) { fw.pow--; }
        if (fw.pow <= 0) {
            explode(fw, i);
        }
        if (fw.x > w || fw.x < 0) {
            stage.removeChild(fw);
            fws.splice(i, 1);
        }
    }

    // Particles
    for (var i = ps.length - 1; i >= 0; i--) {
        var p = ps[i];
        if (p.flicker) {
            p.visible = Math.random() > 0.8;
        }
        p.x += p.tx;
        p.y += p.ty;
        p.ty += p.gravity;
        p.tx *= p.speedDecay;
        p.ty *= p.speedDecay;

        p.alpha *= p.decay;
        p.scale *= 0.98;
        p.rotation += 0.1;
        if (p.alpha < 0.4) {
            ps.splice(i, 1);
            returnStar(p);
        }
    }
    stage.update(event);
}

// Resize Code
window.addEventListener("resize", handleResize, false);
function handleResize(event) {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    stage.updateViewport(w, h);
    stage.update();
}

var words = ["Yêu Bạn Rất nhiều", "Anh Yêu Em", "Nhớ Em Rất Nhiều", "❤ ❤ ❤ ❤ ❤", "Thương Em Yêu Nhiều", "11/07/20"];
if (params.words) {
    words = params.words.split(",");
}
function getWord() {
    return words[Math.random() * words.length | 0].toUpperCase();
}

// Object Pooling.
var hash = [];
function getStar() {
    var star = null;
    if (hash.length == 0) {
        star = new createjs.Sprite(ss);
    } else if (ps.length > 5000) {
        return null;
    } else {
        star = hash.pop();
    }
    star.set({ alpha: 1, scale: 1, x: 0, y: 0, rotation: 0, active: true, visible: true, flicker: false });
    return star;
}
function returnStar(star) {
    star.visible = star.active = false;
    hash.push(star);
}

autoFW();
function autoFW() {
    createFW();
    setTimeout(autoFW, Math.random() * 500 + 300);
}