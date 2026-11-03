gsap.registerPlugin(ScrollTrigger);

const FRAME_ASPECT = 1185 / 913;
const HOLE = {
    left: 0.0489451476793249,
    top: 0.060240963855421686,
    width: 0.9037974683544304,
    height: 0.6374589266155531,
};
const BLEED = 0.004;

const INTRO_SCREENS = 2.4;

const screen = document.querySelector("#screen");
const screenTrack = document.querySelector("#screenTrack");
const screenVideo = document.querySelector("#screenVideo");
const frame = document.querySelector("#frame");
const story = document.querySelector("#story");
const storyMedia = document.querySelector(".story__media");
const copySpacer = document.querySelector("#copySpacer");
const copyNext = document.querySelector("#copyNext");
const hint = document.querySelector("#hint");
let videoOn = false;

let introPx = 1;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(from, to, t) {
    return from + (to - from) * t;
}

function lerpRect(from, to, t) {
    return {
        left: lerp(from.left, to.left, t),
        top: lerp(from.top, to.top, t),
        width: lerp(from.width, to.width, t),
        height: lerp(from.height, to.height, t),
    };
}

function fitFrame(maxWidth, maxHeight) {
    let width = maxWidth;
    let height = width / FRAME_ASPECT;
    if (height > maxHeight) {
        height = maxHeight;
        width = height * FRAME_ASPECT;
    }
    return { width, height };
}

function holeRect(frameRect) {
    return {
        left: frameRect.left + frameRect.width * (HOLE.left - BLEED),
        top: frameRect.top + frameRect.height * (HOLE.top - BLEED),
        width: frameRect.width * (HOLE.width + BLEED * 2),
        height: frameRect.height * (HOLE.height + BLEED * 2),
    };
}

function metrics() {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const narrow = vw < 800;
    const contentWidth = story.clientWidth || vw;
    const column = narrow ? contentWidth : (storyMedia.clientWidth || contentWidth * 0.55);

    const landSize = fitFrame(Math.min(contentWidth * 0.9, 1560), vh * 0.92);
    const land = {
        left: (contentWidth - landSize.width) / 2,
        top: (vh - landSize.height) / 2,
        width: landSize.width,
        height: landSize.height,
    };

    const endSize = fitFrame(Math.min(column * 0.96, 1280), vh * 0.9);
    const end = {
        left: (column - endSize.width) / 2,
        top: (vh - endSize.height) / 2,
        width: endSize.width,
        height: endSize.height,
    };

    return {
        vw,
        vh,
        narrow,
        column,
        land,
        end,
        heroStart: { left: -story.getBoundingClientRect().left, top: 0, width: vw, height: vh },
        heroLand: holeRect(land),
        heroEnd: holeRect(end),
    };
}

function measure() {
    const narrow = document.documentElement.clientWidth < 800;
    introPx = window.innerHeight * (narrow ? 1.2 : INTRO_SCREENS);
    copySpacer.style.height = narrow ? "0px" : `${introPx}px`;
}

function syncVideo(slide) {
    if (!screenVideo) return;
    const shouldPlay = slide >= 1.02;
    if (shouldPlay === videoOn) {
        if (!shouldPlay && !screenVideo.paused) screenVideo.pause();
        return;
    }
    videoOn = shouldPlay;
    if (shouldPlay) {
        const play = screenVideo.play();
        if (play) play.catch(() => {});
        return;
    }
    screenVideo.pause();
}

function render(introP, slide) {
    const m = metrics();
    const shrinkT = clamp(introP / 0.48, 0, 1);
    const moveT = clamp((introP - 0.42) / 0.28, 0, 1);
    const frameOpacity = clamp((introP - 0.36) / 0.2, 0, 1);

    const heroRect = introP <= 0.42
        ? lerpRect(m.heroStart, m.heroLand, shrinkT)
        : lerpRect(m.heroLand, m.heroEnd, moveT);
    const frameRect = lerpRect(m.land, m.end, moveT);

    gsap.set(screen, {
        left: heroRect.left,
        top: heroRect.top,
        width: heroRect.width,
        height: heroRect.height,
        borderRadius: (1 - frameOpacity) * 20 * Math.min(shrinkT * 1.2, 1),
    });
    gsap.set(screenTrack, { y: -slide * heroRect.height });
    syncVideo(slide);

    gsap.set(frame, {
        left: frameRect.left,
        top: frameRect.top,
        width: frameRect.width,
        height: frameRect.height,
        opacity: frameOpacity,
    });

    gsap.set(hint, { opacity: 1 - clamp(introP / 0.12, 0, 1) });
}

function rangeProgress(start, distance) {
    return clamp((window.scrollY - start) / distance, 0, 1);
}

function swapProgress() {
    const start = introPx * 0.78;
    return rangeProgress(start, window.innerHeight * 0.22);
}

