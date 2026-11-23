/**
 * Original, dependency-free scenery for 后AI生活须知.
 * Everything is drawn locally. No network, fonts, tracking, or external images.
 * The game owns the accessible HTML hotspots above this decorative canvas.
 */

const P = {
  background: '#081519', deep: '#071014', floor: '#10252a', line: '#426a68',
  top: '#355358', front: '#203a40', side: '#132b33', mint: '#9ed8bf',
  cyan: '#66bcb9', amber: '#ddb284', gold: '#9e7855', white: '#dbe8df',
};

function polygon(c, points, fill, stroke, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = width; c.strokeStyle = stroke; c.stroke(); }
}

function line(c, points, color = P.line, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}

function ellipse(c, x, y, rx, ry, fill, stroke, width = 1) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function glow(c, x, y, radius, color, alpha = .16) {
  c.save(); c.globalAlpha = alpha;
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  c.restore();
}

function rand(n) { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }

function world(c, originX = 500, originY = 370, sx = .9, sy = .44) {
  const p = (x, y, z = 0) => [originX + (x - y) * sx, originY + (x + y) * sy - z];
  const quad = (x, y, z, w, d, fill, stroke = P.line, lw = .8) =>
    polygon(c, [p(x, y, z), p(x + w, y, z), p(x + w, y + d, z), p(x, y + d, z)], fill, stroke, lw);
  function box(x, y, z, w, d, h, colors = {}) {
    polygon(c, [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], colors.front || P.front, colors.line || P.line, .8);
    polygon(c, [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], colors.side || P.side, colors.line || P.line, .8);
    quad(x, y, z + h, w, d, colors.top || P.top, colors.line || P.line);
  }
  const stroke = (pts, color = P.line, lw = 1) => line(c, pts.map(q => p(...q)), color, lw);
  function cylinder(x, y, z, radius, height, color = '#365b5c', lit = P.cyan) {
    const [a, b] = p(x, y, z); const ry = radius * .43;
    c.beginPath(); c.moveTo(a - radius, b - height); c.lineTo(a - radius, b);
    c.ellipse(a, b, radius, ry, 0, Math.PI, 0, true);
    c.lineTo(a + radius, b - height); c.closePath();
    const g = c.createLinearGradient(a - radius, b, a + radius, b);
    g.addColorStop(0, '#153139'); g.addColorStop(.45, color); g.addColorStop(1, '#11292f');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#57817a'; c.lineWidth = .7; c.stroke();
    ellipse(c, a, b - height, radius, ry, '#284c4d', '#79a79b', .8);
    ellipse(c, a, b - height + 4, radius * .85, ry * .7, lit, null);
    line(c, [[a - radius * .6, b - height + 9], [a - radius * .6, b - 4]], '#739d9255', 1.3);
  }
  return { p, quad, box, stroke, cylinder };
}

function base(c, t, scene) {
  const bg = c.createLinearGradient(0, 0, 0, 760);
  bg.addColorStop(0, scene === 'home' ? '#17272b' : '#102329');
  bg.addColorStop(.52, '#0b1a20'); bg.addColorStop(1, '#071318');
  c.fillStyle = bg; c.fillRect(-600, -600, 2200, 1960);
  glow(c, 565, 285, 340, '#487e72', .12);
  glow(c, 190, 420, 270, '#183c4b', .13);
  // Fine cartographic grid; the scene remains legible without animation.
  c.save(); c.globalAlpha = .10;
  for (let x = -500; x < 1500; x += 60) line(c, [[x, 500], [x + 650, 200]], '#529b94', .6);
  for (let x = -200; x < 1800; x += 60) line(c, [[x, 500], [x - 650, 200]], '#529b94', .6);
  c.restore();
  if (scene !== 'orbit' && scene !== 'home' && scene !== 'archive') {
    c.save(); c.globalAlpha = .12;
    for (let i = 0; i < 42; i++) {
      const x = rand(i + 51) * 1150 - 80;
      const y = (rand(i + 91) * 900 + t * (12 + rand(i) * 8)) % 900 - 80;
      line(c, [[x, y], [x - 3, y + 15]], '#94b9b6', .65);
    }
    c.restore();
  }
}

function plant(c, w, x, y, z, scale = 1) {
  w.box(x - 8 * scale, y - 5 * scale, z, 16 * scale, 10 * scale, 5 * scale, { top: '#283e36', front: '#243b35', side: '#192f2c', line: '#426053' });
  const [a, b] = w.p(x, y, z + 5 * scale);
  line(c, [[a, b], [a, b - 17 * scale]], '#5c8e71', 1.4);
  for (let k = 0; k < 3; k++) {
    const yy = b - (5 + k * 4) * scale;
    polygon(c, [[a, yy], [a - (11 - k * 2) * scale, yy - 7 * scale], [a - 6 * scale, yy - 10 * scale]], '#527e62');
    polygon(c, [[a, yy - 1], [a + (10 - k * 2) * scale, yy - 9 * scale], [a + 5 * scale, yy - 11 * scale]], '#7b9a6f');
  }
}

