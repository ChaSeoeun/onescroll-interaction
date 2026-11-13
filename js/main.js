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

const resizeScrollKey = "onescroll-resize-y";
const savedResizeY = sessionStorage.getItem(resizeScrollKey);
if (savedResizeY) sessionStorage.removeItem(resizeScrollKey);

window.addEventListener("load", () => {
    if (!savedResizeY) return;
    window.scrollTo(0, Number(savedResizeY));
    ScrollTrigger.refresh();
});

let resizeReloadTimer;
let resizeWidth = window.innerWidth;
let resizeHeight = window.innerHeight;
window.addEventListener("resize", () => {
    clearTimeout(resizeReloadTimer);
    resizeReloadTimer = setTimeout(() => {
        if (window.innerWidth === resizeWidth && window.innerHeight === resizeHeight) return;
        sessionStorage.setItem(resizeScrollKey, String(window.scrollY));
        location.reload();
    }, 250);
});

const stories = document.querySelector(".stories");
const storiesStage = document.querySelector(".stories-stage");
const storiesScroll = document.querySelector("#storiesScroll");
const STORIES_IRIS_END = 0.62;
let scrollDrawActive = false;
let scrollDrawProgress = 0;
let scrollDrawHold = 0;
let scrollDrawMeasuring = false;
const scrollDot = document.querySelector(".scroll-draw__dot");
const scrollDrawPath = document.querySelector("#draw-path");
const scrollLpPath = document.querySelector("#lp-player-path");
const scrollStem = document.querySelector(".scroll-draw__stem");
const scrollDrawSvg = document.querySelector(".scroll-draw");
const scrollExitPath = document.querySelector(".scroll-exit__path");
const scrollExitStem = document.querySelector(".scroll-exit__stem");
const scrollOpen = document.querySelector(".scroll-open");
const scrollBloom = document.querySelector(".scroll-open__bloom");

if (stories && storiesScroll) {
const storiesGallery = stories.querySelector(".stories-gallery");
const storiesCopy = stories.querySelector(".stories-count");
const storiesHint = stories.querySelector(".stories-count > span");
const storiesChart = stories.querySelector(".stories-chart");
const storiesLevels = stories.querySelector(".stories-levels");
const storiesSegs = [...stories.querySelectorAll(".stories-seg")];
const storiesTopics = stories.querySelector(".stories-topics");
const storiesSlotRoot = storiesTopics.querySelector(".stories-topics-slots");
const STORIES_SLOT_COUNT = 5;
storiesSlotRoot.replaceChildren(...Array.from({ length: STORIES_SLOT_COUNT }, () => {
    const slot = document.createElement("div");
    slot.className = "stories-topics-slot";
    const frame = document.createElement("div");
    frame.className = "stories-slot-frame";
    const label = document.createElement("p");
    label.className = "stories-in";
    slot.append(frame, label);
    return slot;
}));
let storiesTopicButtons = [];
const storiesTopicName = storiesTopics.querySelector(".stories-topics-copy h3");
const storiesTopicCount = storiesTopics.querySelector(".stories-topics-count b");
const storiesTopicDesc = storiesTopics.querySelector(".stories-topics-desc");
const storiesTopicLabels = [...storiesTopics.querySelectorAll(".stories-topics-slot p")];
const storiesTopicReveals = [...storiesTopics.querySelectorAll(".stories-in")];
let storiesThumbs = [];
let storiesCast = [];
let storiesTopicIndex = 0;
let storiesTopicOffset = 0;
let storiesTl = null;
let storiesStep = 0;
let switching = false;
let storiesWant = 0;
let storiesGalleryArmed = false;
let storiesProgress = 0;
let storiesTopicExit = false;
let storiesHoldThumbs = null;

// 제목(5,800편)이 보인 상태에서 휠 한 번 정도 내리면 썸네일이 나온다
const STORIES_GALLERY_SCROLL = 40;

function disarmStoriesGallery() {
    storiesGalleryArmed = false;
    if (!storiesWant && !storiesStep) return;
    storiesWant = 0;
    storiesFollow();
}

function storiesScrolledIn(self) {
    return self.progress * (self.end - self.start);
}

// 빠른 스크롤은 등장 트윈을 기다리지 않고 썸네일을 제자리에 둔다
function settleStoriesGallery() {
    if (storiesTl) storiesTl.kill();
    storiesStep = 1;
    switching = false;
    gsap.set(storiesCopy, { scale: 0.78 });
    storiesThumbs.forEach((thumb) => {
        gsap.set(thumb, {
            xPercent: -50,
            yPercent: -50,
            x: Number(thumb.dataset.x),
            y: Number(thumb.dataset.y),
            skewY: Number(thumb.dataset.skew),
            rotation: 0,
            scale: 1,
            opacity: 1
        });
    });
}

function storiesFollow() {
    if (switching || storiesWant === storiesStep) return;
    if (storiesWant > storiesStep) {
        if (storiesStep === 0) showStoriesGallery();
        else if (storiesStep === 1 && storiesWant >= 4) {
            paintStoriesPanels(1, 1);
            storiesStep = 3;
            showStoriesTopics();
        }
        else if (storiesStep === 3) showStoriesTopics();
    } else if (storiesStep === 4) hideStoriesTopics();
    else if (storiesStep === 3) {
        storiesStep = 1;
        paintStoriesPanels(storiesChartT(storiesProgress), storiesLevelsT(storiesProgress));
        storiesFollow();
    }
    else if (storiesStep === 1) hideStoriesGallery();
}

// ===== 섹션 5 =====
// featured.jpg 원본 184x123 비율 그대로 둬야 잘리지 않는다
const STORIES_RATIO = 184 / 123;
const storiesIds = [
    ...range(11, 61), ...range(63, 87), ...range(97, 153), ...range(170, 183)
];

function range(from, to) {
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

// 바깥 열일수록 크고 더 기울여 곡면처럼 보이게 한다. 같은 열은 같은 기울기라 서로 겹치지 않는다
function layoutStoriesScreen() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = Math.max(8, vw * .006);
    const baseWidth = vw * .118;
    const growth = .085;

    const columns = [{ col: 0, x: 0, w: baseWidth }];
    for (const side of [-1, 1]) {
        let edge = baseWidth / 2;
        for (let k = 1; edge < vw / 2; k++) {
            const w = baseWidth * (1 + growth * k);
            const x = edge + gap + w / 2;
            columns.push({ col: side * k, x: side * x, w });
            edge = x + w / 2;
        }
    }

    const holeW = storiesCopy.offsetWidth * .78 / 2 + vw * .025;
    const holeH = storiesCopy.offsetHeight * .78 / 2 + vh * .035;
    const cells = [];
    columns.forEach(({ col, x, w }) => {
        const h = w / STORIES_RATIO;
        const pitch = h + gap;
        const rows = Math.ceil((vh / 2 + h) / pitch);
        for (let row = -rows; row <= rows; row++) {
            const y = row * pitch;
            if (Math.abs(x) - w / 2 < holeW && Math.abs(y) - h / 2 < holeH) continue;
            if (Math.abs(y) - h / 2 > vh / 2) continue;
            cells.push({ col, x, y, w, h });
        }
    });
    cells.sort((a, b) => Math.hypot(a.x, a.y * 1.4) - Math.hypot(b.x, b.y * 1.4));

    if (storiesThumbs.length !== cells.length) {
        storiesGallery.replaceChildren();
        storiesThumbs = cells.map((_, index) => {
            const thumb = document.createElement("img");
            const id = storiesIds[index % storiesIds.length];
            thumb.className = "stories-thumb";
            thumb.alt = "";
            thumb.src = `https://img.littlefox.co.kr/static/contents/series/FS${String(id).padStart(4, "0")}/featured.jpg`;
            thumb.dataset.src = thumb.src;
            storiesGallery.append(thumb);
            return thumb;
        });
    }

    cells.forEach((cell, index) => {
        const thumb = storiesThumbs[index];
        thumb.style.width = `${cell.w}px`;
        thumb.style.height = `${cell.h}px`;
        thumb.dataset.x = cell.x;
        thumb.dataset.y = cell.y;
        thumb.dataset.w = cell.w;
        thumb.dataset.h = cell.h;
        thumb.dataset.skew = Math.sign(cell.col) * Math.min(Math.abs(cell.col) * 1.8, 9);
        const ringW = holeW + baseWidth * .72;
        const ringH = holeH + baseWidth / STORIES_RATIO * .85;
        const besideText = Math.abs(cell.x) - cell.w / 2 < ringW && Math.abs(cell.y) - cell.h / 2 < ringH;
        const besideTable = Math.abs(cell.x) - cell.w / 2 < storiesLevels.offsetWidth / 2 + vw * .09
            && Math.abs(cell.y) - cell.h / 2 < storiesLevels.offsetHeight / 2 + vh * .07;
        thumb.dataset.inner = besideText ? "1" : "";
        thumb.dataset.wide = !besideText && besideTable ? "1" : "";
    });
}

function setStoriesChart(progress) {
    storiesSegs.forEach(seg => {
        const value = Number(seg.dataset.value) * progress;
        seg.style.width = `${value}%`;
        seg.querySelector("b").textContent = `${Math.round(value)}%`;
    });
}

function storiesChartT(progress) {
    const start = 0.18;
    const end = 0.34;
    return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

function storiesChartCoverThumbs() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const halfW = Math.min(vw * .72, 1180) / 2 + vw * .04;
    const halfH = vh * .28;
    return storiesThumbs.filter(thumb => {
        if (thumb.dataset.inner === "1") return true;
        const x = Math.abs(Number(thumb.dataset.x));
        const y = Math.abs(Number(thumb.dataset.y));
        return x - Number(thumb.dataset.w) / 2 < halfW && y - Number(thumb.dataset.h) / 2 < halfH;
    });
}

function storiesChartPassThumbs(chartY) {
    const vw = window.innerWidth;
    const halfW = Math.min(vw * .72, 1180) / 2 + vw * .03;
    const halfH = (storiesChart.offsetHeight || window.innerHeight * .34) / 2 + window.innerHeight * .05;
    return storiesThumbs.filter(thumb => {
        const dx = Math.abs(Number(thumb.dataset.x));
        const dy = Math.abs(Number(thumb.dataset.y) - chartY);
        return dx - Number(thumb.dataset.w) / 2 < halfW && dy - Number(thumb.dataset.h) / 2 < halfH;
    });
}

function storiesLevelsT(progress) {
    const start = 0.5;
    const end = 0.68;
    return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

function storiesTopicsT(progress) {
    const start = 0.72;
    const end = 0.9;
    return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

function storiesLevelsCoverThumbs() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const halfW = Math.min(vw * .92, 1380) / 2 + vw * .02;
    const halfH = vh * .46;
    return storiesThumbs.filter(thumb => {
        const x = Math.abs(Number(thumb.dataset.x));
        const y = Math.abs(Number(thumb.dataset.y));
        return x - Number(thumb.dataset.w) / 2 < halfW && y - Number(thumb.dataset.h) / 2 < halfH;
    });
}

function storiesCoverAmount(thumb, chartT, levelsT, chartCover, levelsCover) {
    return Math.max(chartCover.has(thumb) ? chartT : 0, levelsCover.has(thumb) ? levelsT : 0);
}

function storiesSideFlyThumbs(chartCover, levelsCover) {
    const side = storiesThumbs.filter(thumb => !chartCover.has(thumb) && !levelsCover.has(thumb));
    const pick = (list) => {
        if (!list.length) return [];
        const byY = [...list].sort((a, b) => Number(a.dataset.y) - Number(b.dataset.y));
        if (byY.length <= 2) return [byY[0]];
        const mid = byY[Math.floor((byY.length - 1) / 2)];
        return [byY[0], mid, byY[byY.length - 1]];
    };
    return [
        ...pick(side.filter(thumb => Number(thumb.dataset.x) < 0)),
        ...pick(side.filter(thumb => Number(thumb.dataset.x) > 0))
    ];
}

function storiesThumbAmount(thumb, chartT, levelsT, chartCover, levelsCover, fly) {
    if (chartCover.has(thumb) || levelsCover.has(thumb)) {
        return storiesCoverAmount(thumb, chartT, levelsT, chartCover, levelsCover);
    }
    return fly && fly.has(thumb) ? levelsT : 0;
}

function storiesPlaceThumb(thumb, amount) {
    gsap.set(thumb, {
        xPercent: -50,
        yPercent: -50,
        x: Number(thumb.dataset.x),
        y: Number(thumb.dataset.y),
        width: Number(thumb.dataset.w),
        height: Number(thumb.dataset.h),
        skewY: Number(thumb.dataset.skew),
        scale: 1 - amount * 0.14,
        opacity: 1 - amount,
        borderRadius: 8
    });
}

function paintStoriesPanels(chartT, levelsT, topicsT = 0, thumbs = true) {
    const shift = stories.clientHeight || window.innerHeight;
    const travel = chartT + levelsT + topicsT;
    const chartY = (1 - travel) * shift;
    const levelsY = (1 - levelsT - topicsT) * shift;
    const topicsY = (1 - topicsT) * shift;
    const chartCover = new Set(storiesChartCoverThumbs());
    const chartPass = new Set(chartT > 0.02 ? storiesChartPassThumbs(chartY) : []);
    const levelsCover = new Set(storiesLevelsCoverThumbs());
    const fly = new Set(storiesSideFlyThumbs(chartCover, levelsCover));
    const clearT = Math.min(1, topicsT * 1.7);
    gsap.set(storiesCopy, { y: -travel * shift, opacity: 1 });
    gsap.set(storiesChart, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: chartY,
        scale: 1,
        opacity: 1,
        visibility: Math.abs(chartY) < shift * 1.05 ? "visible" : "hidden"
    });
    gsap.set(storiesLevels, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: levelsY,
        scale: 1,
        opacity: 1,
        visibility: levelsT > 0.001 && levelsY > -shift * 1.02 ? "visible" : "hidden"
    });
    gsap.set(storiesTopics, {
        y: topicsY,
        visibility: topicsT > 0.001 ? "visible" : "hidden"
    });
    gsap.set(storiesTopicReveals, { opacity: 1, y: 0 });
    const ready = topicsT > 0.98;
    storiesTopics.classList.toggle("is-ready", ready);
    storiesTopics.setAttribute("aria-hidden", ready ? "false" : "true");
    const slots = topicsT > 0.001 ? storiesEnsureCast() : [];
    // 전환 중(switching)에는 슬롯으로 날아가는 카드를 놓치면 원래 자리로 돌아오지 못하므로 해제하지 않는다
    if (topicsT <= 0.001 && !switching) storiesReleaseCast();
    if (!thumbs) return;
    storiesThumbs.forEach(thumb => {
        if (storiesHoldThumbs && storiesHoldThumbs.has(thumb)) return;
        const castIndex = storiesCast.indexOf(thumb);
        if (castIndex >= 0 && slots[castIndex]) {
            const point = slots[castIndex];
            const homeX = Number(thumb.dataset.x);
            const homeY = Number(thumb.dataset.y);
            const homeW = Number(thumb.dataset.w);
            const homeH = Number(thumb.dataset.h);
            gsap.set(thumb, {
                x: homeX + (point.x - homeX) * topicsT,
                y: homeY + (point.y + topicsY - homeY) * topicsT,
                width: homeW + (point.w - homeW) * topicsT,
                height: homeH + (point.h - homeH) * topicsT,
                skewY: Number(thumb.dataset.skew) * (1 - topicsT),
                rotation: 0,
                scale: 1,
                opacity: 1,
                borderRadius: 8 + 6 * topicsT,
                zIndex: 8
            });
            return;
        }
        if (fly.has(thumb)) {
            const x = Number(thumb.dataset.x);
            const y = Number(thumb.dataset.y);
            const dir = Math.sign(x) || 1;
            const yDir = Math.sign(y) || -1;
            gsap.set(thumb, {
                x: x + dir * levelsT * window.innerWidth * .62,
                y: y + yDir * levelsT * window.innerHeight * .48,
                skewY: Number(thumb.dataset.skew) * (1 - levelsT),
                rotation: dir * levelsT * 11,
                opacity: 1 - clearT,
                scale: 1
            });
            return;
        }
        if (!chartCover.has(thumb) && !levelsCover.has(thumb) && !chartPass.has(thumb)) {
            gsap.set(thumb, {
                x: Number(thumb.dataset.x),
                y: Number(thumb.dataset.y),
                skewY: Number(thumb.dataset.skew),
                rotation: 0,
                opacity: 1 - clearT,
                scale: 1
            });
            return;
        }
        const amount = Math.max(
            storiesCoverAmount(thumb, chartT, levelsT, chartCover, levelsCover),
            chartPass.has(thumb) ? 1 : 0,
            clearT
        );
        // 가려지는 카드도 제자리로 되돌려, 이전 단계에서 남은 위치 오차가 그대로 보이지 않게 한다
        gsap.set(thumb, {
            x: Number(thumb.dataset.x),
            y: Number(thumb.dataset.y),
            opacity: 1 - amount,
            scale: 1 - amount * 0.14,
            rotation: 0
        });
    });
    setStoriesChart(1);
}