function videoProgress() {
    if (!copyNext) return 0;
    const vh = window.innerHeight;
    const top = copyNext.getBoundingClientRect().top + window.scrollY;
    return rangeProgress(top - vh * 0.48, vh * 0.22);
}

function renderFromScroll() {
    render(clamp(window.scrollY / introPx, 0, 1), swapProgress() + videoProgress());
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion) {
    copySpacer.style.height = "0px";
    render(1, 2);
} else {
    measure();

    ScrollTrigger.create({
        trigger: story,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onRefresh: renderFromScroll,
        onUpdate: renderFromScroll,
    });

    ScrollTrigger.addEventListener("refreshInit", measure);
    window.addEventListener("load", () => {
        measure();
        ScrollTrigger.refresh();
    });

    renderFromScroll();
}

function initPrinciplesIntro() {
    const section = document.querySelector("#principles");
    const sticky = document.querySelector(".principles__sticky");
    const visual = document.querySelector(".principles__visual");
    const title = document.querySelector(".principles__title");
    const points = document.querySelector(".principles__points");
    if (!section || !sticky || !visual || !title || !points || reduceMotion) return;

    const smooth = (value) => value * value * (3 - 2 * value);

    function maxScale() {
        const width = visual.offsetWidth;
        if (!width) return 1;
        return document.documentElement.clientWidth / width;
    }

    function paint(progress) {
        const shrink = smooth(clamp(progress / 0.7, 0, 1));
        const reveal = smooth(clamp((progress - 0.55) / 0.4, 0, 1));
        const scale = lerp(maxScale(), 1, shrink);
        gsap.set(visual, { scale, transformOrigin: "50% 50%" });
        gsap.set(title, {
            opacity: reveal,
            y: (1 - reveal) * -28,
        });
        gsap.set(points, {
            opacity: reveal,
            y: (1 - reveal) * 32,
            pointerEvents: reveal > 0.95 ? "auto" : "none",
        });
    }

    gsap.set([title, points], { pointerEvents: "none" });
    paint(0);

    ScrollTrigger.create({
        id: "principlesIntro",
        trigger: section,
        start: "top top",
        end: "+=100%",
        pin: true,
        anticipatePin: 1,
        scrub: true,
        onRefresh(self) {
            paint(self.progress);
        },
        onUpdate(self) {
            paint(self.progress);
        },
    });

    if (!visual.complete) {
        visual.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    }
}

initPrinciplesIntro();

function initInterviews() {
    document.querySelectorAll(".interview").forEach((root) => {
    const cards = [...root.querySelectorAll(".interview__card")];
    const prev = root.querySelector(".interview__nav--prev");
    const next = root.querySelector(".interview__nav--next");
    if (!cards.length || !prev || !next) return;
    let index = cards.length <= 4 ? 0 : Math.floor((cards.length - 1) / 2);

    function paint() {
        const gap = 32;
        const fit = (root.clientWidth - 88 - gap * (cards.length - 1)) / cards.length;
        const spread = cards.length <= 4 && fit >= 260;
        if (spread) {
            const width = Math.min(460, fit);
            const step = width + gap;
            cards.forEach((card, i) => {
                const visual = (i - index + cards.length) % cards.length;
                const pos = visual - (cards.length - 1) / 2;
                card.style.width = width + "px";
                card.style.marginLeft = (-width / 2) + "px";
                card.classList.remove("is-active");
                card.style.transform = `translateX(${pos * step}px)`;
                card.style.zIndex = "1";
                card.style.opacity = "1";
                card.style.visibility = "visible";
            });
            return;
        }
        const cardWidth = cards[0].offsetWidth;
        const step = cardWidth + 28;
        const room = root.clientWidth / 2 - cardWidth / 2 - 64;
        const limit = Math.max(0, Math.min(2, Math.floor(room / step)));
        cards.forEach((card, i) => {
            let offset = i - index;
            if (offset > cards.length / 2) offset -= cards.length;
            if (offset < -cards.length / 2) offset += cards.length;
            const far = Math.abs(offset) > limit;
            const active = offset === 0;
            card.classList.toggle("is-active", active);
            card.style.transform = `translateX(${offset * step}px) scale(${active ? 1.04 : 0.96})`;
            card.style.zIndex = String(5 - Math.abs(offset));
            card.style.opacity = far ? "0" : "1";
            card.style.visibility = far ? "hidden" : "visible";
        });
    }

    prev.addEventListener("click", () => {
        index = (index - 1 + cards.length) % cards.length;
        paint();
    });
    next.addEventListener("click", () => {
        index = (index + 1) % cards.length;
        paint();
    });
    cards.forEach((card, i) => {
        card.addEventListener("click", (event) => {
            if (event.target.closest("a")) return;
            index = i;
            paint();
        });
    });
    window.addEventListener("resize", paint);
    paint();
    });
}

initInterviews();

document.querySelectorAll(".principles__toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const item = button.closest("li");
        const open = item.classList.toggle("is-open");
        button.setAttribute("aria-expanded", String(open));
    });
});