function building(c, w, x, y, width, depth, height, seed, warmth = .35) {
  w.box(x, y, 0, width, depth, height, { top: '#355456', front: '#1d343d', side: '#142b33', line: '#567978' });
  const levels = Math.max(2, Math.floor(height / 35));
  for (let r = 0; r < levels; r++) {
    const z = 12 + r * (height - 18) / levels;
    w.stroke([[x, y + depth + .2, z - 5], [x + width, y + depth + .2, z - 5]], '#406169', 1);
    for (let col = 0; col < Math.floor(width / 23); col++) {
      const xx = x + 10 + col * 23;
      const lit = rand(seed + r * 17 + col * 5) < warmth;
      const pts = [[xx, y + depth + .5, z], [xx + 15, y + depth + .5, z], [xx + 15, y + depth + .5, z + 19], [xx, y + depth + .5, z + 19]].map(q => w.p(...q));
      polygon(c, pts, lit ? '#bc976b' : '#0b202b', lit ? '#d7b88c' : '#345966', .55);
      if (lit) {
        const [wx, wy] = w.p(xx + 7, y + depth, z + 10);
        glow(c, wx, wy, 23, P.amber, .10);
      }
      w.stroke([[xx + 8, y + depth + 1, z], [xx + 8, y + depth + 1, z + 19]], '#15313b', .8);
    }
    for (let col = 0; col < Math.floor(depth / 25); col++) {
      const yy = y + 10 + col * 25;
      const lit = rand(seed + r * 29 + col * 7 + 5) < warmth * .65;
      polygon(c, [[x + width + .5, yy, z], [x + width + .5, yy + 17, z], [x + width + .5, yy + 17, z + 19], [x + width + .5, yy, z + 19]].map(q => w.p(...q)), lit ? '#8d8265' : '#10232c', '#385662', .55);
    }
  }
  // Parapets, roof services, photovoltaic strips, and courtyard-facing planters.
  w.stroke([[x, y + depth, height + 5], [x + width, y + depth, height + 5], [x + width, y, height + 5]], '#73928a', 1.1);
  for (let n = 0; n < Math.floor(width / 30); n++) {
    w.quad(x + 9 + n * 27, y + 11, height + 3, 21, Math.min(depth * .35, 31), '#153139', '#628080', .7);
    w.stroke([[x + 11 + n * 27, y + 13, height + 4], [x + 27 + n * 27, y + 13, height + 4]], '#76a6a055', .8);
  }
  w.box(x + width - 43, y + depth - 34, height, 27, 20, 13, { top: '#536b65', front: '#38534f', side: '#283e3f' });
  for (let n = 0; n < 4; n++) w.stroke([[x + width - 39 + n * 5, y + depth - 32, height + 14], [x + width - 39 + n * 5, y + depth - 16, height + 14]], '#142b30', 1.7);
  plant(c, w, x + 23, y + depth - 15, height + 1, .8);
}

function district(c, t, chapter) {
  const w = world(c, 500, 363, .96, .44);
  // Low-rise waterfront urbanism: a real courtyard and connected service routes.
  w.box(-315, -250, -15, 630, 510, 15, { top: '#142c31', front: '#0c1f26', side: '#091920', line: '#2e5057' });
  for (let n = -300; n <= 300; n += 36) w.stroke([[n, -250, .2], [n, 260, .2]], '#41676726', .8);
  for (let n = -240; n <= 240; n += 36) w.stroke([[-315, n, .3], [315, n, .3]], '#41676726', .8);
  w.quad(-300, -10, .5, 580, 36, '#09282d', '#38676b');
  for (let i = 0; i < 12; i++) {
    const q = -285 + i * 47 + Math.sin(t * .25 + i) * 3;
    w.stroke([[q, 2, 1], [q + 22, 2, 1]], '#67a8a15c', .7);
  }
  w.quad(-290, 183, 1, 580, 42, '#1b3238', '#426767');
  w.stroke([[-270, 204, 2], [275, 204, 2]], '#82bfb9', 1.2);
  w.stroke([[-35, -235, 2], [-35, 193, 2]], '#71998a66', 2);

  building(c, w, -250, -205, 175, 95, 152, 13, .45);
  building(c, w, 65, -218, 163, 106, 128, 49, chapter > 3 ? .18 : .3);
  w.box(-75, -170, 76, 140, 24, 7, { top: '#537977', front: '#264c53', side: '#1c3b41' });
  for (let n = -72; n < 65; n += 17) w.stroke([[n, -147, 83], [n, -147, 100]], '#6b9390', .8);
  w.stroke([[-75, -147, 100], [65, -147, 100]], '#a8c3b4', 1);
  w.cylinder(-129, -140, 152, 14, 24, '#557674', '#a5bfaf');
  w.cylinder(190, -135, 128, 12, 20, '#3d6767', '#7ab0a3');

  w.box(-68, -68, 0, 144, 115, 8, { top: '#233e3b', front: '#162d30', side: '#12282d' });
  for (const [x, y] of [[-44, -43], [-13, -43], [18, -43], [49, -43], [-44, 23], [49, 23]]) plant(c, w, x, y, 8, 1.1);
  w.box(-16, -2, 8, 47, 20, 7, { top: '#736c51', front: '#414c42', side: '#263d38' });
  w.stroke([[-6, 0, 9], [-6, 0, 44], [17, 0, 44]], '#8bada2', 2);
  const lamp = w.p(17, 0, 44); glow(c, lamp[0], lamp[1], 60, P.amber, .17);
  ellipse(c, lamp[0], lamp[1], 4, 1.8, P.amber);

  building(c, w, -249, 52, 132, 119, 101, 91, .48);
  // A module has been removed from the foreground house: its rails remain.
  building(c, w, 104, 72, 133, 101, 83, 22, .26);
  w.box(100, 176, 0, 145, 6, 6, { top: '#496a6b', front: '#17353d', side: '#112932' });
  w.quad(111, 108, 84, 67, 36, '#173b40', '#6e9e95');
  for (let i = 0; i < 6; i++) w.stroke([[115 + i * 11, 110, 85], [115 + i * 11, 141, 85]], '#8bb4a2', .7);

  for (const [x, y] of [[-280, 167], [275, 164], [255, -85]]) {
    w.stroke([[x, y, 0], [x, y, 64], [x - 9, y, 67]], '#6d8a84', 1.6);
    const [a, b] = w.p(x - 9, y, 67); ellipse(c, a, b, 4, 1.3, '#cfbf90');
    glow(c, a, b, 37, '#d8ba89', .10);
  }
  const sledX = -255 + ((t * 8) % 485);
  w.box(sledX, 195, 3, 30, 15, 8, { top: '#adc2b3', front: '#4f7473', side: '#335152', line: '#a3c8bb' });
  w.box(sledX + 6, 199, 11, 18, 8, 10, { top: '#687e75', front: '#3b5655', side: '#294342' });
  const sled = w.p(sledX + 30, 202, 6); glow(c, sled[0], sled[1], 17, P.cyan, .20);
  for (const [x, y] of [[-79, 125], [61, 65], [-13, -94]]) person(c, w.p(x, y, 1), '#a9b8a8');
  // Indication of the wider city, kept deliberately faint behind this block.
  c.save(); c.globalAlpha = .16;
  line(c, [[125, 585], [294, 660], [500, 570], [704, 660], [888, 575]], '#84b8b3', .8);
  c.restore();
}