function resetStories() {
    storiesStep = 0;
    storiesCast = [];
    layoutStoriesScreen();
    gsap.killTweensOf([storiesCopy, storiesHint, storiesChart, storiesLevels, storiesTopics, ...storiesTopicReveals, ...storiesThumbs]);
    gsap.set(storiesCopy, { y: 0, scale: 1, opacity: 1 });
    gsap.set(storiesChart, { opacity: 1, xPercent: -50, yPercent: -50, x: 0, y: window.innerHeight, scale: 1, visibility: "hidden" });
    gsap.set(storiesLevels, { opacity: 1, xPercent: -50, yPercent: -50, x: 0, y: window.innerHeight, scale: 1, visibility: "hidden" });
    gsap.set(storiesTopics, { visibility: "hidden" });
    gsap.set(storiesTopicReveals, { opacity: 0, y: 16 });
    storiesGallery.style.zIndex = "";
    storiesLevels.style.zIndex = "";
    storiesTopicExit = false;
    storiesHoldThumbs = null;
    storiesSlotCache = null;
    storiesTopics.classList.remove("is-ready");
    storiesTopics.setAttribute("aria-hidden", "true");
    setStoriesTopic(0);
    setStoriesChart(0);
    gsap.set(storiesHint, { opacity: 1, y: 0 });
    storiesThumbs.forEach(thumb => {
        thumb.style.zIndex = "";
        gsap.set(thumb, {
            xPercent: -50,
            yPercent: -50,
            x: Number(thumb.dataset.x) * .35,
            y: Number(thumb.dataset.y) * .35,
            width: Number(thumb.dataset.w),
            height: Number(thumb.dataset.h),
            skewY: 0,
            rotation: 0,
            scale: .4,
            opacity: 0,
            borderRadius: 8
        });
    });
}

function showStoriesGallery() {
    if (storiesStep || switching) return;
    storiesStep = 1;
    switching = true;
    if (storiesTl) storiesTl.kill();

    storiesTl = gsap.timeline({
        onComplete: () => {
            switching = false;
            storiesFollow();
            if (storiesStep === 1) paintStoriesPanels(storiesChartT(storiesProgress), storiesLevelsT(storiesProgress), storiesTopicsT(storiesProgress));
        }
    });
    storiesTl
        .to(storiesCopy, { scale: .78, duration: 1.05, ease: "power3.inOut" }, 0)
        .to(storiesThumbs, {
            x: (_, thumb) => Number(thumb.dataset.x),
            y: (_, thumb) => Number(thumb.dataset.y),
            skewY: (_, thumb) => Number(thumb.dataset.skew),
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: .8,
            ease: "power3.out",
            stagger: { amount: .7 }
        }, .05);
}

