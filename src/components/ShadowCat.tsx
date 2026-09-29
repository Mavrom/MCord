/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * MCord'un maskotu: karanlığın içinden çıkan bulanık siyah kedi.
 *
 * Sunucu şeridinde (Discord logosunun altı) ve ayar penceresinin sol üstünde
 * kullanılıyor. Nefes alır,
 * göz kırpar, gözleriyle imleci izler, kulakları seğirir, sağ alt kenarındaki
 * yanardöner parıltı ışığa göre döner. Üstüne gelince gözlerini kısar,
 * tıklanınca zıplar. Uyku hali bilerek yok — logo hep uyanık.
 *
 * Silüet "Zarif" ayarlarıyla (süperelips kafa, kavisli kulaklar) bir kez
 * üretilip sabit path olarak gömüldü; her karede yalnızca transform değişir.
 */

import { React } from "../webpack/react";

// Kafa merkezi (0,0) olan koordinatlar.
const HEAD = "M0 -106C11.4 -106 24.3 -105.5 34.1 -104.4C43.8 -103.3 51 -101.6 58.4 -99.5C65.9 -97.3 72.6 -94.6 78.7 -91.4C84.9 -88.3 90.5 -84.5 95.5 -80.3C100.5 -76.1 104.9 -71.4 108.7 -66.2C112.5 -61 115.7 -55.4 118.3 -49.2C120.8 -42.9 122.8 -36.9 124.1 -28.7C125.3 -20.5 125.3 -8.8 126 0C126.7 8.8 128.6 16.8 128.4 24.4C128.2 32 127.4 39 124.7 45.7C122 52.4 117.8 59 112.3 64.6C106.8 70.2 98.9 75.2 91.6 79.5C84.3 83.9 76.1 87.5 68.5 90.8C61 94.1 53.8 97 46.5 99.4C39.2 101.9 32.3 104.1 24.6 105.6C16.8 107 8.2 107.9 0 107.9C-8.2 107.9 -16.8 107 -24.6 105.6C-32.3 104.1 -39.2 101.9 -46.5 99.4C-53.8 97 -61 94.1 -68.5 90.8C-76.1 87.5 -84.3 83.9 -91.6 79.5C-98.9 75.2 -106.8 70.2 -112.3 64.6C-117.8 59 -122 52.4 -124.7 45.7C-127.4 39 -127.9 32 -128.4 24.4C-128.9 16.8 -128.3 8.8 -127.6 0C-126.9 -8.8 -125.6 -20.5 -124.1 -28.7C-122.5 -36.9 -120.8 -42.9 -118.3 -49.2C-115.7 -55.4 -112.5 -61 -108.7 -66.2C-104.9 -71.4 -100.5 -76.1 -95.5 -80.3C-90.5 -84.5 -84.9 -88.3 -78.7 -91.4C-72.6 -94.6 -65.9 -97.3 -58.4 -99.5C-51 -101.6 -43.8 -103.3 -34.1 -104.4C-24.3 -105.5 -11.4 -106 0 -106Z";
const EAR_L = "M-38.5 -92.8Q-80 -109.7 -122.9 -122.7Q-134 -126.6 -129.9 -115.6Q-120.9 -80.4 -104.8 -47.9Z";
const EAR_R = "M38.5 -92.8Q80 -109.7 122.9 -122.7Q134 -126.6 129.9 -115.6Q120.9 -80.4 104.8 -47.9Z";
const EAR_PIVOTS = [[-71.6, -70.3], [71.6, -70.3]] as const;
const EYES = [[-45.4, 21.2], [45.4, 21.2]] as const;
const BOTTOM = 107.9;
const TILT = -14;

let seq = 0;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const approach = (v: number, to: number, rate: number, dt: number) => v + (to - v) * (1 - Math.exp(-rate * dt));