function person(c, p, color, scale = 1) {
  ellipse(c, p[0], p[1] + 2 * scale, 6 * scale, 2.2 * scale, '#020b0c90');
  line(c, [[p[0] - 2 * scale, p[1]], [p[0], p[1] - 12 * scale], [p[0] + 3 * scale, p[1]]], color, 2 * scale);
  ellipse(c, p[0], p[1] - 16 * scale, 3 * scale, 3.6 * scale, color);
}

function home(c, t) {
  const w = world(c, 504, 405, 1.08, .48);
  w.box(-235, -165, -13, 470, 355, 13, { top: '#29413f', front: '#142a2d', side: '#0b2027', line: '#587775' });
  // The open room has actual walls, rails and a view to the wet city outside.
  polygon(c, [w.p(-235, -165), w.p(235, -165), w.p(235, -165, 220), w.p(-235, -165, 220)], '#284047', '#627c7c');
  polygon(c, [w.p(-235, -165), w.p(-235, 190), w.p(-235, 190, 220), w.p(-235, -165, 220)], '#1b3038', '#3c5961');
  for (let y = -145; y < 190; y += 21) w.stroke([[-235, y, .3], [235, y, .3]], '#7b8e7440', .8);
  const window = [w.p(-20, -164, 72), w.p(200, -164, 72), w.p(200, -164, 200), w.p(-20, -164, 200)];
  c.save(); polygon(c, window); c.clip();
  const wg = c.createLinearGradient(380, 90, 750, 350); wg.addColorStop(0, '#173b46'); wg.addColorStop(1, '#081b25');
  c.fillStyle = wg; c.fillRect(0, 0, 1000, 760);
  for (let n = 0; n < 15; n++) {
    const x = 440 + n * 24; const yy = 226 + Math.sin(n) * 16;
    c.fillStyle = n % 3 === 0 ? '#213d43' : '#152d38'; c.fillRect(x, yy, 21, 105);
    for (let k = 0; k < 4; k++) if (rand(n * 11 + k) > .55) { c.fillStyle = '#bea077aa'; c.fillRect(x + 5, yy + k * 21 + 8, 5, 7); }
  }
  for (let i = 0; i < 22; i++) {
    const x = 405 + rand(i + 3) * 320; const y = (rand(i + 12) * 220 + t * 14) % 220 + 80;
    line(c, [[x, y], [x - 1.6, y + 11]], '#9dc3bb40', .8);
  }
  c.restore(); polygon(c, window, null, '#789995', 3);
  w.stroke([[75, -162, 72], [75, -162, 200]], '#81978e', 3);
  w.stroke([[-20, -162, 75], [200, -162, 75]], '#a3ac94', 3);
  // Warm light crosses the room from a small suspended luminaire.
  polygon(c, [w.p(-40, -20, 205), w.p(88, -20, 205), w.p(135, 80, 3), w.p(-95, 60, 3)], '#d5b47c0b');
  w.stroke([[-30, -19, 205], [85, -19, 205]], '#dac49d', 4);
  w.stroke([[0, -19, 205], [0, -19, 232]], '#73817a', .8);
  w.stroke([[60, -19, 205], [60, -19, 232]], '#73817a', .8);
  const lamp = w.p(28, -19, 200); glow(c, lamp[0], lamp[1] + 60, 150, P.amber, .12);

  // Kitchen alcove / modular fabrication seam.
  w.box(-216, -137, 0, 143, 48, 64, { top: '#819587', front: '#364e50', side: '#233b40', line: '#80988d' });
  for (let x = -210; x < -80; x += 32) w.stroke([[x, -88, 6], [x, -88, 59]], '#18353d', 1);
  w.quad(-160, -128, 65, 38, 25, '#142b31', '#96aaa0');
  w.cylinder(-183, -111, 65, 6, 13, '#b2b9a0', '#d9d1a7');
  plant(c, w, -89, -112, 65, 1.1);
  w.stroke([[-234, 14, 3], [-234, 14, 204], [-234, 123, 204]], '#7fa9a080', 1.1);
  w.box(-230, 40, 0, 26, 90, 78, { top: '#345557', front: '#29454a', side: '#1a323b' });
  for (let z = 18; z < 76; z += 18) w.stroke([[-203, 45, z], [-203, 125, z]], '#71908b', 1);

  // A table for a family whose fourth place has been prepared in advance.
  for (const [x, y] of [[-51, -7], [88, -7], [-51, 75], [88, 75]]) w.box(x, y, 0, 5, 5, 68, { top: '#344b45', front: '#4d5d4c', side: '#273f3d', line: '#667763' });
  w.box(-62, -14, 66, 163, 101, 6, { top: '#a19876', front: '#656d55', side: '#4a5e50', line: '#b4b69c' });
  const places = [[-28, 10], [61, 10], [-28, 66], [61, 66]];
  places.forEach(([x, y], i) => {
    const [a, b] = w.p(x, y, 73);
    ellipse(c, a, b, 16, 7.3, i === 3 ? '#b9c2a6' : '#d7cba8', '#e2dfbe', .7);
    ellipse(c, a, b, 11, 4.7, i === 3 ? '#aab69d' : '#8b744b', '#c6b88c', .5);
    if (i !== 3) { ellipse(c, a + 3, b, 4, 2, '#718467'); ellipse(c, a - 4, b - 1, 3, 1.6, '#bc9c63'); }
    w.stroke([[x + 18, y - 7, 74], [x + 18, y + 10, 74]], '#e7d8b3', 1.2);
    w.stroke([[x + 21, y - 7, 74], [x + 21, y + 10, 74]], '#e7d8b3', 1.2);
  });
  w.cylinder(15, 31, 73, 8, 14, '#8c9580', '#d7cbb0');
  for (const [x, y] of [[-32, -45], [60, -45], [-32, 105], [60, 105]]) {
    w.box(x - 17, y - 13, 0, 4, 4, 37, { front: '#35514a', side: '#29413f', top: '#6d8475' });
    w.box(x + 12, y + 9, 0, 4, 4, 37, { front: '#35514a', side: '#29413f', top: '#6d8475' });
    w.box(x - 19, y - 14, 36, 39, 28, 5, { top: '#7c8c75', front: '#546b5b', side: '#3b544f', line: '#93a289' });
    w.box(x - 19, y + (y > 0 ? 10 : -14), 41, 39, 4, 28, { top: '#738c7a', front: '#3c5a56', side: '#294344', line: '#8aa294' });
  }
  // Service chassis waits at the edge of the meal, outside the absent place.
  w.box(153, 105, 3, 23, 30, 12, { top: '#91a99e', front: '#35585b', side: '#1a3842' });
  w.box(159, 113, 15, 12, 15, 35, { top: '#9bad9f', front: '#516d68', side: '#2a4a4f' });
  const eye = w.p(166, 129, 44); ellipse(c, eye[0], eye[1], 5, 1.8, P.mint); glow(c, eye[0], eye[1], 25, P.mint, .10);
  w.box(174, -67, 0, 43, 80, 8, { top: '#536d66', front: '#27494a', side: '#16333d' });
  for (let j = 0; j < 4; j++) w.box(179, -59 + j * 16, 8 + j, 29, 11, 7, { top: '#6d8980', front: '#3a5a57', side: '#27484c' });
}