function hideStoriesGallery() {
    if (!storiesStep || switching) return;
    switching = true;
    if (storiesTl) storiesTl.kill();
    paintStoriesPanels(0, 0);

    storiesTl = gsap.timeline({
        onComplete: () => {
            storiesStep = 0;
            switching = false; storiesFollow();
        }
    });
    storiesTl
        .to(storiesThumbs, {
            x: (_, thumb) => Number(thumb.dataset.x) * .35,
            y: (_, thumb) => Number(thumb.dataset.y) * .35,
            skewY: 0,
            scale: .4,
            opacity: 0,
            duration: .5,
            ease: "power3.in",
            stagger: { amount: .35, from: "end" }
        })
        .to(storiesCopy, { scale: 1, duration: .55, ease: "power3.out" }, "-=.3");
}

function storiesInnerThumbs() {
    return storiesThumbs.filter(thumb => thumb.dataset.inner === "1");
}

// 소개 페이지 '동화 주제별 구성'의 편수, 작품, 썸네일
const storiesTopicData = [
    { name: "세계명작", count: "1,542", lines: ["오래 사랑받아 온 이야기들을", "영어 동화로 만나보세요."], stories: [
        { title: "피터 래빗", src: "https://img.littlefox.co.kr/static/contents/series/FS0087/featured.jpg" },
        { title: "미녀와 야수", src: "https://img.littlefox.co.kr/static/contents/series/FS0176/featured.jpg" },
        { title: "벨벳 토끼", src: "https://img.littlefox.co.kr/static/contents/series/FS0126/featured.jpg" },
        { title: "버드나무에 부는 바람", src: "https://img.littlefox.co.kr/static/contents/series/FS0046/featured.jpg" },
        { title: "행복한 왕자", src: "https://img.littlefox.co.kr/static/contents/series/FS0181/featured.jpg" },
        { title: "홍길동전", src: "https://img.littlefox.co.kr/static/contents/series/FS0153/featured.jpg" },
        { title: "가벼운 공주", src: "https://img.littlefox.co.kr/static/contents/series/FS0113/featured.jpg" },
        { title: "엄지공주", src: "https://img.littlefox.co.kr/static/contents/series/FS0044/featured.jpg" },
        { title: "소원 들어주는 우물", src: "https://img.littlefox.co.kr/static/contents/series/FS0039/featured.jpg" },
        { title: "닥터 두리틀", src: "https://img.littlefox.co.kr/static/contents/series/FS0028/featured.jpg" },
        { title: "삼국지", src: "https://img.littlefox.co.kr/static/contents/series/FS0182/featured.jpg" },
        { title: "서유기", src: "https://img.littlefox.co.kr/static/contents/series/FS0078/featured.jpg" },
        { title: "이상한 나라의 앨리스", src: "https://img.littlefox.co.kr/static/contents/series/FS0106/featured.jpg" },
        { title: "정글북", src: "https://img.littlefox.co.kr/static/contents/series/FS0097/featured.jpg" },
        { title: "마법에 걸린 성", src: "https://img.littlefox.co.kr/static/contents/series/FS0069/featured.jpg" },
        { title: "걸리버 여행기", src: "https://img.littlefox.co.kr/static/contents/series/FS0041/featured.jpg" },
        { title: "플란더스의 개", src: "https://img.littlefox.co.kr/static/contents/series/FS0038/featured.jpg" },
        { title: "기찻길 옆 아이들", src: "https://img.littlefox.co.kr/static/contents/series/FS0030/featured.jpg" },
        { title: "피노키오", src: "https://img.littlefox.co.kr/static/contents/series/FS0029/featured.jpg" },
        { title: "하이디", src: "https://img.littlefox.co.kr/static/contents/series/FS0035/featured.jpg" },
        { title: "인어공주", src: "https://img.littlefox.co.kr/static/contents/series/FS0013/featured.jpg" },
        { title: "크리스마스 캐럴", src: "https://img.littlefox.co.kr/static/contents/series/FS0174/featured.jpg" },
        { title: "왕자와 거지", src: "https://img.littlefox.co.kr/static/contents/series/FS0152/featured.jpg" },
        { title: "소공자", src: "https://img.littlefox.co.kr/static/contents/series/FS0122/featured.jpg" },
        { title: "폴리아나", src: "https://img.littlefox.co.kr/static/contents/series/FS0116/featured.jpg" },
        { title: "키다리 아저씨", src: "https://img.littlefox.co.kr/static/contents/series/FS0103/featured.jpg" },
        { title: "피터 팬", src: "https://img.littlefox.co.kr/static/contents/series/FS0025/featured.jpg" },
        { title: "소공녀", src: "https://img.littlefox.co.kr/static/contents/series/FS0079/featured.jpg" },
        { title: "비밀의 화원", src: "https://img.littlefox.co.kr/static/contents/series/FS0051/featured.jpg" },
        { title: "블랙 뷰티", src: "https://img.littlefox.co.kr/static/contents/series/FS0049/featured.jpg" },
        { title: "오즈의 마법사", src: "https://img.littlefox.co.kr/static/contents/series/FS0031/featured.jpg" },
        { title: "톰 소여의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0032/featured.jpg" },
        { title: "스위스의 로빈슨 가족", src: "https://img.littlefox.co.kr/static/contents/series/FS0072/featured.jpg" },
        { title: "80일간의 세계일주", src: "https://img.littlefox.co.kr/static/contents/series/FS0037/featured.jpg" },
        { title: "안데르센 & 다른 작가 동화", src: "https://img.littlefox.co.kr/static/contents/series/FS0132/featured.jpg" },
        { title: "작은 신사들", src: "https://img.littlefox.co.kr/static/contents/series/FS0108/featured.jpg" },
        { title: "허클베리 핀의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0026/featured.jpg" },
        { title: "빨간 머리 앤", src: "https://img.littlefox.co.kr/static/contents/series/FS0033/featured.jpg" },
        { title: "보물섬", src: "https://img.littlefox.co.kr/static/contents/series/FS0043/featured.jpg" },
        { title: "작은 아씨들", src: "https://img.littlefox.co.kr/static/contents/series/FS0040/featured.jpg" },
        { title: "셜록 홈즈", src: "https://img.littlefox.co.kr/static/contents/series/FS0022/featured.jpg" },
        { title: "왕자와 거지", src: "https://img.littlefox.co.kr/static/contents/series/FS0015/featured.jpg" },
        { title: "올리버 트위스트", src: "https://img.littlefox.co.kr/static/contents/series/FS0058/featured.jpg" },
        { title: "늑대개 화이트팽", src: "https://img.littlefox.co.kr/static/contents/series/FS0082/featured.jpg" },
        { title: "오스카 와일드", src: "https://img.littlefox.co.kr/static/contents/series/FS0021/featured.jpg" },
        { title: "제인 에어", src: "https://img.littlefox.co.kr/static/contents/series/FS0061/featured.jpg" },
        { title: "괴도 루팡", src: "https://img.littlefox.co.kr/static/contents/series/FS0020/featured.jpg" },
        { title: "셰익스피어", src: "https://img.littlefox.co.kr/static/contents/series/FS0019/featured.jpg" },
        { title: "오페라의 유령", src: "https://img.littlefox.co.kr/static/contents/series/FS0115/featured.jpg" },
        { title: "레 미제라블", src: "https://img.littlefox.co.kr/static/contents/series/FS0076/featured.jpg" },
        { title: "위대한 유산", src: "https://img.littlefox.co.kr/static/contents/series/FS0052/featured.jpg" },
        { title: "그리스 신화", src: "https://img.littlefox.co.kr/static/contents/series/FS0017/featured.jpg" },
        { title: "해저 2만리", src: "https://img.littlefox.co.kr/static/contents/series/FS0068/featured.jpg" },
        { title: "오 헨리", src: "https://img.littlefox.co.kr/static/contents/series/FS0018/featured.jpg" },
        { title: "드라큘라", src: "https://img.littlefox.co.kr/static/contents/series/FS0016/featured.jpg" }
    ] },
    { name: "전래동화·공주", count: "296", lines: ["오래 전해 온 이야기와 공주 이야기를", "영어 동화로 만나보세요."], stories: [
        { title: "라푼젤", src: "https://img.littlefox.co.kr/static/contents/series/FS0125/featured.jpg" },
        { title: "장화 신은 고양이", src: "https://img.littlefox.co.kr/static/contents/series/FS0105/featured.jpg" },
        { title: "잭과 콩나무", src: "https://img.littlefox.co.kr/static/contents/series/FS0107/featured.jpg" },
        { title: "신데렐라", src: "https://img.littlefox.co.kr/static/contents/series/FS0100/featured.jpg" },
        { title: "백설공주와 일곱 난쟁이", src: "https://img.littlefox.co.kr/static/contents/series/FS0101/featured.jpg" },
        { title: "전래동화 1", src: "https://img.littlefox.co.kr/static/contents/series/FS0134/featured.jpg" },
        { title: "이솝우화", src: "https://img.littlefox.co.kr/static/contents/series/FS0131/featured.jpg" },
        { title: "알라딘", src: "https://img.littlefox.co.kr/static/contents/series/FS0045/featured.jpg" },
        { title: "로빈 후드의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0099/featured.jpg" },
        { title: "전래동화 2", src: "https://img.littlefox.co.kr/static/contents/series/FS0135/featured.jpg" },
        { title: "미녀와 야수", src: "https://img.littlefox.co.kr/static/contents/series/FS0176/featured.jpg" },
        { title: "가벼운 공주", src: "https://img.littlefox.co.kr/static/contents/series/FS0113/featured.jpg" },
        { title: "엄지공주", src: "https://img.littlefox.co.kr/static/contents/series/FS0044/featured.jpg" },
        { title: "인어공주", src: "https://img.littlefox.co.kr/static/contents/series/FS0013/featured.jpg" }
    ] },
    { name: "판타지·공상과학", count: "1,200", lines: ["상상 속 세계와 신기한 과학을", "영어 동화로 만나보세요."], stories: [
        { title: "제인과 핍의 달콤한 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0179/featured.jpg" },
        { title: "옛날이야기 마법 헛간", src: "https://img.littlefox.co.kr/static/contents/series/FS0123/featured.jpg" },
        { title: "우주 순찰대", src: "https://img.littlefox.co.kr/static/contents/series/FS0104/featured.jpg" },
        { title: "매직 마커", src: "https://img.littlefox.co.kr/static/contents/series/FS0012/featured.jpg" },
        { title: "슈퍼히어로 로봇", src: "https://img.littlefox.co.kr/static/contents/series/FS0170/featured.jpg" },
        { title: "벨벳 토끼", src: "https://img.littlefox.co.kr/static/contents/series/FS0126/featured.jpg" },
        { title: "생일 요정", src: "https://img.littlefox.co.kr/static/contents/series/FS0114/featured.jpg" },
        { title: "마법사와 고양이", src: "https://img.littlefox.co.kr/static/contents/series/FS0083/featured.jpg" },
        { title: "대니의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0034/featured.jpg" },
        { title: "소원 들어주는 우물", src: "https://img.littlefox.co.kr/static/contents/series/FS0039/featured.jpg" },
        { title: "이상한 나라의 앨리스", src: "https://img.littlefox.co.kr/static/contents/series/FS0106/featured.jpg" },
        { title: "마법에 걸린 성", src: "https://img.littlefox.co.kr/static/contents/series/FS0069/featured.jpg" },
        { title: "알라딘", src: "https://img.littlefox.co.kr/static/contents/series/FS0045/featured.jpg" },
        { title: "지구에 온 앨리", src: "https://img.littlefox.co.kr/static/contents/series/FS0117/featured.jpg" },
        { title: "몬스터 아카데미", src: "https://img.littlefox.co.kr/static/contents/series/FS0086/featured.jpg" },
        { title: "피터 팬", src: "https://img.littlefox.co.kr/static/contents/series/FS0025/featured.jpg" },
        { title: "오즈의 마법사", src: "https://img.littlefox.co.kr/static/contents/series/FS0031/featured.jpg" },
        { title: "레드 매직", src: "https://img.littlefox.co.kr/static/contents/series/FS0059/featured.jpg" },
        { title: "올림픽 챔피언", src: "https://img.littlefox.co.kr/static/contents/series/FS0077/featured.jpg" },
        { title: "해저 2만리", src: "https://img.littlefox.co.kr/static/contents/series/FS0068/featured.jpg" }
    ] },
    { name: "슈퍼히어로·모험", count: "1,033", lines: ["용감한 영웅과 신나는 모험을", "영어 동화로 만나보세요."], stories: [
        { title: "슈퍼히어로 로봇", src: "https://img.littlefox.co.kr/static/contents/series/FS0170/featured.jpg" },
        { title: "홍길동전", src: "https://img.littlefox.co.kr/static/contents/series/FS0153/featured.jpg" },
        { title: "로켓걸", src: "https://img.littlefox.co.kr/static/contents/series/FS0065/featured.jpg" },
        { title: "로켓걸의 갤럭시 스쿼드 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0120/featured.jpg" },
        { title: "서유기", src: "https://img.littlefox.co.kr/static/contents/series/FS0078/featured.jpg" },
        { title: "로켓걸의 서유기 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0110/featured.jpg" },
        { title: "코라의 나침반", src: "https://img.littlefox.co.kr/static/contents/series/FS0124/featured.jpg" },
        { title: "우주 순찰대", src: "https://img.littlefox.co.kr/static/contents/series/FS0104/featured.jpg" },
        { title: "서부로 가다", src: "https://img.littlefox.co.kr/static/contents/series/FS0173/featured.jpg" },
        { title: "대니의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0034/featured.jpg" },
        { title: "삼국지", src: "https://img.littlefox.co.kr/static/contents/series/FS0182/featured.jpg" },
        { title: "데이지 두리틀", src: "https://img.littlefox.co.kr/static/contents/series/FS0175/featured.jpg" },
        { title: "걸리버 여행기", src: "https://img.littlefox.co.kr/static/contents/series/FS0041/featured.jpg" },
        { title: "피노키오", src: "https://img.littlefox.co.kr/static/contents/series/FS0029/featured.jpg" },
        { title: "로빈 후드의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0099/featured.jpg" },
        { title: "톰 소여의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0032/featured.jpg" },
        { title: "스위스의 로빈슨 가족", src: "https://img.littlefox.co.kr/static/contents/series/FS0072/featured.jpg" },
        { title: "80일간의 세계일주", src: "https://img.littlefox.co.kr/static/contents/series/FS0037/featured.jpg" },
        { title: "허클베리 핀의 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0026/featured.jpg" },
        { title: "보물섬", src: "https://img.littlefox.co.kr/static/contents/series/FS0043/featured.jpg" }
    ] },
    { name: "미스터리·탐정", count: "328", lines: ["수수께끼를 풀어 가는 이야기를", "영어 동화로 만나보세요."], stories: [
        { title: "몬스터 아카데미", src: "https://img.littlefox.co.kr/static/contents/series/FS0086/featured.jpg" },
        { title: "레모네이드 탐정단", src: "https://img.littlefox.co.kr/static/contents/series/FS0055/featured.jpg" },
        { title: "셜록 홈즈", src: "https://img.littlefox.co.kr/static/contents/series/FS0022/featured.jpg" },
        { title: "괴도 루팡", src: "https://img.littlefox.co.kr/static/contents/series/FS0020/featured.jpg" },
        { title: "오페라의 유령", src: "https://img.littlefox.co.kr/static/contents/series/FS0115/featured.jpg" },
        { title: "드라큘라", src: "https://img.littlefox.co.kr/static/contents/series/FS0016/featured.jpg" }
    ] },
    { name: "공룡·자동차·동물", count: "570", lines: ["좋아하는 공룡, 자동차, 동물을", "영어 동화로 만나보세요."], stories: [
        { title: "공룡 친구들", src: "https://img.littlefox.co.kr/static/contents/series/FS0102/featured.jpg" },
        { title: "공룡을 만나요", src: "https://img.littlefox.co.kr/static/contents/series/FS0177/featured.jpg" },
        { title: "타이어타운스쿨", src: "https://img.littlefox.co.kr/static/contents/series/FS0084/featured.jpg" },
        { title: "배트와 친구들", src: "https://img.littlefox.co.kr/static/contents/series/FS0056/featured.jpg" },
        { title: "코라의 나침반", src: "https://img.littlefox.co.kr/static/contents/series/FS0124/featured.jpg" },
        { title: "동물 친구들", src: "https://img.littlefox.co.kr/static/contents/series/FS0074/featured.jpg" },
        { title: "야생동물 대모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0180/featured.jpg" },
        { title: "닥터 두리틀", src: "https://img.littlefox.co.kr/static/contents/series/FS0028/featured.jpg" },
        { title: "정글북", src: "https://img.littlefox.co.kr/static/contents/series/FS0097/featured.jpg" },
        { title: "블랙 뷰티", src: "https://img.littlefox.co.kr/static/contents/series/FS0049/featured.jpg" },
        { title: "늑대개 화이트팽", src: "https://img.littlefox.co.kr/static/contents/series/FS0082/featured.jpg" },
        { title: "땅에 사는 동물", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00041/featured.jpg" },
        { title: "물에 사는 동물", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00042/featured.jpg" },
        { title: "곤충 & 기타", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00043/featured.jpg" }
    ] },
    { name: "가족·이웃·우정", count: "1,247", lines: ["가족과 친구 이야기를", "영어 동화로 만나보세요."], stories: [
        { title: "샘과 강아지 럭키", src: "https://img.littlefox.co.kr/static/contents/series/FS0014/featured.jpg" },
        { title: "개구쟁이 리키", src: "https://img.littlefox.co.kr/static/contents/series/FS0036/featured.jpg" },
        { title: "카터 패밀리", src: "https://img.littlefox.co.kr/static/contents/series/FS0067/featured.jpg" },
        { title: "하나의 앨범", src: "https://img.littlefox.co.kr/static/contents/series/FS0027/featured.jpg" },
        { title: "놀라운 발명가 이기", src: "https://img.littlefox.co.kr/static/contents/series/FS0066/featured.jpg" },
        { title: "윌로우크릭 쌍둥이", src: "https://img.littlefox.co.kr/static/contents/series/FS0048/featured.jpg" },
        { title: "기찻길 옆 아이들", src: "https://img.littlefox.co.kr/static/contents/series/FS0030/featured.jpg" },
        { title: "작은 신사들", src: "https://img.littlefox.co.kr/static/contents/series/FS0108/featured.jpg" },
        { title: "작은 아씨들", src: "https://img.littlefox.co.kr/static/contents/series/FS0040/featured.jpg" },
        { title: "가족", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00024/featured.jpg" },
        { title: "이웃", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00025/featured.jpg" },
        { title: "안전 & 기타", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00026/featured.jpg" },
        { title: "안녕 컵케이크!", src: "https://img.littlefox.co.kr/static/contents/series/FS0172/featured.jpg" },
        { title: "공룡 친구들", src: "https://img.littlefox.co.kr/static/contents/series/FS0102/featured.jpg" },
        { title: "배트와 친구들", src: "https://img.littlefox.co.kr/static/contents/series/FS0056/featured.jpg" },
        { title: "버드와 킵의 하루", src: "https://img.littlefox.co.kr/static/contents/series/FS0064/featured.jpg" },
        { title: "말하는 강아지 네로", src: "https://img.littlefox.co.kr/static/contents/series/FS0183/featured.jpg" },
        { title: "사우스 스트릿 스쿨", src: "https://img.littlefox.co.kr/static/contents/series/FS0054/featured.jpg" },
        { title: "버드나무에 부는 바람", src: "https://img.littlefox.co.kr/static/contents/series/FS0046/featured.jpg" },
        { title: "에버그린 캠프", src: "https://img.littlefox.co.kr/static/contents/series/FS0178/featured.jpg" },
        { title: "하이디", src: "https://img.littlefox.co.kr/static/contents/series/FS0035/featured.jpg" },
        { title: "지구에 온 앨리", src: "https://img.littlefox.co.kr/static/contents/series/FS0117/featured.jpg" },
        { title: "빨간 머리 앤", src: "https://img.littlefox.co.kr/static/contents/series/FS0033/featured.jpg" },
        { title: "우정", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00027/featured.jpg" }
    ] },
    { name: "인물·역사", count: "371", lines: ["사람의 삶과 역사 속 이야기를", "영어 동화로 만나보세요."], stories: [
        { title: "역사 속의 슈퍼스타", src: "https://img.littlefox.co.kr/static/contents/series/FS0109/featured.jpg" },
        { title: "뉴스 속의 인물들", src: "https://img.littlefox.co.kr/static/contents/series/FS0075/featured.jpg" },
        { title: "과학자 & 발명가", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00028/featured.jpg" },
        { title: "기업가 & 선구자", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00029/featured.jpg" },
        { title: "예술가 & 작가", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00030/featured.jpg" },
        { title: "환경 & 인권 운동가", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00031/featured.jpg" },
        { title: "지도자", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00032/featured.jpg" },
        { title: "사진 여행: 역사 속으로", src: "https://img.littlefox.co.kr/static/contents/series/FS0042/featured.jpg" },
        { title: "할아버지의 역사 이야기", src: "https://img.littlefox.co.kr/static/contents/series/FS0050/featured.jpg" },
        { title: "나의 삶: 역사 속의 직업들", src: "https://img.littlefox.co.kr/static/contents/series/FS0023/featured.jpg" },
        { title: "세계를 뒤흔든 재난", src: "https://img.littlefox.co.kr/static/contents/series/FS0063/featured.jpg" },
        { title: "세계 역사", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00033/featured.jpg" },
        { title: "문화 역사", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00034/featured.jpg" }
    ] },
    { name: "과학·자연·예술·문화", count: "254", lines: ["과학, 자연, 예술과 문화를", "영어 동화로 만나보세요."], stories: [
        { title: "큐티의 과학 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0047/featured.jpg" },
        { title: "지구 & 우주", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00035/featured.jpg" },
        { title: "기술", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00036/featured.jpg" },
        { title: "인체 & 건강", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00037/featured.jpg" },
        { title: "날씨 & 계절", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00038/featured.jpg" },
        { title: "환경", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00039/featured.jpg" },
        { title: "식물", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00040/featured.jpg" },
        { title: "놀라운 세계 명소", src: "https://img.littlefox.co.kr/static/contents/series/FS0057/featured.jpg" },
        { title: "유럽 & 아프리카", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00050/featured.jpg" },
        { title: "아시아 & 아메리카", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00051/featured.jpg" },
        { title: "스포트라이트", src: "https://img.littlefox.co.kr/static/contents/series/FS0098/featured.jpg" },
        { title: "예술", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00047/featured.jpg" },
        { title: "문화", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00048/featured.jpg" },
        { title: "명절 & 기념일", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00049/featured.jpg" }
    ] },
    { name: "파닉스·읽기 학습", count: "471", lines: ["소리와 글자를 익히는 이야기를", "영어 동화로 만나보세요."], stories: [
        { title: "ABC 북", src: "https://img.littlefox.co.kr/static/contents/series/FS0070/featured.jpg" },
        { title: "워드 패밀리", src: "https://img.littlefox.co.kr/static/contents/series/FS0071/featured.jpg" },
        { title: "제인과 핍의 달콤한 모험", src: "https://img.littlefox.co.kr/static/contents/series/FS0179/featured.jpg" },
        { title: "레터팀", src: "https://img.littlefox.co.kr/static/contents/series/FS0118/featured.jpg" },
        { title: "파닉스 스토리 1", src: "https://img.littlefox.co.kr/static/contents/series/FS0111/featured.jpg" },
        { title: "파닉스 스토리 2", src: "https://img.littlefox.co.kr/static/contents/series/FS0112/featured.jpg" },
        { title: "블롭들", src: "https://img.littlefox.co.kr/static/contents/series/FS0127/featured.jpg" },
        { title: "나는 어디에 있을까요?", src: "https://img.littlefox.co.kr/static/contents/series/FS0080/featured.jpg" },
        { title: "나는 누구일까요?", src: "https://img.littlefox.co.kr/static/contents/series/FS0081/featured.jpg" },
        { title: "초록 숲 친구들", src: "https://img.littlefox.co.kr/static/contents/series/FS0073/featured.jpg" },
        { title: "나의 첫 영어책 1", src: "https://img.littlefox.co.kr/static/contents/series/FS0128/featured.jpg" },
        { title: "나의 첫 영어책 2", src: "https://img.littlefox.co.kr/static/contents/series/FS0129/featured.jpg" },
        { title: "나의 첫 영어책 3", src: "https://img.littlefox.co.kr/static/contents/series/FS0130/featured.jpg" }
    ] },
    { name: "생활영어", count: "353", lines: ["일상에서 쓰는 표현을", "영어 동화로 만나보세요."], stories: [
        { title: "켈리 선생님반 아이들", src: "https://img.littlefox.co.kr/static/contents/series/FS0011/featured.jpg" },
        { title: "옛날이야기 마법 헛간", src: "https://img.littlefox.co.kr/static/contents/series/FS0123/featured.jpg" },
        { title: "개구쟁이 리키", src: "https://img.littlefox.co.kr/static/contents/series/FS0036/featured.jpg" },
        { title: "매직 마커", src: "https://img.littlefox.co.kr/static/contents/series/FS0012/featured.jpg" },
        { title: "하나의 앨범", src: "https://img.littlefox.co.kr/static/contents/series/FS0027/featured.jpg" }
    ] },
    { name: "기초 학습", count: "141", lines: ["처음 영어를 만나는 이야기를", "영어 동화로 만나보세요."], stories: [
        { title: "숫자 & 시간", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00052/featured.jpg" },
        { title: "모양 & 색깔", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00053/featured.jpg" },
        { title: "동물", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00054/featured.jpg" },
        { title: "음식 & 물건", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00055/featured.jpg" },
        { title: "직업 & 장소", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00056/featured.jpg" },
        { title: "신체 & 안전", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00057/featured.jpg" },
        { title: "날씨 & 계절", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00058/featured.jpg" },
        { title: "놀이 & 활동", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00059/featured.jpg" },
        { title: "반대 & 비교", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00060/featured.jpg" },
        { title: "가족 & 기타", src: "https://img.littlefox.co.kr/static/contents/topic/SRV00061/featured.jpg" }
    ] }
];

// 주제 버튼·편수·작품 제목은 storiesTopicData만 쓴다
storiesTopics.querySelector(".stories-topics-chips").replaceChildren(...storiesTopicData.map((topic, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = topic.name;
    if (!index) button.classList.add("is-active");
    button.setAttribute("aria-pressed", index ? "false" : "true");
    return button;
}));
storiesTopicButtons = [...storiesTopics.querySelectorAll(".stories-topics-chips button")];
setStoriesTopic(0);

function storiesVisibleStories() {
    const stories = storiesTopicData[storiesTopicIndex].stories;
    return storiesTopicLabels.map((_, labelIndex) => stories[(storiesTopicOffset + labelIndex) % stories.length]);
}

function applyStoriesTopicSlides(animate) {
    const visible = storiesVisibleStories();
    storiesTopicLabels.forEach((label, labelIndex) => {
        label.textContent = visible[labelIndex].title;
    });
    if (!storiesCast.length) return;
    storiesCast.forEach((thumb, thumbIndex) => {
        thumb.src = visible[thumbIndex].src;
    });
    if (animate) gsap.fromTo(storiesCast, { opacity: .2 }, { opacity: 1, duration: .35, overwrite: "auto" });
}

function setStoriesTopic(index) {
    const topic = storiesTopicData[index];
    if (!topic) return;
    storiesTopicIndex = index;
    storiesTopicOffset = 0;
    storiesTopicButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === index;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    storiesTopicName.textContent = topic.name;
    storiesTopicCount.textContent = topic.count;
    storiesTopicDesc.replaceChildren();
    topic.lines.forEach((line, lineIndex) => {
        if (lineIndex) storiesTopicDesc.append(document.createElement("br"));
        storiesTopicDesc.append(line);
    });
    applyStoriesTopicSlides(storiesCast.length > 0);
}

function moveStoriesTopic(dir) {
    const total = storiesTopicData[storiesTopicIndex].stories.length;
    storiesTopicOffset = (storiesTopicOffset + dir + total) % total;
    applyStoriesTopicSlides(true);
}

storiesTopics.querySelector(".stories-topics-chips").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !storiesTopics.classList.contains("is-ready") || button.classList.contains("is-active")) return;
    const index = storiesTopicButtons.indexOf(button);
    if (index < 0) return;
    setStoriesTopic(index);
});

storiesTopics.querySelector(".stories-topics-nav").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !storiesTopics.classList.contains("is-ready")) return;
    moveStoriesTopic(Number(button.dataset.dir));
});

function storiesSlotPoints() {
    const root = stories.getBoundingClientRect();
    const originX = root.left + root.width / 2;
    const originY = root.top + root.height / 2;
    return [...storiesTopics.querySelectorAll(".stories-slot-frame")].map(frame => {
        const rect = frame.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - originX,
            y: rect.top + rect.height / 2 - originY,
            w: rect.width,
            h: rect.height
        };
    });
}

let storiesSlotCache = null;

function storiesSettledSlots() {
    if (storiesSlotCache && storiesSlotCache.length && storiesSlotCache[0].w > 2) return storiesSlotCache;
    const y = gsap.getProperty(storiesTopics, "y");
    gsap.set(storiesTopics, { visibility: "visible", y: 0 });
    const points = storiesSlotPoints();
    gsap.set(storiesTopics, { y: y || 0 });
    if (!points.length || points[0].w < 2) return points;
    storiesSlotCache = points;
    return points;
}

function storiesEnsureCast() {
    if (storiesCast.length) return storiesSettledSlots();
    const points = storiesSettledSlots();
    if (!points.length) return [];
    const away = new Set(storiesSideFlyThumbs(new Set(storiesChartCoverThumbs()), new Set(storiesLevelsCoverThumbs())));
    const targetY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    storiesCast = storiesPickCast(points.length, targetY, storiesThumbs.filter(thumb => !away.has(thumb)));
    applyStoriesTopicSlides(false);
    return points;
}

function storiesReleaseCast() {
    if (!storiesCast.length) return;
    storiesCast.forEach(thumb => {
        gsap.set(thumb, {
            clearProps: "zIndex",
            width: Number(thumb.dataset.w),
            height: Number(thumb.dataset.h),
            borderRadius: 8
        });
        if (thumb.dataset.src) thumb.src = thumb.dataset.src;
    });
    storiesCast = [];
}
function storiesPickCast(count, targetY, source) {
    const visible = (source || storiesThumbs).filter(thumb => thumb.dataset.inner !== "1" && thumb.dataset.wide !== "1");
    const pool = visible.length >= count ? visible : storiesThumbs;
    const nearest = [...pool].sort((a, b) => {
        const delta = Math.abs(Number(a.dataset.y) - targetY) - Math.abs(Number(b.dataset.y) - targetY);
        return delta || Number(a.dataset.x) - Number(b.dataset.x);
    }).slice(0, Math.max(count * 4, count));
    nearest.sort((a, b) => Number(a.dataset.x) - Number(b.dataset.x));
    if (nearest.length <= count) return nearest;
    const picked = [];
    const used = new Set();
    for (let index = 0; index < count; index++) {
        let at = Math.round((index * (nearest.length - 1)) / Math.max(count - 1, 1));
        for (let guard = 0; used.has(at) && guard < nearest.length; guard++) at = (at + 1) % nearest.length;
        if (used.has(at)) break;
        used.add(at);
        picked.push(nearest[at]);
    }
    return picked;
}

function showStoriesTopics() {
    if (storiesStep !== 3 || switching) return;
    storiesStep = 4;
    switching = true;
    if (storiesTl) storiesTl.kill();

    gsap.set(storiesTopics, { visibility: "visible" });
    gsap.set(storiesTopicReveals, { opacity: 0, y: 16 });
    storiesGallery.style.zIndex = "4";
    storiesLevels.style.zIndex = "3";
    const points = storiesSlotPoints();
    const targetY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    storiesCast = storiesPickCast(points.length, targetY);
    applyStoriesTopicSlides(false);
    const rest = storiesThumbs.filter(thumb => !storiesCast.includes(thumb));

    storiesTl = gsap.timeline({
        onComplete: () => {
            storiesTopics.classList.add("is-ready");
            storiesTopics.setAttribute("aria-hidden", "false");
            gsap.set(storiesLevels, { visibility: "hidden" });
            gsap.set(rest, { opacity: 0 });
            switching = false; storiesFollow();
        }
    });
    storiesTl
        .to(storiesLevels, { opacity: 0, y: 14, duration: .32, ease: "power2.in" }, 0)
        .to(rest, {
            x: (_, thumb) => Number(thumb.dataset.x) * .9,
            y: (_, thumb) => Number(thumb.dataset.y) * .86,
            skewY: 0,
            rotation: 0,
            opacity: 0,
            scale: .9,
            duration: .62,
            ease: "power2.inOut"
        }, 0)
        .to(storiesTopicReveals, {
            opacity: 1,
            y: 0,
            duration: .55,
            ease: "power2.out",
            stagger: { each: .03 }
        }, .3);

    storiesCast.forEach((thumb, index) => {
        const point = points[index];
        storiesTl.to(thumb, {
            x: point.x,
            y: point.y,
            width: point.w,
            height: point.h,
            skewY: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            borderRadius: 14,
            zIndex: 8,
            duration: 1,
            ease: "power3.inOut"
        }, index * .04);
    });
}

function hideStoriesTopics() {
    if (storiesStep !== 4 || switching) return;
    switching = true;
    storiesTopicExit = true;
    storiesTopics.classList.remove("is-ready");
    storiesTopics.setAttribute("aria-hidden", "true");
    if (storiesTl) storiesTl.kill();

    const cast = storiesCast.slice();
    cast.forEach(thumb => { if (thumb.dataset.src) thumb.src = thumb.dataset.src; });
    const chartT = storiesChartT(storiesProgress);
    const levelsT = storiesLevelsT(storiesProgress);
    const chartCover = new Set(storiesChartCoverThumbs());
    const levelsCover = new Set(storiesLevelsCoverThumbs());
    const fly = new Set(storiesSideFlyThumbs(chartCover, levelsCover));
    const amountOf = thumb => storiesThumbAmount(thumb, chartT, levelsT, chartCover, levelsCover, fly);
    const rest = storiesThumbs.filter(thumb => !cast.includes(thumb));
    const returning = [];
    rest.forEach(thumb => {
        const amount = amountOf(thumb);
        if (amount > 0.02) storiesPlaceThumb(thumb, amount);
        else returning.push(thumb);
    });
    storiesHoldThumbs = new Set([...returning, ...cast]);
    storiesGallery.style.zIndex = "";
    storiesLevels.style.zIndex = "";
    gsap.set(storiesTopicReveals, { opacity: 0 });
    gsap.set(storiesTopics, { visibility: "hidden" });
    paintStoriesPanels(chartT, levelsT);

    storiesTl = gsap.timeline({
        onComplete: () => {
            cast.forEach(thumb => { thumb.style.zIndex = ""; });
            storiesCast = [];
            storiesHoldThumbs = null;
            storiesTopicExit = false;
            storiesStep = 3;
            switching = false; storiesFollow();
        }
    });
    if (returning.length) {
        storiesTl.to(returning, {
            x: (_, thumb) => Number(thumb.dataset.x),
            y: (_, thumb) => Number(thumb.dataset.y),
            skewY: (_, thumb) => Number(thumb.dataset.skew),
            rotation: 0,
            opacity: 1,
            scale: 1,
            duration: .55,
            ease: "power2.out"
        }, 0);
    }

    cast.forEach((thumb, index) => {
        const amount = amountOf(thumb);
        storiesTl.to(thumb, {
            x: Number(thumb.dataset.x),
            y: Number(thumb.dataset.y),
            width: Number(thumb.dataset.w),
            height: Number(thumb.dataset.h),
            skewY: Number(thumb.dataset.skew),
            rotation: 0,
            scale: 1 - amount * 0.14,
            opacity: 1 - amount,
            borderRadius: 8,
            duration: .72,
            ease: "power3.inOut"
        }, index * .03);
    });
}

resetStories();

const storiesReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function storiesSplit(self) {
    const total = self.end - self.start;
    const extra = window.innerHeight * 1.2;
    const main = Math.max(window.innerHeight, total - extra);
    const y = self.progress * total;
    return {
        main: clamp(y / main, 0, 1),
        exit: clamp((y - main) / extra, 0, 1)
    };
}

function paintStoriesExit(exit) {
    if (!storiesStage) return;
    const iris = clamp(exit / STORIES_IRIS_END, 0, 1);
    if (exit <= 0) {
        gsap.set(storiesStage, { clearProps: "clipPath,opacity" });
        gsap.set(stories, { backgroundColor: "#fff" });
        storiesStage.style.pointerEvents = "";
        return;
    }
    const radius = lerp(Math.hypot(window.innerWidth, window.innerHeight) * 0.5, 5, iris);
    const ink = clamp(iris / 0.18, 0, 1);
    gsap.set(storiesStage, {
        clipPath: `circle(${radius}px at 50% 50%)`,
        opacity: iris >= 0.98 ? 0 : 1
    });
    gsap.set(stories, {
        backgroundColor: gsap.utils.interpolate("#ffffff", "#111111", ink)
    });
    storiesStage.style.pointerEvents = "none";
}

function syncStoriesScroll(self) {
    const split = storiesSplit(self);
    storiesProgress = split.main;
    if (!storiesGalleryArmed && storiesScrolledIn(self) >= STORIES_GALLERY_SCROLL) {
        storiesGalleryArmed = true;
    }
    const galleryIntro = storiesStep === 0 || (switching && storiesStep === 1 && !storiesTopicExit);
    if (storiesGalleryArmed && storiesChartT(storiesProgress) > 0 && galleryIntro) {
        settleStoriesGallery();
    }
    storiesWant = storiesGalleryArmed ? 1 : 0;
    storiesFollow();
    if (storiesTopicExit || (storiesGalleryArmed && (storiesStep === 1 || switching))) {
        paintStoriesPanels(storiesChartT(storiesProgress), storiesLevelsT(storiesProgress), storiesTopicsT(storiesProgress), !switching || storiesTopicExit);
    }
    paintStoriesExit(split.exit);
    placeScrollDotFromExit(split.exit);
    paintScrollConnector();
}

if (!storiesReduce) {
    const storiesTrigger = ScrollTrigger.create({
        trigger: storiesScroll,
        start: "top top",
        end: "bottom bottom",
        onLeaveBack: disarmStoriesGallery,
        onUpdate: syncStoriesScroll
    });
    if (storiesTrigger.isActive) syncStoriesScroll(storiesTrigger);
}

}

function scrollDrawLengths() {
    const noteLen = scrollDrawPath ? scrollDrawPath.getTotalLength() : 0;
    const lpLen = scrollLpPath ? scrollLpPath.getTotalLength() : 0;
    return { noteLen, lpLen, total: noteLen + lpLen || 1 };
}

function scrollDotPoint(progress) {
    if (!scrollDrawPath) return null;
    const { noteLen, lpLen, total } = scrollDrawLengths();
    const dist = total * clamp(progress, 0, 1);
    const path = scrollLpPath && dist > noteLen ? scrollLpPath : scrollDrawPath;
    const localT = path === scrollDrawPath ? (noteLen ? dist / noteLen : 0) : (lpLen ? (dist - noteLen) / lpLen : 1);
    const point = path.getPointAtLength(path.getTotalLength() * clamp(localT, 0, 1));
    const local = path.ownerSVGElement.createSVGPoint();
    local.x = point.x;
    local.y = point.y;
    const ctm = path.getScreenCTM();
    if (!ctm) return null;
    return local.matrixTransform(ctm);
}

function placeScrollDot(progress) {
    const screen = scrollDotPoint(progress);
    if (!screen || !scrollDot) return;
    gsap.set(scrollDot, { x: screen.x, y: screen.y, opacity: 1, scale: 1 });
}

function connectorGrow() {
    if (!storiesScroll || !scrollDrawSvg) return 0;
    const scroll = window.scrollY;
    const sectionTop = storiesScroll.getBoundingClientRect().top + scroll;
    const total = storiesScroll.offsetHeight - window.innerHeight;
    const extra = window.innerHeight * 1.2;
    const main = Math.max(window.innerHeight, total - extra);
    const growStart = sectionTop + main + extra * STORIES_IRIS_END;
    const growEnd = scrollDrawSvg.getBoundingClientRect().top + scroll - window.innerHeight * 0.8;
    if (growEnd <= growStart) return scroll >= growEnd ? 1 : 0;
    return clamp((scroll - growStart) / (growEnd - growStart), 0, 1);
}

function alignScrollDraw() {
    if (!scrollDrawSvg) return;
    const width = scrollDrawSvg.getBoundingClientRect().width;
    if (!width) return;
    const shift = width / 2 - (493 / 941) * width;
    scrollDrawSvg.style.transform = `translate(${shift}px, ${scrollDrawHold}px)`;
}

function updateRecordHold() {
    if (scrollDrawMeasuring || !scrollDrawSvg || !scrollLpPath) {
        scrollDrawHold = 0;
        return;
    }
    const rect = scrollDrawSvg.getBoundingClientRect();
    const docTop = rect.top + window.scrollY - scrollDrawHold;
    const height = rect.height;
    if (!height) return;
    const { noteLen, total } = scrollDrawLengths();
    const noteShare = noteLen / total;
    const holdStart = noteShare + (1 - noteShare) * 0.56;
    const holdEnd = noteShare + (1 - noteShare) * 0.95;
    const start = docTop - window.innerHeight * 0.8;
    const end = docTop + height - window.innerHeight * 0.3;
    const recordOffset = (2072 / 2520) * height;
    const holdAt = progress => {
        const scroll = start + clamp(progress, 0, 1) * (end - start);
        const naturalCenter = docTop - scroll + recordOffset;
        return Math.max(0, window.innerHeight * 0.5 - naturalCenter);
    };
    if (scrollDrawProgress < holdStart) scrollDrawHold = 0;
    else if (scrollDrawProgress < holdEnd) scrollDrawHold = holdAt(scrollDrawProgress);
    else scrollDrawHold = holdAt(holdEnd);
}

function paintScrollConnector() {
    if (!scrollStem || !scrollDrawPath || !stories || reduceMotion) return;
    updateRecordHold();
    alignScrollDraw();
    const pathStart = scrollDotPoint(0);
    if (!pathStart) return;
    const grow = connectorGrow();
    const originY = stories.getBoundingClientRect().top + stories.clientHeight / 2;
    const tipY = lerp(originY, pathStart.y, grow);
    const top = Math.min(originY, tipY);
    const height = Math.abs(tipY - originY);
    const width = scrollDrawSvg.getBoundingClientRect().width;
    gsap.set(scrollStem, {
        x: pathStart.x,
        y: top,
        xPercent: -50,
        height: Math.max(0, height),
        width: width ? 2.4 * width / 1180 : 2,
        opacity: grow > 0.001 && height > 1 ? 1 : 0
    });
    if (!scrollDot || scrollDrawActive || grow <= 0 || scrollDrawProgress >= 1) return;
    gsap.set(scrollDot, { x: pathStart.x, y: tipY, opacity: 1, scale: 1 });
}

function placeScrollDotFromExit(exit) {
    if (!scrollDot || scrollDrawActive || connectorGrow() > 0) return;
    const iris = clamp(exit / STORIES_IRIS_END, 0, 1);
    if (iris < 0.92) {
        gsap.set(scrollDot, { opacity: 0 });
        return;
    }
    const pathStart = scrollDotPoint(0);
    gsap.set(scrollDot, {
        x: pathStart ? pathStart.x : window.innerWidth / 2,
        y: window.innerHeight / 2,
        opacity: 1,
        scale: 1
    });
}

function exitStrokeWidth() {
    const width = scrollDrawSvg ? scrollDrawSvg.getBoundingClientRect().width : 0;
    return width ? 2.5 * width / 941 : 2;
}

function drawEndScroll() {
    const rect = scrollDrawSvg.getBoundingClientRect();
    const top = rect.top + window.scrollY - scrollDrawHold;
    return top + rect.height - window.innerHeight * 0.3;
}

function hideScrollExit() {
    if (scrollExitPath) scrollExitPath.style.opacity = "0";
    if (scrollExitStem) gsap.set(scrollExitStem, { opacity: 0, height: 0 });
    if (scrollBloom) gsap.set(scrollBloom, { opacity: 0, scale: 1 });
    if (scrollDot && scrollDrawProgress >= 0.995) gsap.set(scrollDot, { opacity: 0, scale: 1 });
}

function paintScrollExit() {
    if (!scrollExitPath || !scrollDrawPath || !scrollOpen || reduceMotion) return;
    const openRect = scrollOpen.getBoundingClientRect();
    if (scrollDrawProgress < 0.995 || openRect.bottom < 0) {
        hideScrollExit();
        return;
    }

    const end = scrollDotPoint(1);
    const prev = scrollDotPoint(0.992);
    if (!end) return;

    const scroll = window.scrollY;
    const pageEndY = end.y + scroll;
    const centerX = window.innerWidth / 2;
    const start = drawEndScroll();
    const openTop = openRect.top + scroll;
    const available = Math.max(window.innerHeight * 0.34, openTop - start);
    const curveScroll = Math.min(window.innerHeight * 0.16, available * 0.42);
    const endY0 = pageEndY - start;
    const drop = Math.max(window.innerHeight * 0.28, window.innerHeight * 0.36 - endY0 + curveScroll);
    const pageArriveY = pageEndY + drop;
    const handle = Math.min(Math.max(drop, 80) * 0.46, window.innerHeight * 0.42);
    const leave = Math.min(110, handle);
    let leaveX = 0;
    let leaveY = 1;
    if (prev) {
        const dx = end.x - prev.x;
        const dy = end.y - prev.y;
        const mag = Math.hypot(dx, dy) || 1;
        leaveX = dx / mag;
        leaveY = dy / mag;
    }

    const yOf = pageY => pageY - scroll;
    const endScreenY = yOf(pageEndY);
    const stroke = exitStrokeWidth();
    const bridgeOverlap = Math.max(12, stroke * 4);
    const bridgeStart = Math.min(endScreenY, openRect.top) - bridgeOverlap;
    scrollExitPath.setAttribute("d", `M ${end.x} ${bridgeStart} L ${end.x} ${endScreenY} C ${end.x + leaveX * leave} ${endScreenY + leaveY * leave} ${centerX} ${yOf(pageArriveY - handle)} ${centerX} ${yOf(pageArriveY)}`);
    const length = scrollExitPath.getTotalLength() || 1;
    const bridgeLen = Math.min(length, Math.max(0, endScreenY - bridgeStart));
    const curveT = clamp((scroll - start) / curveScroll, 0, 1);
    const drawn = bridgeLen + (length - bridgeLen) * curveT;
    scrollExitPath.style.strokeWidth = stroke + "px";
    scrollExitPath.style.strokeDasharray = `${length} ${length}`;
    scrollExitPath.style.strokeDashoffset = String(length - drawn);
    scrollExitPath.style.opacity = drawn > 1 ? "1" : "0";

    const straightT = clamp((scroll - (start + curveScroll)) / Math.max(1, available - curveScroll), 0, 1);
    const arriveY = yOf(pageArriveY);
    const tipY = lerp(pageArriveY, openTop + window.innerHeight / 2, straightT) - scroll;
    const stemHeight = Math.max(0, tipY - arriveY);
    const stemOverlap = stroke * 0.45;
    if (scrollExitStem) {
        scrollExitStem.style.width = stroke + "px";
        gsap.set(scrollExitStem, {
            x: centerX,
            y: arriveY - (curveT >= 1 ? stemOverlap : 0),
            xPercent: -50,
            height: stemHeight + (curveT >= 1 ? stemOverlap : 0),
            opacity: curveT >= 1 && stemHeight > 1 ? 1 : 0
        });
    }

    const travel = Math.max(1, scrollOpen.offsetHeight - window.innerHeight);
    const bloomT = clamp((scroll - openTop) / travel, 0, 1);
    const showBloom = scroll >= openTop && openRect.bottom > 0 && straightT >= 1;
    const cover = Math.hypot(window.innerWidth, window.innerHeight) / 12 * 1.08;
    if (scrollBloom) gsap.set(scrollBloom, { opacity: 0, scale: 1 });

    if (scrollDot && (!scrollDrawActive || scrollDrawProgress >= 1)) {
        if (showBloom) {
            gsap.set(scrollDot, {
                x: centerX,
                y: window.innerHeight / 2,
                scale: lerp(1, cover, bloomT),
                opacity: 1,
                transformOrigin: "50% 50%"
            });
        } else if (curveT < 1) {
            const tip = scrollExitPath.getPointAtLength(Math.min(length, drawn));
            gsap.set(scrollDot, { x: tip.x, y: tip.y, scale: 1, opacity: 1 });
        } else {
            gsap.set(scrollDot, { x: centerX, y: tipY, scale: 1, opacity: 1 });
        }
    }

    if (bloomT > 0.96) {
        scrollExitPath.style.opacity = "0";
        if (scrollExitStem) gsap.set(scrollExitStem, { opacity: 0 });
    }
    paintSong();
}

function setDrawOffset(path, offset) {
    if (!path) return;
    path.style.strokeDashoffset = offset;
    path.setAttribute("stroke-dashoffset", offset);
}

function initScrollDraw() {
    if (!scrollDrawSvg || !scrollDrawPath) return;
    if (scrollDot) document.body.appendChild(scrollDot);
    const paintDraw = (progress) => {
        scrollDrawProgress = progress;
        const { noteLen, total } = scrollDrawLengths();
        const noteShare = noteLen / total;
        if (!scrollLpPath || progress <= noteShare) {
            setDrawOffset(scrollDrawPath, String(1 - (noteShare ? progress / noteShare : 1)));
            setDrawOffset(scrollLpPath, "1");
            return;
        }
        setDrawOffset(scrollDrawPath, "0");
        setDrawOffset(scrollLpPath, String(1 - (progress - noteShare) / (1 - noteShare)));
    };

    if (reduceMotion) {
        paintDraw(1);
        return;
    }

    alignScrollDraw();
    ScrollTrigger.addEventListener("refreshInit", () => {
        scrollDrawMeasuring = true;
        scrollDrawHold = 0;
        alignScrollDraw();
    });
    const repaintScrollDraw = () => {
        scrollDrawMeasuring = false;
        const draw = ScrollTrigger.getAll().find(trigger => trigger.trigger === scrollDrawSvg && trigger.vars.end === "bottom 30%");
        if (draw) paintDraw(draw.progress);
        updateRecordHold();
        alignScrollDraw();
        paintScrollConnector();
        paintScrollExit();
    };
    ScrollTrigger.addEventListener("refresh", repaintScrollDraw);

    if (storiesScroll) {
        ScrollTrigger.create({
            trigger: storiesScroll,
            start: "top top",
            endTrigger: ".scroll-draw",
            end: "bottom top",
            onUpdate() {
                paintScrollConnector();
                paintScrollExit();
            }
        });
    }

    ScrollTrigger.create({
        trigger: ".scroll-draw",
        start: "top 80%",
        end: "bottom 30%",
        scrub: 1,
        onToggle(self) {
            scrollDrawActive = self.isActive;
            paintDraw(self.progress);
            updateRecordHold();
            alignScrollDraw();
            if (self.isActive) placeScrollDot(self.progress);
            paintScrollConnector();
            paintScrollExit();
        },
        onUpdate(self) {
            paintDraw(self.progress);
            updateRecordHold();
            alignScrollDraw();
            paintScrollConnector();
            paintScrollExit();
            if (self.progress < 1) placeScrollDot(self.progress);
        }
    });

    if (scrollOpen) {
        ScrollTrigger.create({
            trigger: ".scroll-draw",
            start: "bottom 30%",
            endTrigger: ".scroll-open",
            end: "bottom top",
            onUpdate: paintScrollExit
        });
    }
}

const songScroll = document.querySelector(".song-scroll");
const songStage = document.querySelector(".song-stage");
const songIntro = document.querySelector(".song-intro");
const songPlayer = document.querySelector(".song-player");
const songVinyl = document.querySelector(".song-vinyl");
const songVinylLabel = document.querySelector(".song-vinyl-label");
const songSleeve = document.querySelector(".song-sleeve");
const songSleeveName = document.querySelector(".song-sleeve-copy b");
const songSleeveCount = document.querySelector(".song-sleeve-copy span");
const songTopics = document.querySelector(".song-topics");
const songCatalog = [
    { name: "세계 유명 동요", count: 131, image: "images/song-thumb1.png" },
    { name: "율동 동요", count: 13, image: "images/song-thumb2.png" },
    { name: "리틀팍스 동화 주제가", label: "리틀팍스<br>동화 주제가", count: 16, image: "images/song-thumb3.png" },
    { name: "파닉스 송", count: 53, image: "images/song-thumb4.png" },
    { name: "기초 학습", count: 37, image: "images/song-thumb5.png" },
    { name: "사이트 워드 송", count: 20, image: "images/song-thumb6.png" },
    { name: "생활 영어", count: 72, image: "images/song-thumb7.png" },
    { name: "자장가", count: 16, image: "images/song-thumb8.png" },
    { name: "크리스마스 & 핼러윈", label: "크리스마스<br>& 핼러윈", count: 34, image: "images/song-thumb9.png" }
];
let songIndex = 0;
let songOut = false;
let songTopicButtons = [];

function songSlideX() {
    return songVinyl ? songVinyl.offsetWidth * 0.72 : 0;
}

function showSong(index) {
    const song = songCatalog[index];
    if (!song) return;
    songIndex = index;
    if (songVinylLabel) songVinylLabel.src = song.image;
    if (songSleeveName) songSleeveName.textContent = song.name;
    if (songSleeveCount) songSleeveCount.textContent = `${song.count}곡`;
    songTopicButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === index;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });
}

function ejectSong() {
    if (!songVinyl) return;
    songOut = true;
    songVinyl.classList.add("is-out");
    gsap.to(songVinyl, { x: songSlideX(), duration: 0.85, ease: "power3.out", overwrite: "auto" });
}

function tuckSong() {
    if (!songVinyl) return;
    songOut = false;
    songVinyl.classList.remove("is-out");
    gsap.to(songVinyl, { x: 0, duration: 0.7, ease: "power3.inOut", overwrite: "auto" });
}

function chooseSong(index) {
    const same = index === songIndex;
    showSong(index);
    if (same && songOut) tuckSong();
    else if (songOut) gsap.fromTo(songVinyl, { x: songSlideX() * 0.82 }, { x: songSlideX(), duration: 0.45, ease: "power2.out", overwrite: "auto" });
    else ejectSong();
}

function paintSong() {
    if (!songScroll || !songIntro || !songPlayer || reduceMotion) return;
    const open = scrollOpen ? scrollOpen.getBoundingClientRect() : null;
    const openTop = open ? open.top + window.scrollY : 0;
    const travel = scrollOpen ? Math.max(1, scrollOpen.offsetHeight - window.innerHeight) : 1;
    const bloomT = open ? clamp((window.scrollY - openTop) / travel, 0, 1) : 0;
    const stageTop = songScroll.getBoundingClientRect().top;
    const dotScale = scrollDot ? Number(gsap.getProperty(scrollDot, "scale")) || 1 : 1;
    const dotX = scrollDot ? Number(gsap.getProperty(scrollDot, "x")) : 0;
    const dotY = scrollDot ? Number(gsap.getProperty(scrollDot, "y")) : 0;
    const dotAtCenter = Math.abs(dotX - window.innerWidth / 2) < 4 && Math.abs(dotY - window.innerHeight / 2) < 4;
    const covering = open && open.bottom > 0 && bloomT > 0 && dotAtCenter && Number(gsap.getProperty(scrollDot, "opacity")) > 0.5;
    if (covering) {
        if (songIntro.parentElement !== document.body) document.body.appendChild(songIntro);
        songIntro.classList.add("is-cover");
        gsap.set(songIntro, {
            xPercent: -50,
            yPercent: -50,
            y: 0,
            opacity: 1,
            clipPath: `circle(${6 * dotScale}px at 50% 50%)`
        });
        gsap.set(songPlayer, { opacity: 0, y: 48, pointerEvents: "none" });
        return;
    }
    if (songStage && songIntro.parentElement !== songStage) songStage.insertBefore(songIntro, songPlayer);
    if (songIntro.classList.contains("is-cover")) {
        songIntro.classList.remove("is-cover");
        gsap.set(songIntro, { clearProps: "transform,clipPath" });
    }
    const range = Math.max(1, songScroll.offsetHeight - window.innerHeight);
    const playerT = clamp(-stageTop / range, 0, 1);
    const introT = clamp(1 - playerT / 0.5, 0, 1);
    const showPlayer = clamp((playerT - 0.34) / 0.42, 0, 1);
    gsap.set(songIntro, { opacity: introT, y: (1 - introT) * -40 });
    gsap.set(songPlayer, {
        opacity: showPlayer,
        y: (1 - showPlayer) * 56,
        pointerEvents: showPlayer > 0.85 ? "auto" : "none"
    });
}

function initSong() {
    if (!songTopics || !songVinyl) return;
    songTopics.innerHTML = songCatalog.map((song, index) => `
        <button type="button" class="song-topic${index ? "" : " is-active"}" aria-pressed="${index ? "false" : "true"}">
            <img src="${song.image}" alt="">
            <span>${song.label || song.name}</span>
            <b>${song.count}곡</b>
        </button>
    `).join("");
    songTopicButtons = [...songTopics.children];
    songTopicButtons.forEach((button, index) => {
        button.addEventListener("click", () => chooseSong(index));
    });
    if (songSleeve) {
        songSleeve.addEventListener("click", () => {
            if (songOut) tuckSong();
            else ejectSong();
        });
    }
    if (reduceMotion) return;
    paintSong();
    if (songScroll) {
        ScrollTrigger.create({
            trigger: ".scroll-open",
            start: "top bottom",
            endTrigger: ".song-scroll",
            end: "bottom bottom",
            onUpdate: paintSong
        });
    }
}

initSong();
initScrollDraw();