function animate(svg: SVGSVGElement, compact: boolean): () => void {
    const part = (name: string) => svg.querySelector<SVGElement>(`[data-part="${name}"]`)!;
    const body = part("body"), rim = part("rim"), grad = part("grad");
    const ears = [part("earL"), part("earR")];
    const eyes = [part("eyeL"), part("eyeR")];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // Küçük boyutta parıltı daha geniş açılsın ki koyu toolbar'da da seçilsin.
    const rimMag = compact ? 20 : 11;
    const hopPower = compact ? 380 : 480;
    const eyeScale = compact ? 1.35 : 1;

    let now = performance.now();
    const look = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    let lastPointer = -1e9, nextWander = 0;
    let blinkT = -1, nextBlink = now + rand(1200, 3500);
    let sq = 0, sqv = 0, hop = 0, hopv = 0, air = false;
    let happyUntil = 0, happy = 0, hovering = false;
    let breath = 0, gAng = 0, t = 0;
    const earState = ears.map(() => ({ a: 0, v: 0, next: now + rand(2500, 6500) }));
    let raf = 0;

    const flick = (e: { v: number; }, k = 1) => { e.v += (Math.random() < .5 ? -1 : 1) * rand(200, 300) * k; };

    const onMove = (ev: PointerEvent) => {
        const r = svg.getBoundingClientRect();
        // İkon küçük; bakış menzilini ikonun boyutuna değil ekrandaki mesafeye göre ölç.
        const reach = Math.max(220, r.width * 4);
        let dx = (ev.clientX - (r.left + r.width / 2)) / reach;
        let dy = (ev.clientY - (r.top + r.height / 2)) / reach;
        const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
        target.x = dx; target.y = dy;
        lastPointer = performance.now();
    };
    const onEnter = () => {
        hovering = true;
        earState.forEach(e => flick(e, .8));
    };
    const onLeave = () => { hovering = false; };
    const onDown = () => {
        happyUntil = performance.now() + 900;
        earState.forEach(e => flick(e, .8));
        if (air) return;
        if (reduce) { sqv += 2; return; }
        air = true;
        hopv = -hopPower;
        sqv -= 3.5;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    svg.addEventListener("pointerenter", onEnter);
    svg.addEventListener("pointerleave", onLeave);
    svg.addEventListener("pointerdown", onDown);

    const frame = (ts: number) => {
        const dt = Math.min(.05, Math.max(0, (ts - now) / 1000));
        now = ts; t += dt;

        // imleç bir süredir oynamıyorsa etrafı süzer
        if (now - lastPointer > 2500 && now > nextWander) {
            const a = rand(0, Math.PI * 2), r = rand(0, .7);
            target.x = Math.cos(a) * r; target.y = Math.sin(a) * r * .8;
            nextWander = now + rand(1200, 3400);
        }
        look.x = approach(look.x, target.x, 9, dt);
        look.y = approach(look.y, target.y, 9, dt);

        let blink = 0;
        if (blinkT < 0 && now > nextBlink) blinkT = 0;
        if (blinkT >= 0) {
            blinkT += dt;
            blink = Math.sin(Math.PI * Math.min(1, blinkT / .17));
            if (blinkT >= .17) {
                blinkT = -1; blink = 0;
                nextBlink = now + (Math.random() < .2 ? 140 : rand(2200, 5600));
            }
        }
        happy = approach(happy, hovering || now < happyUntil ? 1 : 0, 10, dt);
        const open = Math.max(.07, 1 - Math.max(blink, happy * .62));

        earState.forEach((e, i) => {
            if (now > e.next) { flick(e); e.next = now + rand(2500, 7500); }
            e.v += (-520 * e.a - 15 * e.v) * dt;
            e.a += e.v * dt;
            const [px, py] = EAR_PIVOTS[i];
            ears[i].setAttribute("transform", `rotate(${e.a.toFixed(2)} ${px} ${py})`);
        });

        sqv += (-230 * sq - 11 * sqv) * dt;
        sq += sqv * dt;
        if (air) {
            hopv += 1800 * dt;
            hop += hopv * dt;
            if (hop >= 0) { hop = 0; hopv = 0; air = false; sqv += 3.4; }
        }

        breath += dt * 1.8 * (reduce ? .6 : 1);
        const b = Math.sin(breath), amp = .014;
        const floatY = reduce ? 0 : Math.sin(t * 1.1) * 4;
        const rot = TILT + (reduce ? 0 : Math.sin(t * .6) * 2.5) + look.x * 6;
        const sx = 1 + b * amp + sq * .14;
        const sy = 1 - b * amp * .9 - sq * .14;
        body.setAttribute("transform",
            `translate(0 ${(floatY + hop + look.y * 5).toFixed(2)}) rotate(${rot.toFixed(2)}) ` +
            `translate(0 ${BOTTOM}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 ${-BOTTOM})`);

        // ekran yönünü kafanın yerel eksenine çevir
        const th = rot * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
        const lx = look.x * c + look.y * s, ly = -look.x * s + look.y * c;
        const ex = lx * 14, ey = ly * 11 - happy * 3;
        eyes.forEach((el, i) => {
            const [cx, cy] = EYES[i];
            el.setAttribute("transform",
                `translate(${(cx + ex).toFixed(2)} ${(cy + ey).toFixed(2)}) ` +
                `scale(${(eyeScale * (1 + happy * .08)).toFixed(3)} ${(eyeScale * open).toFixed(3)}) translate(${-cx} ${-cy})`);
        });

        // parıltı: ışık bakılan taraftan gelir, parıltı karşı kenarda kalır
        const rx0 = .62 - look.x * .75, ry0 = .78 - look.y * .75;
        const rm = Math.hypot(rx0, ry0) || 1;
        const mag = rimMag + Math.sin(t * 1.3) * 1.5;
        const ox = rx0 / rm * mag, oy = ry0 / rm * mag;
        rim.setAttribute("transform", `translate(${(ox * c + oy * s).toFixed(2)} ${(-ox * s + oy * c).toFixed(2)})`);
        gAng += dt * (reduce ? 6 : 28);
        grad.setAttribute("gradientTransform", `rotate(${gAng.toFixed(1)} .5 .5)`);

        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        svg.removeEventListener("pointerenter", onEnter);
        svg.removeEventListener("pointerleave", onLeave);
        svg.removeEventListener("pointerdown", onDown);
    };
}

export function ShadowCat({ size = 24 }: { size?: number; }) {
    const [id] = React.useState(() => `mcord-cat-${++seq}`);
    const ref = React.useRef<SVGSVGElement>(null);
    // 48 px ve altı (toolbar, sunucu şeridi, ayar başlığı): koyu zeminde seçilsin diye canlı mod.
    const compact = size <= 48;

    React.useEffect(() => {
        if (!ref.current) return;
        return animate(ref.current, compact);
    }, [compact]);

    const u = (name: string) => `url(#${id}-${name})`;

    return (
        <svg
            ref={ref}
            width={size}
            height={size}
            viewBox={compact ? "-150 -158 300 300" : "-170 -180 340 340"}
            aria-hidden="true"
            focusable="false"
            style={{ flex: "0 0 auto", display: "block", overflow: "visible" }}
        >
            <defs>
                <filter id={`${id}-crisp`} x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation={compact ? 2 : 1.3} />
                </filter>
                <filter id={`${id}-soft`} x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation={compact ? 5 : 6.5} />
                </filter>
                <filter id={`${id}-halo`} x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="18" />
                </filter>
                <filter id={`${id}-rimf`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation={compact ? 6 : 4.5} />
                </filter>
                <filter id={`${id}-eye`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation=".5" />
                </filter>

                <linearGradient data-part="grad" id={`${id}-grad`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ff86d6" />
                    <stop offset=".3" stopColor="#b48cff" />
                    <stop offset=".55" stopColor="#3c9bff" />
                    <stop offset=".8" stopColor="#7ee8ff" />
                    <stop offset="1" stopColor="#ff86d6" />
                </linearGradient>

                {/* Sol üst kenar dumana karışır, sağ alt kenar keskin kalır; maskeler üst üste biner. */}
                <linearGradient id={`${id}-gc`} gradientUnits="userSpaceOnUse" x1="-95" y1="-146" x2="120" y2="128">
                    <stop offset=".22" stopColor="#fff" stopOpacity="0" />
                    <stop offset=".5" stopColor="#fff" stopOpacity="1" />
                </linearGradient>
                <linearGradient id={`${id}-gs`} gradientUnits="userSpaceOnUse" x1="-95" y1="-146" x2="120" y2="128">
                    <stop offset=".55" stopColor="#fff" stopOpacity="1" />
                    <stop offset=".82" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id={`${id}-mc`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">
                    <rect x="-400" y="-400" width="800" height="800" fill={u("gc")} />
                </mask>
                <mask id={`${id}-ms`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">
                    <rect x="-400" y="-400" width="800" height="800" fill={u("gs")} />
                </mask>

                <g id={`${id}-shape`}>
                    <path d={HEAD} />
                    <path data-part="earL" d={EAR_L} />
                    <path data-part="earR" d={EAR_R} />
                </g>
            </defs>

            <g data-part="body">
                {/* Koyu temada silüet kaybolmasın diye kafanın çevresinde hafif yanardöner ışıltı. */}
                <use href={`#${id}-shape`} fill={u("grad")} opacity={compact ? .5 : .22} filter={u("halo")}
                    transform="scale(1.1)" />
                <use href={`#${id}-shape`} fill="#050407" opacity=".55" filter={u("halo")}
                    transform="translate(-12 -12) scale(1.08)" />
                <g data-part="rim">
                    <use href={`#${id}-shape`} fill={u("grad")} filter={u("rimf")} />
                </g>
                <use href={`#${id}-shape`} fill="#050407" filter={u("soft")} mask={u("ms")} />
                <use href={`#${id}-shape`} fill="#050407" filter={u("crisp")} mask={u("mc")} />
                <g filter={u("eye")}>
                    <g data-part="eyeL"><circle cx={EYES[0][0]} cy={EYES[0][1]} r="17" fill="#fff" /></g>
                    <g data-part="eyeR"><circle cx={EYES[1][0]} cy={EYES[1][1]} r="17" fill="#fff" /></g>
                </g>
            </g>
        </svg>
    );
}