function factory(c, t) {
  const w = world(c, 500, 385, 1.05, .47);
  w.box(-285, -225, -16, 570, 445, 16, { top: '#1a3037', front: '#10222b', side: '#0b1b23' });
  for (let x = -260; x < 280; x += 45) w.stroke([[x, -225, 1], [x, 220, 1]], '#71918d20', .7);
  for (let y = -210; y < 220; y += 45) w.stroke([[-285, y, 1], [285, y, 1]], '#71918d20', .7);
  // Overhead handling gantry, with independent columns.
  for (const [x, y] of [[-250, -180], [245, -180], [-250, 162], [245, 162]])
    w.box(x, y, 0, 9, 9, 227, { top: '#577977', front: '#36535b', side: '#203c47', line: '#628482' });
  w.box(-250, -180, 222, 504, 13, 12, { top: '#5c7774', front: '#3e5e61', side: '#213d47' });
  w.box(-250, 162, 222, 504, 13, 12, { top: '#4a6a68', front: '#2c4d53', side: '#193540' });
  w.box(-110, -180, 221, 15, 355, 13, { top: '#587772', front: '#35575b', side: '#203f49' });
  w.box(-125, -22, 212, 43, 36, 15, { top: '#798f7d', front: '#405f60', side: '#23424c' });
  w.stroke([[-105, -5, 212], [-105, -5, 153]], '#91a393', 2);
  w.stroke([[-112, -5, 153], [-112, -5, 146], [-99, -5, 146], [-99, -5, 153]], '#c3b98d', 2);
  // Fixed production modules and conveyor rollers.
  w.box(-212, -145, 0, 108, 58, 79, { top: '#4b6967', front: '#27434a', side: '#1a333d' });
  polygon(c, [[-197, -86, 23], [-120, -86, 23], [-120, -86, 67], [-197, -86, 67]].map(q => w.p(...q)), '#10242c', '#6c9c93');
  for (let n = 0; n < 5; n++) w.stroke([[-190 + n * 14, -85, 30], [-190 + n * 14, -85, 57]], '#87bcb05a', 1);
  w.box(-249, 110, 0, 495, 45, 28, { top: '#304e53', front: '#1c363e', side: '#132c36' });
  for (let n = -240; n < 235; n += 13) w.stroke([[n, 114, 29], [n, 151, 29]], '#739391', 2.7);
  for (let k = 0; k < 4; k++) {
    const x = -220 + ((t * 6 + k * 128) % 440);
    w.box(x, 119, 31, 32, 28, 15, { top: '#8e9d88', front: '#556e63', side: '#344f4e' });
  }
  w.box(-63, -25, 0, 128, 94, 26, { top: '#546a63', front: '#2c484b', side: '#18343e' });
  w.box(-43, -6, 26, 88, 55, 9, { top: '#8e9d8f', front: '#617b6e', side: '#3b5f59' });
  w.quad(-30, 5, 36, 61, 32, '#223f45', '#b5c8ad');
  for (let n = 0; n < 4; n++) w.box(-23 + n * 13, 12, 36, 7, 18, 12, { top: '#8db2a3', front: '#547c73', side: '#2b5655' });

  function arm(x, y, mirror, moving) {
    w.cylinder(x, y, 0, 25, 17, '#4c6c67', '#7e9b89');
    const lift = moving ? Math.sin(t * .35) * 5 : 0;
    const joints = [[x, y, 17], [x, y, 72], [x + mirror * 53, y - 5, 139 + lift], [x + mirror * 98, y + 30, 91 + lift], [x + mirror * 108, y + 33, 72 + lift]].map(q => w.p(...q));
    line(c, joints, '#102b35', 18); line(c, joints, moving ? '#70968b' : '#b0956e', 10);
    joints.slice(0, -1).forEach(([a, b]) => { ellipse(c, a, b, 8, 8, '#264a50', '#94b8a6', 1.2); ellipse(c, a, b, 2.3, 2.3, '#bfceb5'); });
    const [a, b] = joints.at(-1); line(c, [[a - 8, b + 7], [a - 8, b], [a + 8, b], [a + 8, b + 7]], '#b7c7b0', 2.2);
  }
  arm(-131, 23, 1, false);
  arm(145, -32, -1, true);
  // Segmented amber perimeter represents separate work envelopes.
  c.save(); c.setLineDash([7, 7]);
  w.stroke([[-199, -59, 1], [215, -59, 1], [215, 89, 1], [-199, 89, 1], [-199, -59, 1]], '#c3a575', 1.4);
  c.restore();
  w.box(188, -145, 0, 42, 35, 66, { top: '#627c6c', front: '#314d4d', side: '#1d3b44' });
  polygon(c, [[192, -109, 39], [225, -109, 39], [225, -109, 60], [192, -109, 60]].map(q => w.p(...q)), '#122c31', '#7ead9b');
  const light = w.p(209, -108, 50); glow(c, light[0], light[1], 36, P.amber, .15);
  line(c, [[light[0] - 7, light[1]], [light[0] + 7, light[1]]], P.amber, 2);
  person(c, w.p(8, 189), '#a5c2b1', 1.2);
}

