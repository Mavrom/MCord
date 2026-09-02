/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin, StartAt } from "../../utils/types";

/**
 * İmleci takip eden küçük bir kedi. Tamamen DOM tabanlı — Discord'un iç
 * yapılarına dokunmaz. Klasik "oneko" davranışının sadeleştirilmiş hâli.
 */
let el: HTMLDivElement | null = null;
let raf = 0;
let onMove: ((e: MouseEvent) => void) | null = null;

export default definePlugin({
    name: "Oneko",
    description: "İmleci kovalayan küçük bir kedi ekler",
    authors: [Devs.Berk],
    tags: ["eglence"],
    startAt: StartAt.DOMContentLoaded,
    requiresRestart: false,

    start() {
        el = document.createElement("div");
        Object.assign(el.style, {
            position: "fixed", width: "32px", height: "32px", zIndex: "999999",
            pointerEvents: "none", left: "0", top: "0", fontSize: "26px",
            transition: "transform .08s linear", willChange: "transform"
        });
        el.textContent = "🐈";
        document.body.appendChild(el);

        let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my;
        onMove = e => { mx = e.clientX; my = e.clientY; };
        window.addEventListener("mousemove", onMove);

        const tick = () => {
            const dx = mx - x, dy = my - y;
            const dist = Math.hypot(dx, dy);
            if (dist > 24) { x += (dx / dist) * Math.min(8, dist * 0.1); y += (dy / dist) * Math.min(8, dist * 0.1); }
            if (el) el.style.transform = `translate(${x - 16}px, ${y - 16}px) scaleX(${dx < 0 ? -1 : 1})`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
    },

    stop() {
        cancelAnimationFrame(raf);
        if (onMove) window.removeEventListener("mousemove", onMove);
        el?.remove();
        el = null;
        onMove = null;
    }
});