function garden(c, t) {
  const w = world(c, 500, 386, 1.04, .47);
  w.box(-268, -210, -18, 536, 420, 18, { top: '#193b36', front: '#0f2d2d', side: '#0b232b', line: '#497973' });
  // Transparent roof is a frame, not an unexplained glowing dome.
  for (const x of [-250, -83, 83, 250]) {
    w.stroke([[x, -185, 0], [x, -185, 167], [x, -25, 232], [x, 185, 167], [x, 185, 0]], '#608d8077', 1.5);
  }
  for (const [y, z] of [[-185, 167], [-25, 232], [185, 167]]) w.stroke([[-250, y, z], [250, y, z]], '#83ad8f66', 1);
  polygon(c, [w.p(-250, -185, 168), w.p(250, -185, 168), w.p(250, -25, 232), w.p(-250, -25, 232)], '#78bca30b', '#82a79433');
  w.quad(-241, -142, 1, 476, 31, '#0b292d', '#4a8376');
  for (let n = -225; n < 240; n += 40) w.stroke([[n, -131, 1.5], [n + 23, -131, 1.5]], '#82c2ab70', .9);
  const tankPositions = [[-180, -89], [-45, -89], [90, -89]];
  for (let k = 0; k < tankPositions.length; k++) {
    const [x, y] = tankPositions[k];
    w.box(x - 38, y - 33, 0, 76, 66, 11, { top: '#3b6156', front: '#254940', side: '#143731' });
    const [a, b] = w.p(x, y, 11); const radius = 34;
    c.save();
    const g = c.createLinearGradient(a - radius, b, a + radius, b);
    g.addColorStop(0, '#335b5150'); g.addColorStop(.3, '#79ad7650'); g.addColorStop(.65, '#426e4440'); g.addColorStop(1, '#213f3f90');
    c.fillStyle = g; c.fillRect(a - radius, b - 121, radius * 2, 121);
    ellipse(c, a, b, radius, 15, '#39715580', '#99b99d');
    ellipse(c, a, b - 121, radius, 15, '#43765c77', '#b6d0ad');
    ellipse(c, a, b - 87, radius - 3, 13, '#7eb77945', '#94c8a566', .7);
    for (const dx of [-radius, radius]) line(c, [[a + dx, b], [a + dx, b - 121]], '#87b9a4', 1);
    line(c, [[a - radius + 10, b - 9], [a - radius + 10, b - 111]], '#d2e2c244', 3);
    for (let j = 0; j < 10; j++) {
      const yy = b - ((rand(j + k * 20) * 108 + t * (2 + rand(j) * 2)) % 108) - 7;
      ellipse(c, a - 24 + rand(j * 9 + k) * 48, yy, 1.3, 2.2, '#c5e3b77a');
    }
    c.restore();
    w.stroke([[x, y - 24, 135], [x, y - 63, 135]], '#9ab6a2', 3.5);
    const [gx, gy] = w.p(x, y, 63); glow(c, gx, gy, 70, '#a8c78b', .10);
  }
  w.stroke([[-210, -151, 146], [177, -151, 146], [177, 80, 146], [177, 80, 10]], '#6f9a8c', 4.5);
  w.stroke([[-210, -151, 146], [177, -151, 146], [177, 80, 146]], '#c0d3ad55', 1);
  // Repeated shallow planting beds create a coherent food-production scale.
  for (let row = 0; row < 3; row++) {
    const y = 31 + row * 47;
    w.box(-221, y, 0, 323, 29, 26, { top: '#4c6650', front: '#284b3f', side: '#193a35', line: '#739478' });
    for (let col = 0; col < 10; col++) plant(c, w, -204 + col * 31, y + 14, 26, .65);
    w.stroke([[-218, y + 30, 20], [100, y + 30, 20]], '#8bb994', .8);
  }
  w.box(139, 111, 0, 82, 51, 45, { top: '#657b60', front: '#36584e', side: '#244b45' });
  w.quad(145, 117, 46, 70, 39, '#143d3c', '#97bc95');
  for (let y = 124; y < 148; y += 6) w.stroke([[152, y, 47], [209, y, 47]], '#78aea070', 1);
  person(c, w.p(141, 47), '#bec7a4', 1.1);
}

function orbit(c, t) {
  c.fillStyle = '#07121b'; c.fillRect(-600, -600, 2200, 1960);
  for (let i = 0; i < 130; i++) {
    const x = rand(i + 300) * 1200 - 100, y = rand(i + 540) * 650 - 30;
    const r = rand(i + 777) > .95 ? 1.25 : .6;
    ellipse(c, x, y, r, r, `rgba(177,204,199,${.15 + rand(i) * .35})`);
  }
  const earth = c.createRadialGradient(370, 670, 40, 590, 880, 650);
  earth.addColorStop(0, '#214e5b'); earth.addColorStop(.5, '#153b4a'); earth.addColorStop(.84, '#0e293a'); earth.addColorStop(1, '#081925');
  ellipse(c, 590, 1020, 650, 650, earth, '#81b6bf55', 3);
  c.save(); c.beginPath(); c.arc(590, 1020, 653, 0, Math.PI * 2); c.clip();
  for (let i = 0; i < 28; i++) {
    const x = 55 + rand(i + 220) * 950, y = 425 + rand(i + 111) * 320;
    c.save(); c.globalAlpha = .04 + rand(i + 90) * .04;
    ellipse(c, x, y, 80 + rand(i + 15) * 110, 8 + rand(i + 33) * 14, '#c4d9d2'); c.restore();
  }
  for (let i = 0; i < 100; i++) {
    const x = 90 + rand(i + 147) * 850, y = 450 + rand(i + 4) * 180;
    if (rand(i + 8) > .62) ellipse(c, x, y, .8, .6, '#dcba86bb');
  }
  c.restore();
  c.save(); c.globalAlpha = .25; c.shadowColor = '#80bfd3'; c.shadowBlur = 18;
  c.beginPath(); c.arc(590, 1020, 655, Math.PI * 1.14, Math.PI * 1.78); c.strokeStyle = '#95cee3'; c.lineWidth = 2; c.stroke(); c.restore();

  const w = world(c, 500, 315 + Math.sin(t * .15) * 1.5, .94, .36);
  // Photovoltaic wings and thermal-radiator wings have distinct surfaces.
  function panel(x, y, width, depth, thermal = false) {
    w.box(x, y, 15, width, depth, 2.5, { top: thermal ? '#9caaa3' : '#173a4c', front: '#3d676b', side: '#22474d', line: thermal ? '#cfdbce' : '#70a7aa' });
    for (let a = x + 8; a < x + width; a += thermal ? 9 : 17) w.stroke([[a, y + 2, 18], [a, y + depth - 2, 18]], thermal ? '#547878' : '#578592', thermal ? 1.1 : .7);
    if (!thermal) for (let a = y + 13; a < y + depth; a += 13) w.stroke([[x + 2, a, 18], [x + width - 2, a, 18]], '#6c9fa066', .65);
  }
  w.stroke([[-310, -25, 16], [310, -25, 16]], '#b2c1b4', 5);
  panel(-315, -140, 225, 101); panel(-315, -14, 225, 101);
  panel(90, -140, 225, 101); panel(90, -14, 225, 101);
  w.stroke([[0, -170, 17], [0, 175, 17]], '#a8bdb4', 4);
  panel(-57, -205, 44, 81, true); panel(13, -205, 44, 81, true);
  panel(-57, 100, 44, 90, true); panel(13, 100, 44, 90, true);
  w.box(-66, -88, 7, 132, 163, 43, { top: '#7b908b', front: '#526e72', side: '#294a58', line: '#b5cbc1' });
  w.box(-44, -61, 50, 88, 108, 19, { top: '#bdc9b4', front: '#71928b', side: '#466d71', line: '#d0dac7' });
  for (let n = -31; n < 44; n += 17) w.quad(n, -49, 70, 9, 73, '#547777', '#8ba7a0', .6);
  w.cylinder(0, -25, 69, 15, 12, '#9cae9c', '#d6ddc8');
  w.stroke([[0, -25, 81], [0, -25, 134], [24, -25, 145]], '#afc2b8', 1.5);
  const satellite = w.p(24, -25, 145); ellipse(c, satellite[0], satellite[1], 6, 2.8, '#9fb8b0', '#d1e4d2');
  // A maintenance unit is tiny beside the station; no human-scale magic.
  w.box(65, 80, 4, 23, 28, 19, { top: '#c7bfa6', front: '#7d8b7f', side: '#3f5a5d' });
  const sig = w.p(84, 109, 14); glow(c, sig[0], sig[1], 34, P.amber, .20);
  ellipse(c, sig[0], sig[1], 2.6, 1.6, P.amber);
}

function archive(c, t) {
  const w = world(c, 500, 403, 1.05, .47);
  w.box(-270, -205, -17, 540, 410, 17, { top: '#152d35', front: '#0d202a', side: '#0a1924', line: '#3e6470' });
  for (let x = -250; x < 270; x += 45) w.stroke([[x, -205, 1], [x, 205, 1]], '#537c8430', .7);
  for (let y = -190; y < 205; y += 45) w.stroke([[-270, y, 1], [270, y, 1]], '#537c8430', .7);
  // A quiet hall of memory drawers, each with an individual provenance seam.
  for (let n = 0; n < 7; n++) {
    const x = -235 + n * 67;
    w.box(x, -184, 0, 49, 32, 143, { top: '#3e6267', front: '#1b3946', side: '#122c39', line: '#5b8b8b' });
    for (let k = 0; k < 7; k++) {
      polygon(c, [[x + 5, -151, 8 + k * 19], [x + 44, -151, 8 + k * 19], [x + 44, -151, 20 + k * 19], [x + 5, -151, 20 + k * 19]].map(q => w.p(...q)), '#1f4750', '#71a3a066', .7);
      const [a, b] = w.p(x + 10, -150, 14 + k * 19);
      line(c, [[a, b], [a + 5, b + 2]], (n + k) % 5 === 0 ? P.amber : '#94c8b7', 1.1);
    }
  }
  const frames = [[-137, -54, 0], [-26, 2, 1], [93, 58, 2]];
  for (const [x, y, n] of frames) {
    w.box(x - 25, y - 25, 0, 96, 75, 9, { top: '#2b5157', front: '#17343f', side: '#0f2937' });
    w.stroke([[x + 22, y + 15, 9], [x + 22, y + 15, 55]], '#608f91', 1.6);
    const bob = Math.sin(t * .2 + n) * 1.7;
    const pts = [[x - 34, y + 15, 62 + bob], [x + 94, y + 15, 62 + bob], [x + 94, y + 15, 176 + bob], [x - 34, y + 15, 176 + bob]].map(q => w.p(...q));
    polygon(c, pts, '#376e7130', n === 2 ? '#d1b68a' : '#85bcb1', 1.2);
    const inset = [[x - 23, y + 15, 87 + bob], [x + 83, y + 15, 87 + bob], [x + 83, y + 15, 163 + bob], [x - 23, y + 15, 163 + bob]].map(q => w.p(...q));
    polygon(c, inset, '#0a232d8a', '#5a93966b', .65);
    // Tiny diagrams allude to a home, transport, and a witness without text.
    if (n === 0) {
      w.stroke([[x - 9, y + 14, 108 + bob], [x - 9, y + 14, 140 + bob], [x + 28, y + 14, 156 + bob], [x + 65, y + 14, 140 + bob], [x + 65, y + 14, 108 + bob], [x - 9, y + 14, 108 + bob]], '#9dc4b3', 1.2);
      w.stroke([[x + 19, y + 14, 108 + bob], [x + 19, y + 14, 132 + bob], [x + 35, y + 14, 132 + bob], [x + 35, y + 14, 108 + bob]], '#e0bd8c', 1.3);
    } else if (n === 1) {
      w.stroke([[x - 9, y + 14, 125 + bob], [x + 15, y + 14, 125 + bob], [x + 15, y + 14, 144 + bob], [x + 52, y + 14, 144 + bob], [x + 52, y + 14, 115 + bob], [x + 70, y + 14, 115 + bob]], '#98c1b9', 1.4);
      for (const xx of [-9, 15, 52, 70]) {
        const [a, b] = w.p(x + xx, y + 14, 125 + bob); ellipse(c, a, b, 2.5, 2.5, '#b1c8ba');
      }
    } else {
      const p = w.p(x + 28, y + 14, 121 + bob); person(c, [p[0], p[1] + 17], '#d6bf9a', 2.3);
    }
    for (let k = 0; k < 3; k++) w.stroke([[x - 23, y + 15, 68 + k * 4 + bob], [x + 24 + k * 12, y + 15, 68 + k * 4 + bob]], '#7ba69a', .65);
    const [a, b] = w.p(x + 26, y + 15, 120); glow(c, a, b, 78, n === 2 ? '#c7ab7d' : '#68c4ba', .08);
  }
  w.box(-194, 119, 0, 84, 44, 48, { top: '#6c7e6c', front: '#3b5b54', side: '#25464b', line: '#9baa8f' });
  w.quad(-184, 126, 49, 63, 29, '#aa9772', '#d6c59d');
  for (let j = 0; j < 6; j++) w.stroke([[-178, 131 + j * 3, 50], [-136, 131 + j * 3, 50]], '#5a6355', .8);
  person(c, w.p(22, 174), '#a8c5b6', 1.15);
}

const SCENES = { district, home, factory, garden, orbit, archive };

/** Mount decorative, responsive 2.5D scenery behind the game's HTML hotspots. */
export function mountScene(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('mountScene needs a container element');
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-artwork';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
  container.appendChild(canvas);
  const c = canvas.getContext('2d', { alpha: false });
  let opts = { scene: 'district', chapter: 1, ...options };
  let dead = false, frame = 0, lastTime = 0, phase = 0, width = 1, height = 1;
  let px = 0, py = 0, tx = 0, ty = 0;
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => !!opts.reducedMotion || !!media?.matches;

  function draw() {
    if (!c || dead) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = P.background; c.fillRect(0, 0, width, height);
    const scale = Math.min(width / 1000, height / 760);
    c.save();
    c.translate(width / 2 + px, height / 2 + py);
    c.scale(scale, scale); c.translate(-500, -380);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const scene = SCENES[opts.scene] ? opts.scene : 'district';
    base(c, phase, scene); SCENES[scene](c, phase, Number(opts.chapter) || 1);
    // A restrained edge vignette prevents the illustration competing with text.
    const edge = c.createRadialGradient(500, 360, 235, 500, 360, 650);
    edge.addColorStop(0, 'transparent'); edge.addColorStop(1, '#071317bb');
    c.fillStyle = edge; c.fillRect(-600, -600, 2200, 1960);
    c.restore();
  }

  function tick(now) {
    frame = 0;
    if (dead) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .08) : 0;
    lastTime = now;
    if (!reduced()) {
      phase += delta;
      px += (tx - px) * .055; py += (ty - py) * .055;
    } else { px = 0; py = 0; }
    draw();
    if (!reduced() && !document.hidden && !dead) frame = requestAnimationFrame(tick);
  }
  function start() {
    if (frame) cancelAnimationFrame(frame);
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (dead) return;
    const bounds = container.getBoundingClientRect();
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    draw(); start();
  }
  function move(event) {
    if (reduced() || event.pointerType === 'touch') return;
    const r = container.getBoundingClientRect();
    tx = ((event.clientX - r.left) / Math.max(r.width, 1) - .5) * 7;
    ty = ((event.clientY - r.top) / Math.max(r.height, 1) - .5) * 5;
  }
  function leave() { tx = 0; ty = 0; }
  function visibility() {
    if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else start();
  }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  if (!observer) window.addEventListener('resize', resize, { passive: true });
  container.addEventListener('pointermove', move, { passive: true });
  container.addEventListener('pointerleave', leave, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  media?.addEventListener?.('change', start);
  resize();
  return {
    update(next = {}) { if (dead) return; opts = { ...opts, ...next }; draw(); start(); },
    destroy() {
      if (dead) return; dead = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      media?.removeEventListener?.('change', start);
      canvas.remove();
    },
  };
}
