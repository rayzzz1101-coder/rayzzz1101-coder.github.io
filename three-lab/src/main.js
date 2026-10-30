import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { gsap } from "gsap";
import {
  createWaxSealModel,
  disposeWaxSealModel,
} from "./wax-seal-model.js";

// 从这里开始修改。保存后，Vite 会自动刷新页面。
const SETTINGS = {
  background: 0xf4f1e9,
  envelopeWidth: 1.88,
  envelopeHeight: 1.18,
  envelopeDepth: 0.032,
  envelopeFrontBulge: 0.058,
  envelopeBackBulge: 0.029,
  flapThickness: 0.011,
  flapOpenAngle: -3.34,
  letterSlotZ: 0.19,
  cornerRadius: 0.007,
  flapHeight: 0.54,
  letterWidth: 1.22,
  letterHeight: 1.5,
  letterBulge: 0.072,
  letterGrain: 0.012,
  restRotationX: -0.14,
  restRotationY: -0.24,
  followSpeed: 7.5,
  dragSpeed: 0.0045,
  cameraZ: 5.15,
  desktopPixelRatioCap: 1.5,
  mobilePixelRatioCap: 1.5,
};

const PROJECTS = [
  {
    title: "写下片刻的意义",
    type: "FIELD NOTE / MEMORY & WRITING",
    keySentence: ["有些感受", "值得被留下。"],
    keyWords: "日常 / 记录 / 记忆",
    keySentenceEn: "Hold the moment before it fades.",
    number: "01 / 06",
    paper: "#e7d9c1",
    paperDeep: "#bfa77f",
    ink: "#302f2a",
    accent: "#a74d39",
    wax: "#8b382a",
    wear: 0.16,
    grain: 0.35,
    readerLayout: "field",
    date: "2026.10.18",
    images: [
      "/note-images/01-desk.jpg",
      "/note-images/01-waterfront.jpg",
    ],
    imageAlts: [
      "桌面上的电脑、纸张和散落的小物件。",
      "海边的城市天际线与往来的人群。",
    ],
    imageCaptions: [
      "桌上的晶格草稿 / OCT 02",
      "从海滨回望城市 / OCT 03",
    ],
    readerQuote: "普通的下午，也值得留下一点证据。",
    readerQuoteNote: "记录不必等到故事完整。",
    readerEmphasis: ["先写下一个片段", "普通的下午也值得留下一点证据。"],
    intro: "有些感受如果没有及时写下来，过一阵子就只剩下模糊的轮廓。所以我想先给它们留一个位置。",
    body: [
      "有时候很想把心里的事情说出来，真正落到文字上，却只剩下一些零散的词。记忆不是一份可靠的档案。",
      "阴天里听见的歌、路上突然想到的问题、某一个很轻的瞬间，如果当时没有记下，之后往往就再也找不回来了。普通的下午也值得留下一点证据。",
      "所以记录不一定要等到故事完整。先写下一个片段，等时间过去以后，再回来看看它长成了什么样子。",
    ],
    signature: "Ray / Notes",
  },
  {
    title: "鼓点落在心口上",
    type: "FIELD NOTE / LIVE SOUND",
    keySentence: ["让鼓点", "落在心口。"],
    keyWords: "演唱会 / 声音 / 心动",
    keySentenceEn: "Let drums land in your heart.",
    number: "02 / 06",
    paper: "#dec9a5",
    paperDeep: "#ad8960",
    ink: "#342c28",
    accent: "#994036",
    wax: "#7a3326",
    wear: 0.28,
    grain: 0.46,
    readerLayout: "stage",
    date: "2026.07.19",
    images: [
      "/note-images/02-stage-sign.jpg",
      "/note-images/02-stage-wide.jpg",
    ],
    imageAlts: [
      "演唱会现场红色灯光中的舞台字样。",
      "夜晚演唱会舞台、灯光和人群。",
    ],
    imageCaptions: [
      "红色灯牌与开场前的心跳 / JUL 19",
      "灯光亮起时的全场 / JUL 19",
    ],
    readerQuote: "音乐不一定会回答什么，但它让说不清的情绪有了形状。",
    readerQuoteNote: "LIVE NOTE / 声音仍在胸腔里回响。",
    readerEmphasis: ["鼓和贝斯震动胸腔的感觉", "一片短暂发亮的星空"],
    intro: "第一次在现场听见鼓和贝斯震动胸腔，那个晚上，声音不再只是被耳朵听见。",
    body: [
      "走进场馆的时候，灯光、座位和声音一起涌过来。我原本以为自己不会哭，事实证明我错了。",
      "我已经很久没有体验到，鼓和贝斯震动胸腔的感觉了。当时已经分不清，这到底是密集的鼓点，还是我不断跳动的心。",
      "灯全部亮起来的时候，场馆像一片短暂发亮的星空。音乐不一定会回答什么，但它让一些说不清楚的情绪，在那个晚上短暂地有了形状。",
    ],
    signature: "Ray / Notes",
  },
  {
    title: "一个人旅行时，我在想什么",
    type: "FIELD NOTE / TRAVEL & SOLITUDE",
    keySentence: ["把自己放远，", "再听见自己。"],
    keyWords: "旅行 / 独处 / 方向",
    keySentenceEn: "Step away to hear yourself again.",
    number: "03 / 06",
    paper: "#d2bb93",
    paperDeep: "#997453",
    ink: "#35332c",
    accent: "#87543f",
    wax: "#6d3024",
    wear: 0.4,
    grain: 0.58,
    readerLayout: "journey",
    date: "2026.07.06",
    images: [
      "/note-images/03-yellow-crane-ccw.jpg",
      "/note-images/03-bridge.jpg",
    ],
    imageAlts: [
      "夜晚灯光照亮的黄鹤楼。",
      "薄雾中横跨江面的桥梁与城市。",
    ],
    imageCaptions: [
      "夜色里的黄鹤楼 / MAY 18",
      "雾让桥线慢了下来 / MAY 19",
    ],
    readerQuote: "把自己放远，再听见自己。",
    readerQuoteNote: "旅行的目的，有时只是换一个地方思考。",
    readerEmphasis: ["把自己丢出去，再思考自己到底需要什么", "脚步反而变得更清楚。"],
    intro: "旅行不只是为了看景点。它更像一种把自己暂时放远，再重新思考生活方向的方式。",
    body: [
      "旅行可以按照自己的方式放松，更是一个可以思考自己的办法。不急着赶完所有景点，也不把每一分钟都安排得很满。",
      "走路、听歌、在陌生的地方吃饭，思绪反而会慢慢有自己的方向。与其没有意义地活着，不如把自己丢出去，再思考自己到底需要什么，为了什么。",
      "雾把远处的桥线擦得很淡，脚步反而变得更清楚。后来再回看这些照片，记住的不只是地标，而是当时一个人走路时，终于愿意认真听见的那些想法。",
    ],
    signature: "Ray / Notes",
  },
  {
    title: "朋友像一面镜子",
    type: "FIELD NOTE / FRIENDSHIP & GROWTH",
    keySentence: ["朋友是成长", "的一面镜子。"],
    keyWords: "朋友 / 成长 / 参照",
    keySentenceEn: "Friends mirror the growth within us.",
    number: "04 / 06",
    paper: "#c3a77c",
    paperDeep: "#856246",
    ink: "#3b3029",
    accent: "#8e583d",
    wax: "#784230",
    wear: 0.52,
    grain: 0.7,
    readerLayout: "portrait",
    date: "2025.09.27",
    images: ["/note-images/04-coffee.jpg"],
    imageAlts: ["四杯带有不同文字和图案拉花的饮品。"],
    imageCaptions: ["四杯不同的咖啡 / MAY 04"],
    readerQuote: "朋友有时确实会成为成长路上的参照。",
    readerQuoteNote: "一些影响，比告别留得更久。",
    readerEmphasis: ["在旁边演示一次、带着试一次", "朋友有时确实会成为成长路上的参照。"],
    intro: "朋友陪我度过一段时间，也让我愿意尝试原本不会碰的事情。那些影响通常比告别留得更久。",
    body: [
      "朋友在某一段时间里起到的作用，很难用一句“关系很好”概括。回头看，很多技能和兴趣都不是自己一个人突然学会的。",
      "游戏、钢琴、声乐、即兴配乐、乒乓球、编程，总有人在旁边演示一次、带着试一次，事情才慢慢进入我的生活。",
      "当跑步时有个领跑的朋友在前面破风，我在后面跟着，也就学习得更快了。朋友有时确实会成为成长路上的参照。",
    ],
    signature: "Ray / Notes",
  },
  {
    title: "一条不属于考级的路",
    type: "FIELD NOTE / MUSIC & COMING OF AGE",
    keySentence: ["让旋律", "先替我说。"],
    keyWords: "钢琴 / 音乐 / 表达",
    keySentenceEn: "Let melody speak before words arrive.",
    number: "05 / 06",
    paper: "#b69469",
    paperDeep: "#73523b",
    ink: "#39322d",
    accent: "#765143",
    wax: "#51342b",
    wear: 0.68,
    grain: 0.82,
    readerLayout: "score",
    date: "2025.09.25",
    images: [
      "/note-images/05-piano.jpg",
      "/note-images/05-piano-room.jpg",
    ],
    imageAlts: [
      "坐在钢琴前，看着面前亮起的屏幕。",
      "琴房里的黑色钢琴和微亮的屏幕。",
    ],
    imageCaptions: [
      "琴房里的片刻 / SEP 25",
      "光落在琴键之前 / SEP 25",
    ],
    readerQuote: "后来，我找到了一条属于自己的音乐路。",
    readerQuoteNote: "旋律先于语言，替我说出那些还没想好的事。",
    readerEmphasis: ["属于自己的音乐路", "音乐像一个陪了我很久的朋友。"],
    intro: "对钢琴的改观发生在某一天：琴声里的强弱突然有了情绪，也让我找到了一条不属于考级的路。",
    body: [
      "我对钢琴这件事改观，可能是小学最后一年。听到一首钢琴纯音乐时，突然对琴声里的强弱和情绪有了很深的共情。",
      "那之后，我找到了一条路，不属于考级的那条，属于自己的音乐路。练习结束以后，房间还留着声音的轮廓。",
      "唱歌这件事好像对我越来越重要。通过唱的方式，我好像能更好地表达自己的情绪。音乐像一个陪了我很久的朋友。",
    ],
    signature: "Ray / Notes",
  },
  {
    title: "写给未来的一封信",
    type: "FIELD NOTE / A LETTER TO THE FUTURE",
    keySentence: ["把此刻", "写给未来。"],
    keyWords: "书信 / 当下 / 未来",
    keySentenceEn: "Write this moment toward your future.",
    number: "06 / 06",
    paper: "#a9855f",
    paperDeep: "#654833",
    ink: "#352d29",
    accent: "#733e34",
    wax: "#44342e",
    wear: 0.84,
    grain: 0.94,
    readerLayout: "letter",
    date: "2025.08.30",
    images: [
      "/note-images/06-doodle.jpg",
      "/note-images/06-piano-light.jpg",
    ],
    imageAlts: [
      "灰色背景上的简笔笑脸小人画。",
      "钢琴前亮起的屏幕与落在琴房里的光。",
    ],
    imageCaptions: [
      "画在灰色背景上的小人 / AUG 30",
      "写给未来时的房间 / AUG 30",
    ],
    readerQuote: "虽然不够确定，却一直在努力理解生活。",
    readerQuoteNote: "给未来留话，并不是要求未来回答。",
    readerEmphasis: ["把回忆带给我的成长和感悟写下来", "现在的你虽然不够确定，却一直在努力理解生活。"],
    intro: "写给未来并不是为了预测答案，只是把此刻的犹豫、期待和仍然愿意相信的事留在纸上。",
    body: [
      "写给未来并不是因为我已经想清楚了。相反，是因为此刻还有太多不确定。长大以后，选择变多了，没有人再替你安排好下一步。",
      "喜欢什么、擅长什么、要去哪里，都慢慢变成需要自己回答的问题。我更希望把回忆带给我的成长和感悟写下来，而不是只记住某个人带来的快乐或悲伤。",
      "有些答案会变化，但坐在琴前的片刻是真实的。如果未来的你真的看到这些话，希望你还记得：现在的你虽然不够确定，却一直在努力理解生活。",
    ],
    signature: "Ray / To the future",
  },
];

const gallery = document.querySelector("#letter-gallery");
const canvasHost = document.querySelector("#canvas-host");
const heroCopy = document.querySelector(".hero-copy");
const heroHeadline = heroCopy.querySelector("h1");
const notePhotoStack = document.querySelector("#note-photo-stack");
const notePhotoPrimary = document.querySelector("#note-photo-primary");
const notePhotoSecondary = document.querySelector("#note-photo-secondary");
const notePhotoSecondaryFigure = notePhotoSecondary.closest("figure");
const keywordLabel = heroCopy.querySelector(".eyebrow");
const projectTitle = document.querySelector("#project-title");
const projectType = document.querySelector("#project-type");
const projectNumber = document.querySelector("#project-number");
const projectDate = document.querySelector("#project-date");
const keySentenceEnElement = document.querySelector("#key-sentence-en");
const readButton = document.querySelector("#read-letter");
const previousLetterButton = document.querySelector("#previous-letter");
const nextLetterButton = document.querySelector("#next-letter");
const mobileLetterButtons = [
  previousLetterButton,
  nextLetterButton,
].filter(Boolean);
const liveStatus = document.querySelector("#live-status");
const readerOverlay = document.querySelector("#reader-overlay");
const readerSheet = document.querySelector("#reader-sheet");
const readerScroll = document.querySelector("#reader-scroll");
const readerPaperFlow = document.querySelector("#reader-paper-flow");
const readerPhotoStrip = document.querySelector("#reader-photo-strip");
const readerToolbar = document.querySelector(".reader-toolbar");
const readerClose = document.querySelector("#reader-close");
const readerPosition = document.querySelector("#reader-position");
const readerArticle = document.querySelector("#reader-article");
const readerDate = document.querySelector("#reader-date");
const readerStamp = document.querySelector("#reader-stamp");
const readerKicker = document.querySelector("#reader-kicker");
const readerTitle = document.querySelector("#reader-title");
const readerSubtitle = document.querySelector("#reader-subtitle");
const readerType = document.querySelector("#reader-type");
const readerIntro = document.querySelector("#reader-intro");
const readerBody = document.querySelector("#reader-body");
const readerSignature = document.querySelector("#reader-signature");
const readerFooter = document.querySelector("#reader-footer");
const readerAccessCopy = document.querySelector("#reader-access-copy");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const isMobileQuery = window.matchMedia("(max-width: 640px)");
const isLandingMode = document.documentElement.dataset.mode === "landing";
const isNotesArrival =
  document.documentElement.dataset.arrival === "from-right";
const isHomeArrival =
  document.documentElement.dataset.homeArrival === "from-right";
const notesNavigationLinks = [
  ...document.querySelectorAll('a[href="/notes.html"]'),
];
const returnHomeButton = document.querySelector("#return-home");
const readerReturnHomeButton =
  document.querySelector("#reader-return-home");
const pageTransitionCover =
  document.querySelector("#page-transition-cover");
const notesArrivalText = [
  document.querySelector(".topbar"),
  document.querySelector(".hero-copy"),
  document.querySelector(".letter-meta"),
  document.querySelector(".drag-note"),
  document.querySelector(".page-footer"),
  document.querySelector(".notes-return"),
].filter(Boolean);
const homeArrivalText = [
  document.querySelector(".site-topbar"),
  document.querySelector(".hero-copy"),
  document.querySelector(".letter-meta"),
  document.querySelector(".drag-note"),
  document.querySelector(".page-footer"),
  document.querySelector(".side-note-entry"),
].filter(Boolean);
let awaitingNotesArrival = isNotesArrival;
let awaitingHomeArrival = isHomeArrival;
let isNotesTransitioning = false;

if (isNotesArrival) {
  sessionStorage.removeItem("ray:notes-transition");
}
if (isHomeArrival) {
  sessionStorage.removeItem("ray:home-transition");
}

const copyTextElements = [
  keywordLabel,
  heroHeadline,
  document.querySelector(".meta-label"),
  projectNumber,
  projectDate,
  document.querySelector(".technical-note"),
  readButton,
  keySentenceEnElement,
];
const interfaceLineElements = [
  document.querySelector(".rule"),
  document.querySelector(".drag-note > i"),
];

function splitCopyText(element) {
  if (element.dataset.copySplit === "true") {
    return;
  }
  const textNodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeValue.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  if (!element.hasAttribute("aria-label")) {
    element.setAttribute(
      "aria-label",
      element.textContent.replace(/\s+/g, " ").trim(),
    );
  }
  textNodes.forEach((textNode) => {
    const fragment = document.createDocumentFragment();
    [...textNode.nodeValue].forEach((character) => {
      if (/\s/.test(character)) {
        fragment.appendChild(document.createTextNode(" "));
        return;
      }
      const characterElement = document.createElement("span");
      characterElement.className = "copy-char";
      characterElement.setAttribute("aria-hidden", "true");
      characterElement.textContent = character;
      fragment.appendChild(characterElement);
    });
    textNode.replaceWith(fragment);
  });
  element.dataset.copySplit = "true";
  gsap.set(element.querySelectorAll(".copy-char"), {
    opacity: 0,
    x: -8,
    y: 12,
    filter: "blur(6px)",
    clipPath: "inset(0 100% 0 0)",
  });
}

function setCopyText(element, value) {
  if (element.dataset.copyValue === value) {
    return;
  }
  element.dataset.copyValue = value;
  element.removeAttribute("aria-label");
  element.textContent = value;
  element.dataset.copySplit = "false";
  splitCopyText(element);
}

function setNotePhotos(project) {
  notePhotoPrimary.src = project.images[0];
  notePhotoPrimary.alt = project.imageAlts[0];
  const hasSecondary = project.images.length > 1;
  notePhotoSecondaryFigure.hidden = !hasSecondary;
  if (hasSecondary) {
    notePhotoSecondary.src = project.images[1];
    notePhotoSecondary.alt = project.imageAlts[1];
  } else {
    notePhotoSecondary.removeAttribute("src");
    notePhotoSecondary.alt = "";
  }
}

function showNotePhotos() {
  const photos = [
    notePhotoPrimary.closest("figure"),
    notePhotoSecondaryFigure,
  ].filter((photo) => !photo.hidden);
  notePhotoStack.classList.add("is-visible");
  gsap.fromTo(
    notePhotoStack,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: reducedMotionQuery.matches ? 0.01 : 0.5,
      ease: "power2.out",
    },
  );
  gsap.fromTo(
    photos,
    { opacity: 0, y: 18, rotate: -1.5 },
    {
      opacity: 1,
      y: 0,
      rotate: (index) => (index === 0 ? 2.2 : -4.5),
      duration: reducedMotionQuery.matches ? 0.01 : 0.52,
      stagger: reducedMotionQuery.matches ? 0 : 0.08,
      ease: "power2.out",
    },
  );
}

function hideNotePhotos() {
  notePhotoStack.classList.remove("is-visible");
  gsap.killTweensOf([
    notePhotoStack,
    notePhotoPrimary.closest("figure"),
    notePhotoSecondaryFigure,
  ]);
  gsap.to(notePhotoStack, {
    opacity: 0,
    y: -12,
    duration: reducedMotionQuery.matches ? 0.01 : 0.2,
    ease: "power2.in",
  });
}

function setHeroKeySentence(lines) {
  const value = lines.join("|");
  if (heroHeadline.dataset.copyValue === value) {
    return;
  }
  heroHeadline.dataset.copyValue = value;
  heroHeadline.setAttribute("aria-label", lines.join(" "));
  heroHeadline.replaceChildren();
  lines.forEach((text, index) => {
    const line = document.createElement(index === 0 ? "span" : "em");
    line.textContent = text;
    heroHeadline.appendChild(line);
  });
  heroHeadline.dataset.copySplit = "false";
  splitCopyText(heroHeadline);
}

copyTextElements.forEach((element) => splitCopyText(element));
setNotePhotos(PROJECTS[0]);
gsap.set(interfaceLineElements, {
  opacity: 0,
  scaleX: 0,
  transformOrigin: "left center",
});

let copyMotionState = "idle";
let copyMotionTimeline = null;

function getCopyCharacters() {
  return [...document.querySelectorAll(".copy-char")]
    .filter(
      (element) =>
        element.isConnected && element.getClientRects().length > 0,
    )
    .sort((first, second) => {
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      return firstRect.top - secondRect.top || firstRect.left - secondRect.left;
    });
}

function revealInterfaceCopy() {
  if (copyMotionState === "visible") {
    return;
  }
  copyMotionState = "visible";
  copyMotionTimeline?.kill();
  const characters = getCopyCharacters();
  if (reducedMotionQuery.matches) {
    gsap.set(characters, {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      clipPath: "inset(0 0% 0 0)",
    });
    return;
  }
  copyMotionTimeline = gsap
    .timeline()
    .fromTo(
      characters,
      {
        opacity: 0,
        x: -8,
        y: 12,
        filter: "blur(6px)",
        clipPath: "inset(0 100% 0 0)",
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
        clipPath: "inset(0 0% 0 0)",
        duration: 0.4,
        stagger: 0.006,
        ease: "power3.out",
      },
    )
    .fromTo(
      interfaceLineElements,
      { opacity: 0, scaleX: 0, y: 8 },
      {
        opacity: 1,
        scaleX: 1,
        y: 0,
        duration: 0.46,
        stagger: 0.08,
        ease: "power2.out",
      },
      0.18,
    );
}

function dissolveInterfaceCopy() {
  if (copyMotionState === "hidden") {
    return;
  }
  copyMotionState = "hidden";
  copyMotionTimeline?.kill();
  const characters = getCopyCharacters().reverse();
  copyMotionTimeline = gsap
    .timeline()
    .to(characters, {
      opacity: 0,
      y: -16,
      filter: "blur(7px)",
      duration: reducedMotionQuery.matches ? 0.01 : 0.3,
      stagger: reducedMotionQuery.matches ? 0 : 0.003,
      ease: "power2.in",
    })
    .to(
      interfaceLineElements,
      {
        opacity: 0,
        scaleX: 0.18,
        y: -12,
        duration: reducedMotionQuery.matches ? 0.01 : 0.3,
        stagger: reducedMotionQuery.matches ? 0 : 0.08,
        ease: "power2.in",
      },
      0.04,
    );
}

function revealMobileLetterNav() {
  mobileLetterButtons.forEach((button) => {
    button.classList.remove("is-dissolving");
    button.classList.add("is-revealed");
  });
}

function dissolveMobileLetterNav() {
  mobileLetterButtons.forEach((button) => {
    button.classList.remove("is-revealed");
    button.classList.add("is-dissolving");
  });
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(0, 0, SETTINGS.cameraZ);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.setClearColor(SETTINGS.background, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.localClippingEnabled = true;
canvasHost.appendChild(renderer.domElement);
document.documentElement.classList.add("webgl-ready");

RectAreaLightUniformsLib.init();

const ambient = new THREE.AmbientLight(0xfff9ed, 1.45);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff3d8, 3.3);
keyLight.position.set(-4.2, 5.2, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 16;
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.012;
keyLight.shadow.radius = 4;
keyLight.shadow.blurSamples = 8;
scene.add(keyLight);
scene.add(keyLight.target);

const fillLight = new THREE.DirectionalLight(0xb6c9d9, 1.1);
fillLight.position.set(4, 1, 2);
scene.add(fillLight);

const paperReflectionLight = new THREE.RectAreaLight(0xffefd2, 7.5, 3.6, 2.1);
paperReflectionLight.position.set(-2.8, 3.5, 3.7);
paperReflectionLight.lookAt(0, 0, 0);
scene.add(paperReflectionLight);

const topLight = new THREE.RectAreaLight(0xffffff, 3.2, 5, 0.8);
topLight.position.set(0, 3.5, 2.8);
topLight.lookAt(0, 0, 0);
scene.add(topLight);

function createEnvironment(rendererInstance) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#fffdf7");
  gradient.addColorStop(0.46, "#b8b1a4");
  gradient.addColorStop(0.55, "#57534d");
  gradient.addColorStop(1, "#d8d0c2");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillRect(80, 50, 380, 28);
  context.fillRect(650, 85, 210, 14);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(rendererInstance);
  const target = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return target;
}

const environmentTarget = createEnvironment(renderer);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = 0.72;
scene.fog = new THREE.Fog(SETTINGS.background, 7, 13);

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function mixHexColors(start, end, amount) {
  const first = new THREE.Color(start);
  const second = new THREE.Color(end);
  return `#${first.lerp(second, amount).getHexString()}`;
}

function paintKraftBase(context, width, height, project, random) {
  const gradient = context.createLinearGradient(0, 0, width * 0.15, height);
  gradient.addColorStop(0, project.paper);
  gradient.addColorStop(0.56, mixHexColors(project.paper, project.paperDeep, 0.32));
  gradient.addColorStop(1, project.paperDeep);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const grainStrength = 4 + project.grain * 13;

  for (let index = 0; index < pixels.length; index += 4) {
    const noise = (random() - 0.5) * grainStrength;
    pixels[index] = Math.max(0, Math.min(255, pixels[index] + noise));
    pixels[index + 1] = Math.max(0, Math.min(255, pixels[index + 1] + noise * 0.92));
    pixels[index + 2] = Math.max(0, Math.min(255, pixels[index + 2] + noise * 0.74));
  }
  context.putImageData(image, 0, 0);

  const fibers = 760 + Math.round(project.grain * 820);
  for (let index = 0; index < fibers; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const length = 1.5 + random() * 17;
    context.lineWidth = 0.22 + random() * 0.42;
    context.strokeStyle = random() > 0.5
      ? `rgba(255,248,226,${0.025 + random() * 0.055})`
      : `rgba(84,58,35,${0.02 + random() * 0.045})`;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(
      x + length * 0.48,
      y + (random() - 0.5) * 2.2,
      x + length,
      y + (random() - 0.5) * 3.1,
    );
    context.stroke();
  }

  const wearMarks = Math.round(3 + project.wear * 22);
  for (let index = 0; index < wearMarks; index += 1) {
    const edge = Math.floor(random() * 4);
    const x = edge < 2 ? random() * width : edge === 2 ? random() * width * 0.18 : width * (0.82 + random() * 0.18);
    const y = edge < 2 ? (edge === 0 ? random() * height * 0.2 : height * (0.8 + random() * 0.2)) : random() * height;
    const radius = 6 + random() * (16 + project.wear * 24);
    const stain = context.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, `rgba(82,52,28,${0.035 + project.wear * 0.08})`);
    stain.addColorStop(1, "rgba(82,52,28,0)");
    context.fillStyle = stain;
    context.beginPath();
    context.ellipse(x, y, radius * (0.7 + random()), radius * 0.55, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  for (let index = 0; index < 2 + project.wear * 4; index += 1) {
    const startX = random() * width * 0.62;
    const startY = random() * height;
    context.strokeStyle = `rgba(80,52,28,${0.035 + project.wear * 0.045})`;
    context.lineWidth = 0.7 + random() * 1.3;
    context.beginPath();
    context.moveTo(startX, startY);
    context.bezierCurveTo(
      startX + width * 0.12,
      startY - height * 0.05,
      startX + width * 0.22,
      startY + height * 0.08,
      startX + width * (0.28 + random() * 0.18),
      startY + height * (random() - 0.5) * 0.08,
    );
    context.stroke();
  }
}

function createNormalCanvasFromHeight(heightCanvas, size, strength = 2.2) {
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalContext = normalCanvas.getContext("2d");
  const source = heightCanvas.getContext("2d").getImageData(0, 0, size, size).data;
  const normalImage = normalContext.createImageData(size, size);
  const pixels = normalImage.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sample = (sampleX, sampleY) => {
        const clampedX = THREE.MathUtils.clamp(sampleX, 0, size - 1);
        const clampedY = THREE.MathUtils.clamp(sampleY, 0, size - 1);
        return source[(clampedY * size + clampedX) * 4] / 255;
      };
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * strength;
      const dy = (sample(x, y - 1) - sample(x, y + 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      pixels[index] = Math.round((dx / length * 0.5 + 0.5) * 255);
      pixels[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      pixels[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      pixels[index + 3] = 255;
    }
  }
  normalContext.putImageData(normalImage, 0, 0);
  return normalCanvas;
}

function makePaperSurface(project, index, { variant = "body" } = {}) {
  const size = 1024;
  const seedOffset = variant === "flap" ? 503 : 0;
  const repeat = variant === "flap" ? [1.18, 0.92] : [1.45, 1.1];
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorContext = colorCanvas.getContext("2d");
  paintKraftBase(
    colorContext,
    size,
    size,
    project,
    createSeededRandom(731 + index * 97 + seedOffset),
  );
  if (variant === "flap") {
    colorContext.fillStyle = "rgba(77, 45, 23, 0.075)";
    colorContext.fillRect(0, 0, size, size);
  }

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpContext = bumpCanvas.getContext("2d");
  bumpContext.fillStyle = "#808080";
  bumpContext.fillRect(0, 0, size, size);
  const bumpImage = bumpContext.getImageData(0, 0, size, size);
  const bumpPixels = bumpImage.data;
  const bumpRandom = createSeededRandom(1901 + index * 131 + seedOffset);

  for (let pixel = 0; pixel < bumpPixels.length; pixel += 4) {
    const noise = 118 + Math.round(bumpRandom() * 30);
    bumpPixels[pixel] = noise;
    bumpPixels[pixel + 1] = noise;
    bumpPixels[pixel + 2] = noise;
  }
  bumpContext.putImageData(bumpImage, 0, 0);

  const fiberRandom = createSeededRandom(2609 + index * 179 + seedOffset);
  const bumpFibers = 900 + Math.round(project.grain * 900);
  for (let index = 0; index < bumpFibers; index += 1) {
    const x = fiberRandom() * size;
    const y = fiberRandom() * size;
    const length = 1.5 + fiberRandom() * 16;
    bumpContext.strokeStyle = fiberRandom() > 0.5
      ? "rgba(165,165,165,0.36)"
      : "rgba(99,99,99,0.28)";
    bumpContext.lineWidth = 0.3 + fiberRandom() * 0.65;
    bumpContext.beginPath();
    bumpContext.moveTo(x, y);
    bumpContext.quadraticCurveTo(
      x + length * 0.5,
      y + (fiberRandom() - 0.5) * 2,
      x + length,
      y + (fiberRandom() - 0.5) * 3,
    );
    bumpContext.stroke();
  }

  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const roughnessContext = roughnessCanvas.getContext("2d");
  roughnessContext.fillStyle = "#858585";
  roughnessContext.fillRect(0, 0, size, size);
  const roughnessImage = roughnessContext.getImageData(0, 0, size, size);
  const roughnessPixels = roughnessImage.data;
  const roughnessRandom = createSeededRandom(3719 + index * 157 + seedOffset);
  for (let pixel = 0; pixel < roughnessPixels.length; pixel += 4) {
    const value = 94 + Math.round(roughnessRandom() * 82);
    roughnessPixels[pixel] = value;
    roughnessPixels[pixel + 1] = value;
    roughnessPixels[pixel + 2] = value;
  }
  roughnessContext.putImageData(roughnessImage, 0, 0);

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.RepeatWrapping;
  colorTexture.repeat.set(repeat[0], repeat[1]);
  colorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.repeat.set(repeat[0], repeat[1]);
  bumpTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const normalTexture = new THREE.CanvasTexture(
    createNormalCanvasFromHeight(bumpCanvas, size),
  );
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(repeat[0], repeat[1]);
  normalTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.repeat.set(repeat[0], repeat[1]);
  roughnessTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return { colorTexture, bumpTexture, normalTexture, roughnessTexture };
}

const paperSurfaceCache = new Map();

function getPaperSurface(project, index, variant = "body") {
  const cacheKey = `${index}:${variant}`;
  if (!paperSurfaceCache.has(cacheKey)) {
    paperSurfaceCache.set(
      cacheKey,
      makePaperSurface(project, index, { variant }),
    );
  }
  return paperSurfaceCache.get(cacheKey);
}

const initialPaperSurface = getPaperSurface(PROJECTS[0], 0);
const initialFlapSurface = getPaperSurface(PROJECTS[0], 0, "flap");

const introRoot = new THREE.Group();
const modelMount = new THREE.Group();
const envelopeMotion = new THREE.Group();
const envelopeAssembly = new THREE.Group();
const envelopeShell = new THREE.Group();
const flapPivot = new THREE.Group();
const sealGroup = new THREE.Group();
const letterGroup = new THREE.Group();

introRoot.add(modelMount);
modelMount.add(envelopeMotion);
envelopeMotion.add(envelopeAssembly, letterGroup);
envelopeAssembly.add(envelopeShell, flapPivot, sealGroup);
scene.add(introRoot);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(11, 7),
  new THREE.ShadowMaterial({
    color: 0x4f3528,
    opacity: 0.1,
    transparent: true,
  }),
);
shadowPlane.position.set(0, -0.18, -0.42);
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

function envelopeFalloffAt(x, y) {
  const normalX = x / (SETTINGS.envelopeWidth / 2);
  const normalY = y / (SETTINGS.envelopeHeight / 2);
  return (
    Math.max(0, 1 - normalX * normalX) *
    Math.max(0, 1 - normalY * normalY)
  );
}

function envelopeFrontAt(x, y) {
  return (
    SETTINGS.envelopeDepth / 2 +
    SETTINGS.envelopeFrontBulge *
      Math.pow(envelopeFalloffAt(x, y), 0.64)
  );
}

function envelopeBackAt(x, y) {
  return (
    -SETTINGS.envelopeDepth / 2 -
    SETTINGS.envelopeBackBulge *
      Math.pow(envelopeFalloffAt(x, y), 0.64)
  );
}

function makeEnvelopeBodyGeometry() {
  const halfWidth = SETTINGS.envelopeWidth / 2;
  const halfHeight = SETTINGS.envelopeHeight / 2;
  const columns = 72;
  const rows = 44;
  const stride = columns + 1;
  const positions = [];
  const uvs = [];
  const indices = [];

  const addGridFace = (zAt, windForward) => {
    const start = positions.length / 3;
    for (let row = 0; row <= rows; row += 1) {
      const y = THREE.MathUtils.lerp(-halfHeight, halfHeight, row / rows);
      for (let column = 0; column <= columns; column += 1) {
        const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, column / columns);
        positions.push(x, y, zAt(x, y));
        uvs.push(column / columns, row / rows);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const bottomLeft = start + row * stride + column;
        const bottomRight = bottomLeft + 1;
        const topLeft = bottomLeft + stride;
        const topRight = topLeft + 1;
        if (windForward) {
          indices.push(
            bottomLeft,
            bottomRight,
            topRight,
            bottomLeft,
            topRight,
            topLeft,
          );
        } else {
          indices.push(
            bottomLeft,
            topRight,
            bottomRight,
            bottomLeft,
            topLeft,
            topRight,
          );
        }
      }
    }
  };

  addGridFace(envelopeFrontAt, true);
  addGridFace(envelopeBackAt, false);

  const addSideQuad = (a, b, c, d, sideUvs) => {
    const start = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    uvs.push(...sideUvs);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };

  for (let column = 0; column < columns; column += 1) {
    const x0 = THREE.MathUtils.lerp(-halfWidth, halfWidth, column / columns);
    const x1 = THREE.MathUtils.lerp(-halfWidth, halfWidth, (column + 1) / columns);
    const frontZ0 = envelopeFrontAt(x0, halfHeight);
    const frontZ1 = envelopeFrontAt(x1, halfHeight);
    const backZ0 = envelopeBackAt(x0, halfHeight);
    const backZ1 = envelopeBackAt(x1, halfHeight);
    addSideQuad(
      [x0, halfHeight, frontZ0],
      [x1, halfHeight, frontZ1],
      [x1, halfHeight, backZ1],
      [x0, halfHeight, backZ0],
      [column / columns, 1, (column + 1) / columns, 1, (column + 1) / columns, 0, column / columns, 0],
    );
    addSideQuad(
      [x0, -halfHeight, frontZ0],
      [x0, -halfHeight, backZ0],
      [x1, -halfHeight, backZ1],
      [x1, -halfHeight, frontZ1],
      [column / columns, 1, column / columns, 0, (column + 1) / columns, 0, (column + 1) / columns, 1],
    );
  }

  for (let row = 0; row < rows; row += 1) {
    const y0 = THREE.MathUtils.lerp(-halfHeight, halfHeight, row / rows);
    const y1 = THREE.MathUtils.lerp(-halfHeight, halfHeight, (row + 1) / rows);
    const frontZ0 = envelopeFrontAt(-halfWidth, y0);
    const frontZ1 = envelopeFrontAt(-halfWidth, y1);
    const backZ0 = envelopeBackAt(-halfWidth, y0);
    const backZ1 = envelopeBackAt(-halfWidth, y1);
    addSideQuad(
      [-halfWidth, y0, frontZ0],
      [-halfWidth, y1, frontZ1],
      [-halfWidth, y1, backZ1],
      [-halfWidth, y0, backZ0],
      [row / rows, 1, (row + 1) / rows, 1, (row + 1) / rows, 0, row / rows, 0],
    );
    addSideQuad(
      [halfWidth, y0, frontZ0],
      [halfWidth, y0, backZ0],
      [halfWidth, y1, backZ1],
      [halfWidth, y1, frontZ1],
      [row / rows, 1, row / rows, 0, (row + 1) / rows, 0, (row + 1) / rows, 1],
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const envelopeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: initialPaperSurface.colorTexture,
  roughnessMap: initialPaperSurface.roughnessTexture,
  roughness: 0.82,
  normalMap: initialPaperSurface.normalTexture,
  normalScale: new THREE.Vector2(0.72, 0.72),
  metalness: 0,
  clearcoat: 0,
  clearcoatRoughness: 0.58,
  sheen: 0.2,
  sheenRoughness: 0.76,
  sheenColor: new THREE.Color(0xfff1d4),
  envMapIntensity: 0.65,
  side: THREE.DoubleSide,
});
const envelopeBody = new THREE.Mesh(
  makeEnvelopeBodyGeometry(),
  envelopeMaterial,
);
envelopeShell.add(envelopeBody);

const envelopeSurfacePoint = (x, y) =>
  new THREE.Vector3(x, y, envelopeFrontAt(x, y) + 0.002);
const foldGeometry = new THREE.BufferGeometry().setFromPoints([
  envelopeSurfacePoint(
    -SETTINGS.envelopeWidth / 2 + 0.03,
    SETTINGS.envelopeHeight / 2 - 0.03,
  ),
  envelopeSurfacePoint(0, -0.02),
  envelopeSurfacePoint(
    SETTINGS.envelopeWidth / 2 - 0.03,
    SETTINGS.envelopeHeight / 2 - 0.03,
  ),
  envelopeSurfacePoint(0, -0.02),
  envelopeSurfacePoint(
    -SETTINGS.envelopeWidth / 2 + 0.03,
    -SETTINGS.envelopeHeight / 2 + 0.03,
  ),
  envelopeSurfacePoint(0, 0.01),
  envelopeSurfacePoint(
    SETTINGS.envelopeWidth / 2 - 0.03,
    -SETTINGS.envelopeHeight / 2 + 0.03,
  ),
  envelopeSurfacePoint(0, 0.01),
]);
const foldLines = new THREE.LineSegments(
  foldGeometry,
  new THREE.LineBasicMaterial({
    color: 0x8e8372,
    transparent: true,
    opacity: 0.26,
  }),
);
envelopeShell.add(foldLines);

const slotShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(SETTINGS.envelopeWidth * 0.78, 0.028),
  new THREE.MeshBasicMaterial({
    color: 0x34271d,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }),
);
slotShadow.position.set(
  0,
  SETTINGS.envelopeHeight / 2 - 0.012,
  envelopeFrontAt(0, SETTINGS.envelopeHeight / 2 - 0.012) + 0.007,
);
envelopeShell.add(slotShadow);

const slotLip = new THREE.Mesh(
  new RoundedBoxGeometry(
    SETTINGS.envelopeWidth * 0.82,
    0.018,
    SETTINGS.envelopeDepth * 0.7,
    3,
    0.006,
  ),
  new THREE.MeshPhysicalMaterial({
    color: 0xd8ccb6,
    roughness: 0.8,
    metalness: 0,
    sheen: 0.12,
    sheenColor: new THREE.Color(0xfff2d7),
  }),
);
slotLip.position.set(
  0,
  SETTINGS.envelopeHeight / 2 - 0.008,
  envelopeFrontAt(0, SETTINGS.envelopeHeight / 2 - 0.008) + 0.009,
);
envelopeShell.add(slotLip);

function makeFlapGeometry() {
  const columns = 56;
  const rows = 28;
  const topY = SETTINGS.envelopeHeight / 2;
  const apexY = topY - SETTINGS.flapHeight;
  const fullHalfWidth = SETTINGS.envelopeWidth / 2 - 0.012;
  const positions = [];
  const uvs = [];
  const indices = [];
  const rowData = [];

  for (let row = 0; row <= rows; row += 1) {
    const progress = row / rows;
    const y = THREE.MathUtils.lerp(topY, apexY, progress);
    const halfWidth =
      fullHalfWidth * Math.pow(Math.max(0, 1 - progress), 0.92);
    rowData.push({ y, halfWidth });
    for (let column = 0; column <= columns; column += 1) {
      const across = column / columns;
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, across);
      positions.push(
        x,
        y - topY,
        envelopeFrontAt(x, y) -
          SETTINGS.envelopeDepth / 2 +
          SETTINGS.flapThickness,
      );
      uvs.push(
        (x + SETTINGS.envelopeWidth / 2) / SETTINGS.envelopeWidth,
        (SETTINGS.envelopeHeight / 2 - y) / SETTINGS.envelopeHeight,
      );
    }
  }

  const stride = columns + 1;
  const topVertexCount = (rows + 1) * stride;
  for (let row = 0; row <= rows; row += 1) {
    const { y, halfWidth } = rowData[row];
    for (let column = 0; column <= columns; column += 1) {
      const across = column / columns;
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, across);
      positions.push(
        x,
        y - topY,
        envelopeFrontAt(x, y) - SETTINGS.envelopeDepth / 2,
      );
      uvs.push(
        (x + SETTINGS.envelopeWidth / 2) / SETTINGS.envelopeWidth,
        (SETTINGS.envelopeHeight / 2 - y) / SETTINGS.envelopeHeight,
      );
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * stride + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + stride;
      const bottomRight = bottomLeft + 1;
      indices.push(
        topLeft,
        bottomLeft,
        bottomRight,
        topLeft,
        bottomRight,
        topRight,
      );
      const underTopLeft = topVertexCount + topLeft;
      const underTopRight = topVertexCount + topRight;
      const underBottomLeft = topVertexCount + bottomLeft;
      const underBottomRight = topVertexCount + bottomRight;
      indices.push(
        underTopLeft,
        underBottomRight,
        underBottomLeft,
        underTopLeft,
        underTopRight,
        underBottomRight,
      );
    }
  }

  for (let column = 0; column < columns; column += 1) {
    indices.push(
      column,
      topVertexCount + column,
      topVertexCount + column + 1,
      column,
      topVertexCount + column + 1,
      column + 1,
    );
  }
  for (let row = 0; row < rows; row += 1) {
    const left = row * stride;
    const nextLeft = left + stride;
    indices.push(
      left,
      topVertexCount + left,
      topVertexCount + nextLeft,
      left,
      topVertexCount + nextLeft,
      nextLeft,
    );
    const right = row * stride + columns;
    const nextRight = right + stride;
    indices.push(
      right,
      nextRight,
      topVertexCount + nextRight,
      right,
      topVertexCount + nextRight,
      topVertexCount + right,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const flapMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: initialFlapSurface.colorTexture,
  roughnessMap: initialFlapSurface.roughnessTexture,
  roughness: 0.84,
  normalMap: initialFlapSurface.normalTexture,
  normalScale: new THREE.Vector2(0.78, 0.78),
  metalness: 0,
  clearcoat: 0,
  clearcoatRoughness: 0.62,
  sheen: 0.16,
  sheenRoughness: 0.8,
  sheenColor: new THREE.Color(0xfff2d7),
  side: THREE.DoubleSide,
});
const flapMesh = new THREE.Mesh(makeFlapGeometry(), flapMaterial);
flapPivot.position.set(
  0,
  SETTINGS.envelopeHeight / 2,
  SETTINGS.envelopeDepth / 2 + 0.0015,
);
flapPivot.rotation.x = -0.012;
flapPivot.add(flapMesh);

function paperSurfaceOffset(x, y) {
  const normalX = x / (SETTINGS.letterWidth / 2);
  const normalY = y / (SETTINGS.letterHeight / 2);
  const edgeFalloff =
    Math.max(0, 1 - normalX * normalX) *
    Math.max(0, 1 - normalY * normalY);
  const centreBulge = SETTINGS.letterBulge * Math.pow(edgeFalloff, 0.72);
  const diagonalCrease =
    -0.011 * Math.exp(-Math.pow((normalY + normalX * 0.42 - 0.08) / 0.085, 2));
  const secondaryCrease =
    -0.006 * Math.exp(-Math.pow((normalY - 0.24 + normalX * 0.18) / 0.1, 2));
  const paperWave =
    SETTINGS.letterGrain *
    Math.sin(normalX * 6.2 + normalY * 2.4) *
    Math.sin(normalY * 5.4 - normalX * 1.8) *
    edgeFalloff;

  return (
    centreBulge +
    diagonalCrease * edgeFalloff +
    secondaryCrease * edgeFalloff +
    paperWave
  );
}

function makeHalfPaperGeometry(band) {
  const halfHeight = SETTINGS.letterHeight / 2;
  const geometry = new THREE.PlaneGeometry(
    SETTINGS.letterWidth,
    halfHeight,
    48,
    32,
  );
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index);
    const localY = positions.getY(index);
    const worldY = localY + (band === "top" ? halfHeight / 2 : -halfHeight / 2);
    const normalizedY = (localY + halfHeight / 2) / halfHeight;

    positions.setZ(index, paperSurfaceOffset(localX, worldY));
    uvs.setY(index, band === "top" ? 0.5 + normalizedY * 0.5 : normalizedY * 0.5);
  }

  positions.needsUpdate = true;
  uvs.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

let letterGlyphRecords = [];
let letterBaseCanvas = null;

function makeLetterTexture(
  project,
  index,
  { includeBase = true, includeText = true } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 1280;
  const context = canvas.getContext("2d");
  const previousRecords = letterGlyphRecords;
  if (includeText) {
    letterGlyphRecords = [];
  }

  const paintLetterText = (text, x, y) => {
    context.fillText(text, x, y);
    if (!includeText) {
      return;
    }

    const spacing = Number.parseFloat(context.letterSpacing) || 0;
    let cursor = x;
    [...text].forEach((character) => {
      const width = context.measureText(character).width + spacing;
      if (character.trim()) {
        letterGlyphRecords.push({
          character,
          x: cursor,
          y,
          width,
          font: context.font,
          color: context.fillStyle,
          alpha: context.globalAlpha,
          baseline: context.textBaseline,
        });
      }
      cursor += width;
    });
  };

  if (includeBase) {
    paintKraftBase(
      context,
      canvas.width,
      canvas.height,
      project,
      createSeededRandom(5011 + index * 173),
    );

    const centreLight = context.createRadialGradient(480, 600, 30, 480, 620, 620);
    centreLight.addColorStop(0, "rgba(255,250,232,0.16)");
    centreLight.addColorStop(0.56, "rgba(255,250,232,0.05)");
    centreLight.addColorStop(1, "rgba(72,44,24,0.08)");
    context.fillStyle = centreLight;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.lineCap = "round";
    const creasePairs = [
      [[120, 1020], [290, 880], [470, 692], [790, 520]],
      [[210, 610], [420, 650], [620, 606], [846, 670]],
      [[650, 160], [610, 380], [650, 620], [610, 930]],
    ];
    creasePairs.forEach((points, creaseIndex) => {
      const drawCrease = (offset, style, width) => {
        context.strokeStyle = style;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(points[0][0] + offset, points[0][1] + offset * 0.2);
        context.bezierCurveTo(
          points[1][0] + offset,
          points[1][1] + offset * 0.2,
          points[2][0] + offset,
          points[2][1] + offset * 0.2,
          points[3][0] + offset,
          points[3][1] + offset * 0.2,
        );
        context.stroke();
      };

      drawCrease(
        0,
        `rgba(70,44,24,${0.06 + project.wear * (0.05 + creaseIndex * 0.012)})`,
        1.5,
      );
      drawCrease(
        5,
        `rgba(255,246,220,${0.06 + project.wear * 0.025})`,
        1.2,
      );
    });
  }

  if (includeText) {
    context.strokeStyle = project.ink;
    context.globalAlpha = 0.08;
    context.lineWidth = 1;
    for (let y = 350; y < 1110; y += 48) {
      context.beginPath();
      context.moveTo(104, y);
      context.lineTo(856, y);
      context.stroke();
    }
    context.globalAlpha = 1;

    context.fillStyle = project.ink;
    context.font = "600 22px Arial";
    context.letterSpacing = "4px";
    paintLetterText("A LETTER FROM THE DESIGN ARCHIVE", 104, 110);
    context.font = "400 19px Arial";
    paintLetterText(project.date, 104, 148);

    context.strokeStyle = project.accent;
    context.lineWidth = 2;
    context.strokeRect(740, 78, 116, 142);
    context.fillStyle = project.accent;
    context.font = "400 64px Georgia";
    paintLetterText(project.number.slice(0, 2), 765, 166);
    context.font = "500 16px Arial";
    paintLetterText("ARCHIVE", 760, 194);

    context.fillStyle = project.ink;
    context.font = "400 54px Georgia";
    context.letterSpacing = "-2px";
    paintLetterText(project.title.split(" ")[0], 104, 300);
    paintLetterText(project.title.split(" ").slice(1).join(" "), 104, 352);

    context.font = "600 18px Arial";
    context.letterSpacing = "3px";
    context.fillStyle = project.accent;
    paintLetterText(project.type, 104, 400);

    context.fillStyle = project.ink;
    context.font = "400 25px Arial";
    context.letterSpacing = "0px";
    let currentY = 508;
    const wrapText = (text, x, y, maxWidth, lineHeight) => {
      const tokens = text.match(
        /[\u3400-\u9fff]|[\u3000-\u303f\uff00-\uffef]|[^\s\u3400-\u9fff\u3000-\u303f\uff00-\uffef]+/gu,
      ) ?? [];
      let line = "";
      tokens.forEach((token) => {
        const needsSpace =
          /^[A-Za-z0-9]/.test(token) &&
          /[A-Za-z0-9]$/.test(line);
        const candidate = line ? `${line}${needsSpace ? " " : ""}${token}` : token;
        if (context.measureText(candidate).width > maxWidth && line) {
          paintLetterText(line, x, y);
          y += lineHeight;
          line = token;
        } else {
          line = candidate;
        }
      });
      if (line) {
        paintLetterText(line, x, y);
        y += lineHeight;
      }
      return y;
    };

    project.body.forEach((paragraph, index) => {
      currentY = wrapText(paragraph, 104, currentY, 720, 38) + (index === 0 ? 34 : 26);
    });

    context.strokeStyle = project.accent;
    context.globalAlpha = 0.56;
    context.beginPath();
    context.moveTo(104, 1110);
    context.lineTo(536, 1110);
    context.stroke();
    context.globalAlpha = 1;
    context.fillStyle = project.ink;
    context.font = "400 25px Georgia";
    paintLetterText(project.signature, 104, 1157);
    context.font = "500 16px Arial";
    context.letterSpacing = "3px";
    paintLetterText("MAILED FROM HONG KONG / TO THE NEXT IDEA", 104, 1215);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (includeBase && !includeText) {
    letterBaseCanvas = canvas;
  }
  if (!includeText) {
    letterGlyphRecords = previousRecords;
  }
  return texture;
}

function makeSealSurface(project, index) {
  const size = 512;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const context = colorCanvas.getContext("2d");
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const heightContext = heightCanvas.getContext("2d");
  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const roughnessContext = roughnessCanvas.getContext("2d");
  const random = createSeededRandom(8111 + index * 197);

  const waxGradient = context.createRadialGradient(236, 220, 16, 256, 256, 250);
  waxGradient.addColorStop(0, mixHexColors(project.wax, "#f4d5bd", 0.16));
  waxGradient.addColorStop(0.52, project.wax);
  waxGradient.addColorStop(0.82, mixHexColors(project.wax, "#28100c", 0.2));
  waxGradient.addColorStop(1, mixHexColors(project.wax, "#1e0b08", 0.5));
  context.fillStyle = waxGradient;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 1300; index += 1) {
    const x = random() * size;
    const y = random() * size;
    const alpha = 0.012 + random() * 0.045;
    context.fillStyle = random() > 0.46
      ? `rgba(255,227,204,${alpha})`
      : `rgba(41,12,9,${alpha})`;
    context.fillRect(x, y, 0.45 + random() * 1.5, 0.4 + random() * 1.25);
  }

  heightContext.fillStyle = "#808080";
  heightContext.fillRect(0, 0, size, size);
  const heightImage = heightContext.getImageData(0, 0, size, size);
  const heightPixels = heightImage.data;
  const heightRandom = createSeededRandom(9137 + index * 89);
  for (let pixel = 0; pixel < heightPixels.length; pixel += 4) {
    const value = 122 + Math.round(heightRandom() * 13);
    heightPixels[pixel] = value;
    heightPixels[pixel + 1] = value;
    heightPixels[pixel + 2] = value;
  }
  heightContext.putImageData(heightImage, 0, 0);

  roughnessContext.fillStyle = "#8a8a8a";
  roughnessContext.fillRect(0, 0, size, size);
  const roughnessImage = roughnessContext.getImageData(0, 0, size, size);
  const roughnessPixels = roughnessImage.data;
  const roughnessRandom = createSeededRandom(10429 + index * 73);
  for (let pixel = 0; pixel < roughnessPixels.length; pixel += 4) {
    const value = 104 + Math.round(roughnessRandom() * 54);
    roughnessPixels[pixel] = value;
    roughnessPixels[pixel + 1] = value;
    roughnessPixels[pixel + 2] = value;
  }
  roughnessContext.putImageData(roughnessImage, 0, 0);

  const drawReliefStroke = (lineWidth, path) => {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = "rgba(39,7,5,0.78)";
    context.translate(2.3, 3.2);
    context.beginPath();
    path(context);
    context.stroke();
    context.restore();

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = "rgba(255,220,197,0.54)";
    context.translate(-1.2, -1.4);
    context.beginPath();
    path(context);
    context.stroke();
    context.restore();

    heightContext.save();
    heightContext.lineCap = "round";
    heightContext.lineJoin = "round";
    heightContext.lineWidth = lineWidth;
    heightContext.strokeStyle = "#f1f1f1";
    heightContext.beginPath();
    path(heightContext);
    heightContext.stroke();
    heightContext.restore();

    roughnessContext.save();
    roughnessContext.lineCap = "round";
    roughnessContext.lineJoin = "round";
    roughnessContext.lineWidth = lineWidth;
    roughnessContext.strokeStyle = "rgba(54,54,54,0.45)";
    roughnessContext.beginPath();
    path(roughnessContext);
    roughnessContext.stroke();
    roughnessContext.restore();
  };

  const drawReliefLeaf = (x, y, angle, length, width) => {
    const paintLeaf = (target, fill, offsetX = 0, offsetY = 0) => {
      target.save();
      target.translate(x + offsetX, y + offsetY);
      target.rotate(angle);
      target.fillStyle = fill;
      target.beginPath();
      target.moveTo(0, 0);
      target.bezierCurveTo(
        length * 0.34,
        -width,
        length * 0.8,
        -width * 0.55,
        length,
        0,
      );
      target.bezierCurveTo(
        length * 0.74,
        width * 0.64,
        length * 0.28,
        width * 0.82,
        0,
        0,
      );
      target.fill();
      target.restore();
    };

    paintLeaf(context, "rgba(39,7,5,0.62)", 2.3, 3.1);
    paintLeaf(context, "rgba(255,221,197,0.38)", -1.1, -1.4);
    paintLeaf(heightContext, "#efefef");
    paintLeaf(roughnessContext, "rgba(50,50,50,0.4)");
  };

  drawReliefStroke(8, (target) => target.arc(256, 256, 193, 0, Math.PI * 2));
  drawReliefStroke(5, (target) => target.arc(256, 256, 166, 0, Math.PI * 2));
  drawReliefStroke(4, (target) => target.arc(256, 256, 105, 0, Math.PI * 2));

  for (let step = 0; step < 64; step += 1) {
    const angle = (step / 64) * Math.PI * 2;
    const x = 256 + Math.cos(angle) * 180;
    const y = 256 + Math.sin(angle) * 180;
    context.fillStyle = "rgba(44,9,7,0.42)";
    context.beginPath();
    context.arc(x + 1.6, y + 2.2, 2.15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,219,194,0.35)";
    context.beginPath();
    context.arc(x - 0.7, y - 0.9, 1.55, 0, Math.PI * 2);
    context.fill();
    heightContext.fillStyle = "#ededed";
    heightContext.beginPath();
    heightContext.arc(x, y, 1.9, 0, Math.PI * 2);
    heightContext.fill();
  }

  drawReliefStroke(5, (target) => {
    target.moveTo(208, 350);
    target.quadraticCurveTo(174, 292, 190, 176);
  });
  drawReliefStroke(5, (target) => {
    target.moveTo(304, 350);
    target.quadraticCurveTo(338, 292, 322, 176);
  });

  [
    [188, 278, -0.72, 45, 10],
    [181, 232, -0.92, 43, 9],
    [189, 191, -0.5, 40, 8],
    [324, 278, 0.72, 45, 10],
    [331, 232, 0.92, 43, 9],
    [323, 191, 0.5, 40, 8],
    [232, 138, -0.38, 38, 8],
    [280, 138, 0.38, 38, 8],
  ].forEach(([x, y, angle, length, width]) => {
    drawReliefLeaf(x, y, angle, length, width);
  });

  const drawReliefText = (text, x, y, font, letterSpacing = 0) => {
    const paintText = (target, fill, offsetX = 0, offsetY = 0) => {
      target.save();
      target.fillStyle = fill;
      target.textAlign = "center";
      target.font = font;
      target.letterSpacing = `${letterSpacing}px`;
      target.fillText(text, x + offsetX, y + offsetY);
      target.restore();
    };

    paintText(context, "rgba(39,7,5,0.78)", 3.2, 4.4);
    paintText(context, "rgba(255,223,201,0.52)", -1.2, -1.6);
    paintText(heightContext, "#f3f3f3");
    paintText(roughnessContext, "rgba(48,48,48,0.5)");
  };

  drawReliefText(project.number.slice(0, 2), 256, 276, "400 102px Georgia");
  drawReliefText("ARCHIVE", 256, 344, "600 21px Arial", 5);

  const makeNormalCanvas = (strength) => {
    const normalCanvas = document.createElement("canvas");
    normalCanvas.width = size;
    normalCanvas.height = size;
    const normalContext = normalCanvas.getContext("2d");
    const source = heightContext.getImageData(0, 0, size, size).data;
    const output = normalContext.createImageData(size, size);
    const pixels = output.data;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const sample = (sampleX, sampleY) => {
          const clampedX = THREE.MathUtils.clamp(sampleX, 0, size - 1);
          const clampedY = THREE.MathUtils.clamp(sampleY, 0, size - 1);
          return source[(clampedY * size + clampedX) * 4] / 255;
        };
        const dx = (sample(x - 1, y) - sample(x + 1, y)) * strength;
        const dy = (sample(x, y - 1) - sample(x, y + 1)) * strength;
        const length = Math.hypot(dx, dy, 1);
        const index = (y * size + x) * 4;
        pixels[index] = Math.round((dx / length * 0.5 + 0.5) * 255);
        pixels[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
        pixels[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
        pixels[index + 3] = 255;
      }
    }
    normalContext.putImageData(output, 0, 0);
    return normalCanvas;
  };

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
  const normalTexture = new THREE.CanvasTexture(makeNormalCanvas(2.4));
  const displacementTexture = new THREE.CanvasTexture(heightCanvas);

  [colorTexture, roughnessTexture, normalTexture, displacementTexture].forEach(
    (texture) => {
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    },
  );

  return {
    colorTexture,
    roughnessTexture,
    normalTexture,
    displacementTexture,
  };
}

function makeWaxShape(index) {
  const shape = new THREE.Shape();
  const random = createSeededRandom(6607 + index * 151);
  const segments = 96;
  const phases = [random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2];
  const radii = Array.from({ length: segments }, (_, step) => {
    const angle = (step / segments) * Math.PI * 2;
    const organic =
      0.058 * Math.sin(angle * 3 + phases[0]) +
      0.036 * Math.sin(angle * 6 + phases[1]) +
      0.022 * Math.sin(angle * 11 + phases[2]);
    return 0.19 * (1 + organic + (random() - 0.5) * 0.025);
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let step = 0; step < segments; step += 1) {
      const previous = radii[(step - 1 + segments) % segments];
      const next = radii[(step + 1) % segments];
      radii[step] = radii[step] * 0.48 + (previous + next) * 0.26;
    }
  }

  for (let step = 0; step < segments; step += 1) {
    const angle = (step / segments) * Math.PI * 2;
    const radius = radii[step];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (step === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

let letterBaseTexture = makeLetterTexture(PROJECTS[0], 0, {
  includeText: false,
});
let letterTextTexture = makeLetterTexture(PROJECTS[0], 0, {
  includeBase: false,
});
const letterMaterial = new THREE.MeshPhysicalMaterial({
  map: letterBaseTexture,
  bumpMap: initialPaperSurface.bumpTexture,
  bumpScale: 0.007,
  roughness: 0.84,
  metalness: 0,
  clearcoat: 0.04,
  clearcoatRoughness: 0.72,
  sheen: 0.12,
  sheenRoughness: 0.86,
  sheenColor: new THREE.Color(0xfff3dc),
  envMapIntensity: 0.5,
  side: THREE.FrontSide,
});

const letterBackMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: letterBaseTexture,
  bumpMap: initialPaperSurface.bumpTexture,
  bumpScale: 0.007,
  roughness: 0.88,
  metalness: 0,
  clearcoat: 0.03,
  clearcoatRoughness: 0.74,
  sheen: 0.1,
  sheenRoughness: 0.88,
  sheenColor: new THREE.Color(0xfff3dc),
  side: THREE.BackSide,
});

function createTextRevealMaterial(bandStart, rows) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: letterTextTexture },
      uScramble: { value: null },
      uReveal: { value: 0 },
      uScrambleMix: { value: 0 },
      uSideRemove: { value: 0 },
      uOpacity: { value: 1 },
      uBandStart: { value: bandStart },
      uRows: { value: rows },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uScramble;
      uniform float uReveal;
      uniform float uScrambleMix;
      uniform float uSideRemove;
      uniform float uOpacity;
      uniform float uBandStart;
      uniform float uRows;
      varying vec2 vUv;

      void main() {
        vec4 ink = texture2D(uMap, vUv);
        vec4 noise = texture2D(uScramble, vUv);
        vec4 glyph = mix(ink, noise, uScrambleMix);
        float localV = clamp((vUv.y - uBandStart) * 2.0, 0.0, 1.0);
        float rowCoord = (1.0 - localV) * uRows;
        float row = floor(rowCoord);
        float rowProgress = clamp((uReveal - row / uRows) * uRows, 0.0, 1.0);
        float reveal = step(vUv.x, rowProgress);
        float sideMask = 1.0 - step(0.5 * (1.0 - uSideRemove), abs(vUv.x - 0.5));
        float alpha = glyph.a * reveal * sideMask * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(glyph.rgb, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

const scrambleCanvas = document.createElement("canvas");
scrambleCanvas.width = 960;
scrambleCanvas.height = 1280;
const scrambleContext = scrambleCanvas.getContext("2d");
const scrambleTexture = new THREE.CanvasTexture(scrambleCanvas);
scrambleTexture.colorSpace = THREE.SRGBColorSpace;
const glyphAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/[]{}#%&";
const scrambleState = { progress: 0 };
let scrambleCharacters = [];

function drawScrambleFrame() {
  scrambleContext.clearRect(0, 0, scrambleCanvas.width, scrambleCanvas.height);
  scrambleContext.textAlign = "center";

  scrambleCharacters.forEach((record) => {
    if (scrambleState.progress >= record.removeAt) {
      return;
    }

    const glyph = glyphAlphabet[Math.floor(Math.random() * glyphAlphabet.length)];
    scrambleContext.font = record.font;
    scrambleContext.fillStyle = record.color;
    scrambleContext.globalAlpha = record.alpha;
    scrambleContext.textBaseline = record.baseline;
    scrambleContext.fillText(
      Math.random() < 0.1 ? "·" : glyph,
      record.x + record.width / 2,
      record.y,
    );
  });

  scrambleContext.globalAlpha = 1;
  scrambleTexture.needsUpdate = true;
}

const topTextMaterial = createTextRevealMaterial(0.5, 8);
const bottomTextMaterial = createTextRevealMaterial(0, 8);
topTextMaterial.uniforms.uScramble.value = scrambleTexture;
bottomTextMaterial.uniforms.uScramble.value = scrambleTexture;

function createPaperHalf(band) {
  const group = new THREE.Group();
  const geometry = makeHalfPaperGeometry(band);
  const face = new THREE.Mesh(geometry, letterMaterial);
  const back = new THREE.Mesh(geometry, letterBackMaterial);
  const text = new THREE.Mesh(
    geometry,
    band === "top" ? topTextMaterial : bottomTextMaterial,
  );
  text.position.z = 0.003;
  group.add(face, back, text);
  return group;
}

const bottomHalf = createPaperHalf("bottom");
bottomHalf.position.y = -SETTINGS.letterHeight / 4;

const topHalfPivot = new THREE.Group();
const topHalf = createPaperHalf("top");
topHalf.position.y = SETTINGS.letterHeight / 4;
topHalfPivot.add(topHalf);
topHalfPivot.rotation.x = Math.PI;

const foldedCoverMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: letterBaseTexture,
  bumpMap: initialPaperSurface.bumpTexture,
  bumpScale: 0.009,
  roughness: 0.88,
  metalness: 0,
  clearcoat: 0.04,
  clearcoatRoughness: 0.72,
  sheen: 0.12,
  sheenRoughness: 0.86,
  sheenColor: new THREE.Color(0xfff3dc),
  side: THREE.DoubleSide,
  transparent: true,
});
const foldedCover = new THREE.Mesh(makeHalfPaperGeometry("bottom"), foldedCoverMaterial);
foldedCover.position.set(0, -SETTINGS.letterHeight / 4, 0.085);

const envelopeMouthPlane = new THREE.Plane();
const envelopeMouthNormal = new THREE.Vector3();
const envelopeMouthPoint = new THREE.Vector3();
const envelopeMouthQuaternion = new THREE.Quaternion();
const letterClippingPlanes = [envelopeMouthPlane];
let letterClippingActive = false;

letterMaterial.clippingPlanes = letterClippingPlanes;
letterBackMaterial.clippingPlanes = letterClippingPlanes;
foldedCoverMaterial.clippingPlanes = letterClippingPlanes;

function setLetterShadowParticipation(active) {
  envelopeBody.receiveShadow = active;
  flapMesh.receiveShadow = active;
  [bottomHalf, topHalf, foldedCover].forEach((part) => {
    part.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = active;
      }
    });
  });
  renderer.shadowMap.needsUpdate = true;
}

function setLetterClipping(active) {
  letterClippingActive = active;
  setLetterShadowParticipation(!active);
}

function updateEnvelopeMouthPlane() {
  envelopeMotion.updateWorldMatrix(true, false);
  envelopeMotion.getWorldQuaternion(envelopeMouthQuaternion);
  envelopeMouthNormal
    .set(0, 1, 0)
    .applyQuaternion(envelopeMouthQuaternion)
    .normalize();
  envelopeMouthPoint
    .set(
      0,
      letterClippingActive
        ? SETTINGS.envelopeHeight / 2
        : -SETTINGS.envelopeHeight * 4,
      0,
    )
    .applyMatrix4(envelopeMotion.matrixWorld);
  envelopeMouthPlane.setFromNormalAndCoplanarPoint(
    envelopeMouthNormal,
    envelopeMouthPoint,
  );
}

letterGroup.add(bottomHalf, topHalfPivot, foldedCover);
letterGroup.position.set(0, -0.06, SETTINGS.letterSlotZ);
letterGroup.scale.setScalar(0.72);
letterGroup.rotation.x = -0.02;
letterGroup.visible = false;

function makeLegacyEnvelopeSeal() {
const waxMaterial = new THREE.MeshPhysicalMaterial({
  color: PROJECTS[0].wax,
  roughness: 0.3,
  metalness: 0,
  clearcoat: 0.48,
  clearcoatRoughness: 0.22,
  envMapIntensity: 0.7,
});
const waxBody = new THREE.Mesh(
  new THREE.ExtrudeGeometry(makeWaxShape(0), {
    depth: 0.026,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.007,
    curveSegments: 36,
  }),
  waxMaterial,
);
waxBody.geometry.center();
sealGroup.add(waxBody);

let sealSurface = makeSealSurface(PROJECTS[0], 0);
const sealMark = new THREE.Mesh(
  new THREE.RingGeometry(0.0001, 0.142, 192, 72),
  new THREE.MeshPhysicalMaterial({
    map: sealSurface.colorTexture,
    roughnessMap: sealSurface.roughnessTexture,
    roughness: 1,
    normalMap: sealSurface.normalTexture,
    normalScale: new THREE.Vector2(1, 1),
    displacementMap: sealSurface.displacementTexture,
    displacementScale: 0.008,
    displacementBias: 0.004,
    metalness: 0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.65,
  }),
);
sealMark.position.z = 0.0235;
sealGroup.add(sealMark);

const waxReliefMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(PROJECTS[0].wax).lerp(
    new THREE.Color("#e0a086"),
    0.2,
  ),
  roughness: 0.22,
  metalness: 0,
  clearcoat: 0.55,
  clearcoatRoughness: 0.18,
  envMapIntensity: 0.8,
});
const sealRelief = new THREE.Group();
const texturePointOnSeal = (x, y, z = 0.0252) =>
  new THREE.Vector3(
    (x / 512 - 0.5) * 0.284,
    -(y / 512 - 0.5) * 0.284,
    z,
  );

[
  [0.108, 0.0034],
  [0.0925, 0.0026],
  [0.058, 0.0022],
].forEach(([radius, tube]) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 7, 112),
    waxReliefMaterial,
  );
  ring.position.z = 0.027;
  sealRelief.add(ring);
});

const beadGeometry = new THREE.SphereGeometry(0.0028, 8, 6);
const beadMesh = new THREE.InstancedMesh(
  beadGeometry,
  waxReliefMaterial,
  64,
);
const beadMatrix = new THREE.Matrix4();
for (let beadIndex = 0; beadIndex < 64; beadIndex += 1) {
  const angle = (beadIndex / 64) * Math.PI * 2;
  beadMatrix.makeTranslation(
    Math.cos(angle) * 0.1005,
    Math.sin(angle) * 0.1005,
    0.0274,
  );
  beadMesh.setMatrixAt(beadIndex, beadMatrix);
}
beadMesh.instanceMatrix.needsUpdate = true;
sealRelief.add(beadMesh);

const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0);
leafShape.bezierCurveTo(0.24, -0.25, 0.7, -0.28, 1, 0);
leafShape.bezierCurveTo(0.7, 0.24, 0.24, 0.25, 0, 0);
const leafGeometry = new THREE.ExtrudeGeometry(leafShape, {
  depth: 0.0025,
  bevelEnabled: true,
  bevelSegments: 1,
  bevelSize: 0.0005,
  bevelThickness: 0.0006,
});

[
  [188, 278, -0.72, 0.026],
  [181, 232, -0.92, 0.024],
  [189, 191, -0.5, 0.022],
  [324, 278, 0.72, 0.026],
  [331, 232, 0.92, 0.024],
  [323, 191, 0.5, 0.022],
  [232, 138, -0.38, 0.021],
  [280, 138, 0.38, 0.021],
].forEach(([x, y, angle, length]) => {
  const leaf = new THREE.Mesh(leafGeometry, waxReliefMaterial);
  leaf.position.copy(texturePointOnSeal(x, y, 0.026));
  leaf.rotation.z = -angle;
  leaf.scale.set(length, length, 1);
  sealRelief.add(leaf);
});

const leftStemCurve = new THREE.CatmullRomCurve3([
  texturePointOnSeal(208, 350),
  texturePointOnSeal(174, 292),
  texturePointOnSeal(190, 176),
]);
const rightStemCurve = new THREE.CatmullRomCurve3([
  texturePointOnSeal(304, 350),
  texturePointOnSeal(338, 292),
  texturePointOnSeal(322, 176),
]);
[leftStemCurve, rightStemCurve].forEach((curve) => {
  sealRelief.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, 28, 0.00145, 6, false),
      waxReliefMaterial,
    ),
  );
});

const zeroShape = new THREE.Shape();
zeroShape.absellipse(0, 0, 0.0145, 0.035, 0, Math.PI * 2, false);
const zeroHole = new THREE.Path();
zeroHole.absellipse(0, 0, 0.0075, 0.024, 0, Math.PI * 2, true);
zeroShape.holes.push(zeroHole);
const zero = new THREE.Mesh(
  new THREE.ExtrudeGeometry(zeroShape, {
    depth: 0.003,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.0006,
    bevelThickness: 0.0006,
  }),
  waxReliefMaterial,
);
zero.position.set(-0.019, 0, 0.0258);
sealRelief.add(zero);

const oneShape = new THREE.Shape();
[
  [-0.016, 0.022],
  [-0.007, 0.035],
  [0.006, 0.035],
  [0.006, -0.031],
  [0.016, -0.031],
  [0.016, -0.039],
  [-0.014, -0.039],
  [-0.014, -0.031],
  [-0.004, -0.031],
  [-0.004, 0.014],
  [-0.016, 0.01],
].forEach(([x, y], pointIndex) => {
  if (pointIndex === 0) {
    oneShape.moveTo(x, y);
  } else {
    oneShape.lineTo(x, y);
  }
});
oneShape.closePath();
const one = new THREE.Mesh(
  new THREE.ExtrudeGeometry(oneShape, {
    depth: 0.003,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.0006,
    bevelThickness: 0.0006,
  }),
  waxReliefMaterial,
);
one.position.set(0.019, 0, 0.0258);
sealRelief.add(one);

sealRelief.traverse((child) => {
  if (child.isMesh) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
});
sealGroup.add(sealRelief);

const waxDropMaterial = new THREE.MeshPhysicalMaterial({
  color: PROJECTS[0].wax,
  roughness: 0.32,
  metalness: 0,
  clearcoat: 0.36,
  clearcoatRoughness: 0.26,
});
const waxDropGeometry = new THREE.SphereGeometry(0.029, 20, 12);
const waxDropRandom = createSeededRandom(347);
const waxDropAngles = [0.22, 1.36, 2.74, 4.18, 5.63];
for (let index = 0; index < waxDropAngles.length; index += 1) {
  const angle = waxDropAngles[index] + waxDropRandom() * 0.16;
  const radius = 0.176 + waxDropRandom() * 0.022;
  const droplet = new THREE.Mesh(waxDropGeometry, waxDropMaterial);
  droplet.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    -0.003 + (waxDropRandom() - 0.5) * 0.006,
  );
  droplet.scale.set(
    0.8 + waxDropRandom() * 0.55,
    0.52 + waxDropRandom() * 0.42,
    0.38 + waxDropRandom() * 0.24,
  );
  sealGroup.add(droplet);
}
sealGroup.position.set(
  0,
  0.1,
  envelopeFrontAt(0, 0.1) + 0.024,
);
}

const waxSealCache = new Map();
function getWaxSealModel(index) {
  if (!waxSealCache.has(index)) {
    const project = PROJECTS[index];
    waxSealCache.set(
      index,
      createWaxSealModel({
        wax: project.wax,
        accent: project.accent,
        number: project.number,
        index,
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      }),
    );
    waxSealCache.get(index).scale.setScalar(1.14);
  }
  return waxSealCache.get(index);
}

PROJECTS.forEach((_, index) => getWaxSealModel(index));
let waxSealModel = getWaxSealModel(0);
sealGroup.add(waxSealModel);
sealGroup.position.set(
  0,
  0.1,
  envelopeFrontAt(0, 0.1) + 0.012,
);

[envelopeBody, flapMesh, bottomHalf, topHalf, foldedCover].forEach((object) => {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
});

envelopeMotion.rotation.set(SETTINGS.restRotationX, SETTINGS.restRotationY, -0.035);

const motion = {
  x: SETTINGS.restRotationX,
  y: SETTINGS.restRotationY,
  targetX: SETTINGS.restRotationX,
  targetY: SETTINGS.restRotationY,
  velocityX: 0,
  velocityY: 0,
  dragging: false,
  pointerX: 0,
  pointerY: 0,
  lastX: 0,
  lastY: 0,
  downX: 0,
  downY: 0,
  isOpen: false,
  projectIndex: 0,
};

let activeTimeline = null;
let wheelAmount = 0;
let wheelLastTime = 0;
let lastFrame = performance.now();
let isVisible = true;
let isPageVisible = document.visibilityState === "visible";
let readerIsOpen = false;
let readerTransitionTimeline = null;
let readerRevealTimeline = null;
let readerChars = [];
const readerDissolveState = { progress: 0 };
const readerCameraState = {
  progress: 0,
  startPosition: new THREE.Vector3(),
  endPosition: new THREE.Vector3(),
  startTarget: new THREE.Vector3(),
  endTarget: new THREE.Vector3(),
  startFov: camera.fov,
  endFov: camera.fov,
};

function updateMeta() {
  if (isLandingMode) {
    liveStatus.textContent =
      "封面信封可以拖动。这里是一枚互动物件，不打开真实手记。";
    return;
  }

  const project = PROJECTS[motion.projectIndex];
  setCopyText(keySentenceEnElement, project.keySentenceEn);
  projectTitle.textContent = project.title;
  projectType.textContent = project.type;
  setCopyText(projectNumber, project.number);
  setCopyText(projectDate, project.date);
  liveStatus.textContent = motion.isOpen
    ? `第${motion.projectIndex + 1}封信已打开：${project.title}`
    : `第${motion.projectIndex + 1}封信已封好：${project.title}`;
}

function setProject(index) {
  motion.projectIndex = (index + PROJECTS.length) % PROJECTS.length;
  const project = PROJECTS[motion.projectIndex];

  const previousBaseTexture = letterBaseTexture;
  const previousTextTexture = letterTextTexture;
  const paperSurface = getPaperSurface(project, motion.projectIndex);
  const flapSurface = getPaperSurface(
    project,
    motion.projectIndex,
    "flap",
  );
  letterBaseTexture = makeLetterTexture(project, motion.projectIndex, {
    includeText: false,
  });
  letterTextTexture = makeLetterTexture(project, motion.projectIndex, {
    includeBase: false,
  });
  letterMaterial.map = letterBaseTexture;
  letterMaterial.bumpMap = paperSurface.bumpTexture;
  letterMaterial.needsUpdate = true;
  letterBackMaterial.map = letterBaseTexture;
  letterBackMaterial.bumpMap = paperSurface.bumpTexture;
  letterBackMaterial.needsUpdate = true;
  topTextMaterial.uniforms.uMap.value = letterTextTexture;
  bottomTextMaterial.uniforms.uMap.value = letterTextTexture;
  previousBaseTexture.dispose();
  previousTextTexture.dispose();

  envelopeMaterial.map = paperSurface.colorTexture;
  envelopeMaterial.roughnessMap = paperSurface.roughnessTexture;
  envelopeMaterial.normalMap = paperSurface.normalTexture;
  envelopeMaterial.needsUpdate = true;
  flapMaterial.map = flapSurface.colorTexture;
  flapMaterial.roughnessMap = flapSurface.roughnessTexture;
  flapMaterial.normalMap = flapSurface.normalTexture;
  flapMaterial.needsUpdate = true;
  foldedCoverMaterial.map = letterBaseTexture;
  foldedCoverMaterial.bumpMap = paperSurface.bumpTexture;
  foldedCoverMaterial.needsUpdate = true;

  sealGroup.remove(waxSealModel);
  waxSealModel = getWaxSealModel(motion.projectIndex);
  sealGroup.add(waxSealModel);

  setHeroKeySentence(project.keySentence);
  setCopyText(keywordLabel, project.keyWords);
  setNotePhotos(project);
  updateMeta();
}

let textRevealTimeline = null;
let scrambleTimer = null;
let readEntryTimeline = null;
let readEntryDelay = null;

function hideReadEntry(immediate = false) {
  if (readEntryDelay) {
    window.clearTimeout(readEntryDelay);
    readEntryDelay = null;
  }
  readEntryTimeline?.kill();
  readButton.disabled = true;
  readButton.classList.remove("is-ready");
  readEntryTimeline = gsap.to(readButton, {
    opacity: 0,
    y: -16,
    filter: "blur(6px)",
    duration: immediate || reducedMotionQuery.matches ? 0.01 : 0.08,
    ease: "power3.in",
    onComplete: () => {
      gsap.set(readButton, {
        clearProps: "opacity,transform,filter",
      });
      readEntryTimeline = null;
    },
  });
}

function showReadEntry() {
  readEntryTimeline?.kill();
  readButton.disabled = false;
  readButton.classList.add("is-ready");
  readEntryTimeline = gsap.fromTo(
    readButton,
    { opacity: 0, y: 10, filter: "blur(4px)" },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: reducedMotionQuery.matches ? 0.01 : 0.48,
      ease: "power2.out",
      onComplete: () => {
        readEntryTimeline = null;
      },
    },
  );
}

function resetTextUniforms() {
  topTextMaterial.uniforms.uReveal.value = 0;
  bottomTextMaterial.uniforms.uReveal.value = 0;
  topTextMaterial.uniforms.uScrambleMix.value = 0;
  bottomTextMaterial.uniforms.uScrambleMix.value = 0;
  topTextMaterial.uniforms.uSideRemove.value = 0;
  bottomTextMaterial.uniforms.uSideRemove.value = 0;
  topTextMaterial.uniforms.uOpacity.value = 1;
  bottomTextMaterial.uniforms.uOpacity.value = 1;
}

function stopTextScramble() {
  if (scrambleTimer) {
    window.clearInterval(scrambleTimer);
    scrambleTimer = null;
    drawScrambleFrame();
  }
}

function resetLetterText({ hideEntry = true } = {}) {
  textRevealTimeline?.kill();
  textRevealTimeline = null;
  stopTextScramble();
  resetTextUniforms();
  hideNotePhotos();
  if (hideEntry) {
    hideReadEntry();
  }
}

function revealLetterText() {
  resetLetterText();
  const revealReadEntry = () => {
    readEntryDelay = window.setTimeout(() => {
      readEntryDelay = null;
      if (activeTimeline || readerIsOpen || !motion.isOpen) {
        return;
      }
      showReadEntry();
    }, reducedMotionQuery.matches ? 0 : 160);
  };
  const completeTextReveal = () => {
    showNotePhotos();
    window.setTimeout(revealReadEntry, reducedMotionQuery.matches ? 0 : 620);
  };
  if (reducedMotionQuery.matches) {
    topTextMaterial.uniforms.uReveal.value = 1;
    bottomTextMaterial.uniforms.uReveal.value = 1;
    completeTextReveal();
    return;
  }
  textRevealTimeline = gsap
    .timeline({ onComplete: completeTextReveal })
    .to(topTextMaterial.uniforms.uReveal, {
      value: 0.16,
      duration: 0.28,
      ease: "power2.in",
    })
    .to(topTextMaterial.uniforms.uReveal, {
      value: 0.72,
      duration: 0.36,
      ease: "power1.inOut",
    })
    .to(topTextMaterial.uniforms.uReveal, {
      value: 1,
      duration: 0.62,
      ease: "power3.out",
    })
    .to(bottomTextMaterial.uniforms.uReveal, {
      value: 0.2,
      duration: 0.24,
      ease: "power2.in",
    })
    .to(bottomTextMaterial.uniforms.uReveal, {
      value: 0.75,
      duration: 0.34,
      ease: "power1.inOut",
    })
    .to(bottomTextMaterial.uniforms.uReveal, {
      value: 1,
      duration: 0.58,
      ease: "power3.out",
    });
}

function startTextScramble() {
  stopTextScramble();
  textRevealTimeline?.kill();
  textRevealTimeline = null;
  hideReadEntry(true);
  hideNotePhotos();
  scrambleState.progress = 0;
  scrambleCharacters = letterGlyphRecords.map((record) => {
    const normalizedDistance = Math.min(
      1,
      Math.abs(record.x + record.width / 2 - scrambleCanvas.width / 2) /
        (scrambleCanvas.width * 0.43),
    );
    const removalAt =
      0.05 +
      (1 - normalizedDistance) * 0.82 +
      (Math.random() - 0.5) * 0.16;
    return {
      ...record,
      removeAt: THREE.MathUtils.clamp(removalAt, 0.02, 0.98),
    };
  });
  topTextMaterial.uniforms.uReveal.value = 1;
  bottomTextMaterial.uniforms.uReveal.value = 1;
  topTextMaterial.uniforms.uSideRemove.value = 0;
  bottomTextMaterial.uniforms.uSideRemove.value = 0;
  topTextMaterial.uniforms.uOpacity.value = 1;
  bottomTextMaterial.uniforms.uOpacity.value = 1;
  topTextMaterial.uniforms.uScrambleMix.value = 1;
  bottomTextMaterial.uniforms.uScrambleMix.value = 1;
  drawScrambleFrame();
  scrambleTimer = window.setInterval(() => {
    drawScrambleFrame();
  }, 50);
}

function appendReaderText(container, text) {
  const parts = [];
  let latinBuffer = "";
  const flushLatin = () => {
    if (latinBuffer) {
      parts.push(latinBuffer);
      latinBuffer = "";
    }
  };
  [...text].forEach((character) => {
    if (/[\u3400-\u9fff]/u.test(character)) {
      flushLatin();
      parts.push(character);
    } else if (/[\u3000-\u303f\uff00-\uffef]/u.test(character)) {
      flushLatin();
      if (parts.length > 0) {
        parts[parts.length - 1] += character;
      } else {
        parts.push(character);
      }
    } else if (/\s/u.test(character)) {
      flushLatin();
      parts.push(" ");
    } else {
      latinBuffer += character;
    }
  });
  flushLatin();

  parts.forEach((part) => {
    if (!part) {
      return;
    }
    if (/^\s+$/.test(part)) {
      container.append(document.createTextNode(" "));
      return;
    }

    const word = document.createElement("span");
    word.className = "reader-word";
    [...part].forEach((character) => {
      const glyph = document.createElement("span");
      glyph.className = "reader-char";
      glyph.dataset.character = character;
      glyph.textContent = character;
      readerChars.push(glyph);
      word.appendChild(glyph);
    });
    container.appendChild(word);
  });
}

function appendReaderRichText(container, text, emphasis = []) {
  const phrases = [...new Set(emphasis)]
    .filter((phrase) => phrase && text.includes(phrase))
    .sort((first, second) => second.length - first.length);

  if (phrases.length === 0) {
    appendReaderText(container, text);
    return;
  }

  const escapedPhrases = phrases.map((phrase) =>
    phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(escapedPhrases.join("|"), "g");
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    appendReaderText(container, text.slice(cursor, match.index));
    const highlighted = document.createElement("em");
    highlighted.className = "reader-highlight";
    appendReaderText(highlighted, match[0]);
    container.appendChild(highlighted);
    cursor = match.index + match[0].length;
  }
  appendReaderText(container, text.slice(cursor));
}

function createReaderPhoto(project, index, variant) {
  const figure = document.createElement("figure");
  figure.className = `reader-photo reader-photo--${variant}`;

  const image = document.createElement("img");
  image.src = project.images[index];
  image.alt = project.imageAlts[index];
  image.loading = index === 0 ? "eager" : "lazy";
  image.decoding = "async";

  const caption = document.createElement("figcaption");
  const captionIndex = document.createElement("span");
  captionIndex.textContent = String(index + 1).padStart(2, "0");
  const captionText = document.createElement("span");
  captionText.textContent =
    project.imageCaptions?.[index] ?? project.imageAlts[index];
  caption.append(captionIndex, captionText);
  figure.append(image, caption);
  return figure;
}

function createReaderQuote(project) {
  const quote = document.createElement("blockquote");
  quote.className = "reader-pullquote";

  const quoteMark = document.createElement("span");
  quoteMark.className = "reader-quote-mark";
  quoteMark.setAttribute("aria-hidden", "true");
  quoteMark.textContent = "“";

  const quoteCopy = document.createElement("p");
  appendReaderRichText(
    quoteCopy,
    project.readerQuote,
    project.readerEmphasis,
  );

  const quoteNote = document.createElement("cite");
  appendReaderText(quoteNote, project.readerQuoteNote);
  quote.append(quoteMark, quoteCopy, quoteNote);
  return quote;
}

function resizeReaderPaperFlow() {
  const height = Math.max(
    readerScroll.clientHeight,
    readerArticle.scrollHeight,
  );
  readerPaperFlow.style.height = `${height}px`;
}

function prepareReaderContent(project) {
  readerArticle.className = `reader-article reader-layout--${project.readerLayout}`;
  [
    readerDate,
    readerStamp,
    readerKicker,
    readerTitle,
    readerSubtitle,
    readerType,
    readerIntro,
    readerBody,
    readerSignature,
    readerFooter,
  ].forEach((element) => element.replaceChildren());
  readerChars = [];
  readerPhotoStrip.replaceChildren();

  readerPosition.textContent = `LETTER ${project.number}`;
  appendReaderText(readerDate, project.date);
  appendReaderText(readerStamp, project.number.slice(0, 2));
  const stampLabel = document.createElement("small");
  stampLabel.textContent = "ARCHIVE";
  readerStamp.appendChild(stampLabel);
  appendReaderText(readerKicker, "OPEN LETTER / PRIVATE CORRESPONDENCE");
  appendReaderText(readerTitle, project.title);
  appendReaderText(readerSubtitle, project.keySentenceEn);
  appendReaderText(readerType, project.type);
  appendReaderRichText(readerIntro, project.intro, project.readerEmphasis);
  readerPhotoStrip.appendChild(createReaderPhoto(project, 0, "hero"));

  project.body.forEach((paragraph, index) => {
    const element = document.createElement("p");
    element.classList.add(`reader-paragraph--${index + 1}`);
    if (index === 0) {
      element.classList.add("reader-greeting");
    }
    appendReaderRichText(element, paragraph, project.readerEmphasis);
    readerBody.appendChild(element);

    if (index === 0) {
      readerBody.appendChild(createReaderQuote(project));
    }
    if (index === 1 && project.images.length > 1) {
      readerBody.appendChild(createReaderPhoto(project, 1, "inline"));
    }
  });

  appendReaderText(readerSignature, project.signature);
  appendReaderText(readerFooter, "MAILED FROM HONG KONG / TO THE NEXT IDEA");
  readerAccessCopy.textContent = [
    project.title,
    project.type,
    project.date,
    project.keySentenceEn,
    project.intro,
    project.readerQuote,
    ...project.body,
    project.signature,
  ].join("\n");

  const paperImage = `url("${letterBaseCanvas.toDataURL("image/png")}")`;
  readerSheet.style.setProperty("--reader-paper", paperImage);
  readerPaperFlow.style.backgroundImage = paperImage;
  readerSheet.style.setProperty("--reader-paper-base", project.paper);
  readerSheet.style.setProperty("--reader-ink", project.ink);
  readerSheet.style.setProperty("--reader-accent", project.accent);
  readerOverlay.style.setProperty("--reader-paper-base", project.paper);
  window.requestAnimationFrame(resizeReaderPaperFlow);
}

function getReaderLines() {
  const sorted = readerChars
    .filter((element) => element.isConnected)
    .map((element) => ({
      element,
      rect: element.getBoundingClientRect(),
    }))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

  const lines = [];
  sorted.forEach((entry) => {
    const current = lines.at(-1);
    if (!current || Math.abs(entry.rect.top - current.top) > 3) {
      lines.push({ top: entry.rect.top, items: [entry] });
    } else {
      current.items.push(entry);
    }
  });

  lines.forEach((line) => {
    line.items.sort((a, b) => a.rect.left - b.rect.left);
  });
  return lines;
}

function revealReaderText() {
  readerRevealTimeline?.kill();
  readerChars.forEach((element) => {
    const width = element.getBoundingClientRect().width;
    if (width) {
      element.style.width = `${width.toFixed(2)}px`;
    }
    element.textContent = element.dataset.character;
    element.style.opacity = "0";
    element.style.clipPath = "inset(0 100% 0 0)";
    element.style.filter = "blur(0.45px)";
    element.style.transform = "translate3d(0, 0.08em, 0)";
  });

  if (reducedMotionQuery.matches) {
    readerChars.forEach((element) => {
      element.style.opacity = "1";
      element.style.clipPath = "none";
      element.style.filter = "none";
      element.style.transform = "none";
    });
    return;
  }

  const lines = getReaderLines();
  readerRevealTimeline = gsap.timeline();
  let cursor = 0.08;

  lines.forEach((line) => {
    line.items.forEach(({ element }, characterIndex) => {
      readerRevealTimeline.to(
        element,
        {
          opacity: 1,
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
          transform: "translate3d(0, 0, 0)",
          duration: 0.14,
          ease: "power2.out",
        },
        cursor + characterIndex * 0.016,
      );
    });
    cursor += Math.max(0.2, line.items.length * 0.016) + 0.055;
  });
}

function getLetterFocusPoint() {
  letterGroup.updateWorldMatrix(true, true);
  const letterTexture = {
    width: 960,
    height: 1280,
    firstRuleY: 350,
    ruleSpacing: 48,
  };
  // Land halfway between two ruled lines so neither edge crosses the frame
  // during the final close-up.
  const targetCanvasY =
    letterTexture.firstRuleY +
    letterTexture.ruleSpacing * 12 +
    letterTexture.ruleSpacing / 2;
  const targetCanvasX = letterTexture.width * 0.8;
  const targetLocalX =
    (targetCanvasX / letterTexture.width - 0.5) * SETTINGS.letterWidth;
  const targetLocalY =
    (0.5 - targetCanvasY / letterTexture.height) * SETTINGS.letterHeight;
  const blankArea = letterGroup.localToWorld(
    new THREE.Vector3(
      targetLocalX,
      targetLocalY,
      paperSurfaceOffset(targetLocalX, targetLocalY),
    ),
  );
  return blankArea;
}

function prepareReaderCameraFlight() {
  const blankArea = getLetterFocusPoint();
  const direction = camera.position.clone().sub(blankArea).normalize();
  const zoomDistance = isMobileQuery.matches ? 0.04 : 0.038;

  readerCameraState.startPosition.copy(camera.position);
  readerCameraState.startTarget.set(0, 0, 0);
  readerCameraState.startFov = camera.fov;
  readerCameraState.endPosition.copy(blankArea).addScaledVector(direction, zoomDistance);
  readerCameraState.endTarget.copy(blankArea);
  readerCameraState.endFov = camera.fov;
}

function updateReadButtonPosition() {
  if (!motion.isOpen || readerIsOpen) {
    return;
  }
  const focusPoint = getLetterFocusPoint().project(camera);
  const canvasBounds = canvasHost.getBoundingClientRect();
  const galleryBounds = gallery.getBoundingClientRect();
  const left =
    canvasBounds.left -
    galleryBounds.left +
    (focusPoint.x * 0.5 + 0.5) * canvasBounds.width;
  const top =
    canvasBounds.top -
    galleryBounds.top +
    (-focusPoint.y * 0.5 + 0.5) * canvasBounds.height;
  readButton.style.left = `${left.toFixed(2)}px`;
  readButton.style.top = `${top.toFixed(2)}px`;
}

function updateReaderCamera(progress) {
  const eased = progress * progress * (3 - 2 * progress);
  camera.position.lerpVectors(
    readerCameraState.startPosition,
    readerCameraState.endPosition,
    eased,
  );
  camera.fov = THREE.MathUtils.lerp(
    readerCameraState.startFov,
    readerCameraState.endFov,
    eased,
  );
  const target = new THREE.Vector3().lerpVectors(
    readerCameraState.startTarget,
    readerCameraState.endTarget,
    eased,
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function sampleReaderTransitionColor() {
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  gl.readPixels(
    Math.floor(gl.drawingBufferWidth / 2),
    Math.floor(gl.drawingBufferHeight / 2),
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixel,
  );
  return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
}

function paintReaderDissolve() {
  const progress = readerDissolveState.progress;
  readerChars.forEach((element) => {
    const start = Number(element.dataset.dissolveAt ?? 0);
    const local = THREE.MathUtils.clamp((progress - start) / 0.24, 0, 1);
    const eased = local * local * (3 - 2 * local);
    element.style.opacity = String(1 - eased);
    element.style.transform = `translate3d(0, ${(-12 * eased).toFixed(2)}px, 0)`;
    element.style.filter = `blur(${(2.2 * eased).toFixed(2)}px)`;
  });
}

function startReaderDissolve() {
  readerRevealTimeline?.kill();
  const bounds = readerScroll.getBoundingClientRect();
  readerDissolveState.progress = 0;

  readerChars.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const distanceFromTop = THREE.MathUtils.clamp(
      (rect.bottom - bounds.top) / Math.max(1, bounds.height),
      0,
      1,
    );
    element.dataset.dissolveAt = String((1 - distanceFromTop) * 0.76);
    element.style.opacity = "1";
    element.style.clipPath = "inset(0 0% 0 0)";
    element.style.transform = "translate3d(0, 0, 0)";
    element.style.filter = "blur(0px)";
  });

  paintReaderDissolve();
}

function openReader() {
  if (!motion.isOpen || readerIsOpen) {
    return;
  }

  readerIsOpen = true;
  hideReadEntry();
  hideNotePhotos();
  prepareReaderContent(PROJECTS[motion.projectIndex]);
  prepareReaderCameraFlight();
  readerScroll.scrollTop = 0;
  readerClose.disabled = false;
  document.body.classList.add("reader-open", "reader-zooming");
  dissolveInterfaceCopy();
  readerCameraState.progress = 0;
  readerSheet.classList.remove("is-expanded");
  readerSheet.style.opacity = "0";
  readerPaperFlow.style.opacity = "0";

  const duration = reducedMotionQuery.matches ? 0.01 : 1.15;
  readerTransitionTimeline?.kill();
  readerTransitionTimeline = gsap.timeline({
    onComplete: () => {
      readerClose.focus({ preventScroll: true });
      readerTransitionTimeline = null;
    },
  });
  readerTransitionTimeline
    .to(readerCameraState, {
      progress: 1,
      duration,
      ease: "power3.inOut",
      onUpdate: () => updateReaderCamera(readerCameraState.progress),
    })
    .to(
      {},
      {
        duration: reducedMotionQuery.matches ? 0.01 : 0.14,
        ease: "none",
      },
    )
    .call(() => {
      const transitionColor = sampleReaderTransitionColor();
      readerSheet.style.backgroundColor = transitionColor;
      readerOverlay.style.backgroundColor = transitionColor;
      Object.assign(readerSheet.style, {
        left: "0px",
        top: "0px",
        width: "100vw",
        height: "100vh",
        borderRadius: "0px",
      });
      readerOverlay.hidden = false;
      readerOverlay.classList.add("is-open");
      gsap.set(readerPaperFlow, { scale: 1.42 });
    })
    .to(readerSheet, {
      opacity: 1,
      duration: reducedMotionQuery.matches ? 0.01 : 0.38,
      ease: "power1.out",
    })
    .call(() => {
      resizeReaderPaperFlow();
      readerSheet.classList.add("is-expanded");
      gsap.set([readerToolbar, readerScroll], { opacity: 1 });
      window.requestAnimationFrame(revealReaderText);
    })
    .to(readerPaperFlow, {
      scale: 1,
      opacity: 1,
      duration: reducedMotionQuery.matches ? 0.01 : 1.1,
      ease: "power3.out",
    });
}

function closeReader(onComplete) {
  if (!readerIsOpen || readerTransitionTimeline?.isActive()) {
    return;
  }

  readerClose.disabled = true;
  startReaderDissolve();
  const durationScale = reducedMotionQuery.matches ? 0.01 : 1;
  const paperExitDuration = reducedMotionQuery.matches ? 0.01 : 0.42;
  const cameraReturnDuration = reducedMotionQuery.matches ? 0.01 : 1.16;

  readerTransitionTimeline = gsap
    .timeline({
      onComplete: () => {
        readerOverlay.classList.remove("is-open");
        readerOverlay.hidden = true;
        readerSheet.classList.remove("is-expanded");
        document.body.classList.remove("reader-open", "reader-zooming");
        readerIsOpen = false;
        showNotePhotos();
        window.setTimeout(() => {
          showReadEntry();
          readButton.focus({ preventScroll: true });
        }, reducedMotionQuery.matches ? 0 : 320);
        revealInterfaceCopy();
        readerTransitionTimeline = null;
        onComplete?.();
      },
    })
    .to(readerDissolveState, {
      progress: 1,
      duration: reducedMotionQuery.matches ? 0.01 : 1.25,
      ease: "power1.in",
      onUpdate: paintReaderDissolve,
    }, 0.25 * durationScale)
    .to(readerPaperFlow, {
      opacity: 0,
      scale: 1.22,
      duration: paperExitDuration,
      ease: "power2.in",
    }, 1.55 * durationScale)
    .to(readerSheet, {
      opacity: 0,
      duration: paperExitDuration,
      ease: "power1.in",
    }, 1.82 * durationScale)
    .call(() => {
      readerOverlay.classList.remove("is-open");
      readerOverlay.hidden = true;
    }, [], 2.28 * durationScale)
    .to(readerCameraState, {
      progress: 0,
      duration: cameraReturnDuration,
      ease: "power3.inOut",
      onUpdate: () => updateReaderCamera(readerCameraState.progress),
    }, 2.18 * durationScale)
    .to(
      [readerToolbar, readerScroll],
      {
        opacity: 0,
        duration: 0.18,
      },
      1.55 * durationScale,
    );
}

function runEnvelopeTimeline(shouldOpen) {
  if (activeTimeline) {
    return;
  }

  motion.isOpen = shouldOpen;
  if (shouldOpen) {
    setLetterClipping(true);
    flapMesh.castShadow = false;
    gsap.killTweensOf(shadowPlane.material);
    shadowPlane.material.opacity = 0;
    letterGroup.visible = true;
    foldedCover.visible = true;
    foldedCoverMaterial.opacity = 1;
    topHalfPivot.rotation.x = Math.PI;
    resetLetterText();
  } else {
    foldedCover.visible = false;
    foldedCoverMaterial.opacity = 0;
    setLetterShadowParticipation(false);
    gsap.killTweensOf(shadowPlane.material);
    shadowPlane.material.opacity = 0;
  }
  const durationScale = reducedMotionQuery.matches ? 0.01 : 1;
  updateMeta();

  activeTimeline = gsap.timeline({
    onComplete: () => {
      activeTimeline = null;
      if (!shouldOpen) {
        letterGroup.visible = false;
        flapMesh.castShadow = true;
        renderer.shadowMap.needsUpdate = true;
      } else {
        foldedCover.visible = false;
        revealLetterText();
      }
      setLetterClipping(false);
      gsap.killTweensOf(shadowPlane.material);
      gsap.to(shadowPlane.material, {
        opacity: 0.1,
        duration: reducedMotionQuery.matches ? 0.01 : 0.36,
        ease: "power2.out",
      });
      updateMeta();
    },
  });

  if (shouldOpen) {
    activeTimeline
      .to(sealGroup.scale, {
        x: 0.01,
        y: 0.01,
        duration: 0.24 * durationScale,
        ease: "back.in(1.5)",
      })
      .to(
        flapPivot.rotation,
        {
          x: SETTINGS.flapOpenAngle,
          duration: 0.84 * durationScale,
          ease: "power3.inOut",
        },
        0.06 * durationScale,
      )
      .to(
        letterGroup.position,
        {
          y: 1.3,
          z: SETTINGS.letterSlotZ,
          duration: 1.02 * durationScale,
          ease: "expo.out",
        },
        0.88 * durationScale,
      )
      .to(
        letterGroup.rotation,
        {
          x: -0.04,
          duration: 0.72 * durationScale,
          ease: "power3.out",
        },
        0.88 * durationScale,
      )
      .to(
        letterGroup.scale,
        {
          x: 0.72,
          y: 0.72,
          z: 0.72,
          duration: 0.42 * durationScale,
          ease: "expo.out",
        },
        0.88 * durationScale,
      )
      .call(() => setLetterClipping(false), [], 1.92 * durationScale)
      .to(
        letterGroup.position,
        {
          y: 0.16,
          z: 0.19,
          duration: 0.42 * durationScale,
          ease: "power2.inOut",
        },
        1.92 * durationScale,
      )
      .to(
        letterGroup.rotation,
        {
          x: -0.09,
          duration: 0.42 * durationScale,
          ease: "power2.out",
        },
        1.92 * durationScale,
      )
      .to(letterGroup.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.32 * durationScale,
        ease: "power2.out",
      }, 1.92 * durationScale)
      .to(
        foldedCoverMaterial,
        {
          opacity: 0,
          duration: 0.2 * durationScale,
          ease: "none",
        },
        2.48 * durationScale,
      )
      .call(
        () => {
          foldedCover.visible = false;
        },
        [],
        2.68 * durationScale,
      )
      .to(
        topHalfPivot.rotation,
        {
          x: 0,
          duration: 0.92 * durationScale,
          ease: "power3.inOut",
        },
        2.48 * durationScale,
      );
  } else {
    activeTimeline
      .call(startTextScramble)
      .to(
        scrambleState,
        {
          progress: 1,
          duration: 1.15 * durationScale,
          ease: "power1.in",
        },
        0.3 * durationScale,
      )
      .call(stopTextScramble, [], 1.48 * durationScale)
      .to(
        [
          topTextMaterial.uniforms.uOpacity,
          bottomTextMaterial.uniforms.uOpacity,
        ],
        {
          value: 0,
          duration: 0.16 * durationScale,
          ease: "power1.out",
        },
        1.48 * durationScale,
      )
      .to(letterGroup.position, {
        y: 1.3,
        z: 0.19,
        duration: 0.45 * durationScale,
        ease: "power2.out",
      }, 1.48 * durationScale)
      .to(
        letterGroup.scale,
        {
          x: 0.72,
          y: 0.72,
          z: 0.72,
          duration: 0.45 * durationScale,
          ease: "power2.inOut",
        },
        1.48 * durationScale,
      )
      .to(
        letterGroup.position,
        {
          y: 1.3,
          z: SETTINGS.letterSlotZ,
          duration: 0.3 * durationScale,
          ease: "power2.inOut",
        },
        1.92 * durationScale,
      )
      .to(
        topHalfPivot.rotation,
        {
          x: Math.PI,
          duration: 0.66 * durationScale,
          ease: "power3.inOut",
        },
        2.16 * durationScale,
      )
      .call(() => setLetterClipping(true), [], 2.76 * durationScale)
      .to(letterGroup.position, {
        y: -0.06,
        duration: 0.6 * durationScale,
        ease: "power2.in",
      }, 2.76 * durationScale)
      .to(
        letterGroup.rotation,
        {
          x: -0.02,
          duration: 0.58 * durationScale,
          ease: "power2.in",
        },
        2.76 * durationScale,
      )
      .to(
        flapPivot.rotation,
        {
          x: -0.012,
          duration: 0.68 * durationScale,
          ease: "power3.inOut",
        },
        3.38 * durationScale,
      )
      .to(
        sealGroup.scale,
        {
          x: 1,
          y: 1,
          duration: 0.32 * durationScale,
          ease: "back.out(2)",
        },
        4.1 * durationScale,
      );
  }
}

function toggleLetter() {
  runEnvelopeTimeline(!motion.isOpen);
}

let returnHomeTimeline = null;

function hideReturnHomeButton() {
  if (!returnHomeButton) {
    return;
  }
  returnHomeTimeline?.kill();
  returnHomeButton.setAttribute("aria-hidden", "true");
  returnHomeButton.style.pointerEvents = "none";
  returnHomeTimeline = gsap.to(returnHomeButton, {
    opacity: 0,
    y: -10,
    filter: "blur(5px)",
    duration: reducedMotionQuery.matches ? 0.01 : 0.24,
    ease: "power2.in",
  });
}

function showReturnHomeButton() {
  if (!returnHomeButton) {
    return;
  }
  returnHomeTimeline?.kill();
  returnHomeButton.removeAttribute("aria-hidden");
  returnHomeButton.style.pointerEvents = "";
  returnHomeTimeline = gsap.fromTo(
    returnHomeButton,
    { opacity: 0, y: 10, filter: "blur(5px)" },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: reducedMotionQuery.matches ? 0.01 : 0.38,
      delay: reducedMotionQuery.matches ? 0 : 0.12,
      ease: "power2.out",
    },
  );
}

function changeProject(direction) {
  if (activeTimeline) {
    return;
  }

  const nextIndex = motion.projectIndex + direction;
  const durationScale = reducedMotionQuery.matches ? 0.01 : 1;
  dissolveMobileLetterNav();
  hideReadEntry();
  dissolveInterfaceCopy();
  hideReturnHomeButton();

  if (motion.isOpen) {
    foldedCover.visible = true;
    foldedCoverMaterial.opacity = 1;
    resetLetterText({ hideEntry: false });
    activeTimeline = gsap
      .timeline({
        onComplete: () => {
          activeTimeline = null;
          foldedCover.visible = false;
          revealLetterText();
          updateMeta();
          revealInterfaceCopy();
          showReturnHomeButton();
          revealMobileLetterNav();
        },
      })
      .to(
        topHalfPivot.rotation,
        {
          x: Math.PI,
          duration: 0.4 * durationScale,
          ease: "power3.inOut",
        },
        0,
      )
      .call(() => setProject(nextIndex), [], 0.64 * durationScale)
      .to(
        topHalfPivot.rotation,
        {
          x: 0,
          duration: 0.62 * durationScale,
          ease: "power3.out",
        },
        0.46 * durationScale,
      )
      .to(
        foldedCoverMaterial,
        {
          opacity: 0,
          duration: 0.2 * durationScale,
          ease: "none",
        },
        0.46 * durationScale,
      )
      .call(() => revealInterfaceCopy(), [], 0.86 * durationScale);
  } else {
    const fallDirection = direction > 0 ? -1 : 1;
    const hiddenBelow = isMobileQuery.matches ? -5.2 : -3.5;
    const pullStartY = isMobileQuery.matches ? -5.35 : -3.65;
    activeTimeline = gsap
      .timeline({
        onComplete: () => {
          activeTimeline = null;
          updateMeta();
          revealInterfaceCopy();
          showReturnHomeButton();
          revealMobileLetterNav();
        },
      })
      .to(shadowPlane.material, {
        opacity: 0,
        duration: 0.3 * durationScale,
        ease: "power2.in",
      }, 0)
      .to(envelopeAssembly.position, {
        y: hiddenBelow,
        z: -0.2,
        duration: 0.7 * durationScale,
        ease: "power3.in",
      }, 0)
      .to(envelopeAssembly.scale, {
        x: 0.96,
        y: 0.96,
        z: 0.96,
        duration: 0.7 * durationScale,
        ease: "power3.in",
      }, 0)
      .to(envelopeAssembly.rotation, {
        z: fallDirection * 0.035,
        duration: 0.7 * durationScale,
        ease: "power2.in",
      }, 0)
      .call(() => {
        setProject(nextIndex);
        gsap.set(envelopeAssembly.position, { y: pullStartY, z: -0.12 });
        gsap.set(envelopeAssembly.scale, { x: 0.96, y: 0.96, z: 0.96 });
        gsap.set(envelopeAssembly.rotation, {
          z: fallDirection * -0.02,
        });
        gsap.set(sealGroup.scale, { x: 0.82, y: 0.82, z: 0.82 });
      }, [], 0.74 * durationScale)
      .to(envelopeAssembly.position, {
        y: 0,
        z: 0,
        duration: 0.68 * durationScale,
        ease: "power3.out",
      }, 0.74 * durationScale)
      .to(envelopeAssembly.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.68 * durationScale,
        ease: "back.out(1.5)",
      }, 0.74 * durationScale)
      .to(envelopeAssembly.rotation, {
        z: 0,
        duration: 0.64 * durationScale,
        ease: "power3.out",
      }, 0.74 * durationScale)
      .to(sealGroup.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.34 * durationScale,
        ease: "back.out(2.4)",
      }, 1.22 * durationScale)
      .to(shadowPlane.material, {
        opacity: 0.1,
        duration: 0.36 * durationScale,
        ease: "power2.out",
      }, 1.04 * durationScale)
      .call(() => revealInterfaceCopy(), [], 1.38 * durationScale);
  }
}

function handlePointerDown(event) {
  if (isNotesTransitioning) {
    return;
  }

  if (event.target.closest("a, button")) {
    return;
  }

  motion.dragging = true;
  if (isLandingMode) {
    liveStatus.textContent = "正在拖动封面信封。";
  }
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;
  motion.downX = event.clientX;
  motion.downY = event.clientY;
  motion.velocityX = 0;
  motion.velocityY = 0;
  gallery.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  const bounds = gallery.getBoundingClientRect();
  motion.pointerX = (event.clientX / bounds.width) * 2 - 1;
  motion.pointerY = (event.clientY / bounds.height) * 2 - 1;

  if (!motion.dragging) {
    return;
  }

  const deltaX = event.clientX - motion.lastX;
  const deltaY = event.clientY - motion.lastY;
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;

  motion.targetY += deltaX * SETTINGS.dragSpeed;
  motion.targetX += deltaY * SETTINGS.dragSpeed * 0.7;
  motion.velocityY = deltaX * SETTINGS.dragSpeed;
  motion.velocityX = deltaY * SETTINGS.dragSpeed * 0.7;
}

function handlePointerUp(event) {
  if (!motion.dragging) {
    return;
  }

  const moved = Math.hypot(
    event.clientX - motion.downX,
    event.clientY - motion.downY,
  );
  motion.dragging = false;
  if (reducedMotionQuery.matches) {
    motion.velocityX = 0;
    motion.velocityY = 0;
  }
  gallery.releasePointerCapture?.(event.pointerId);

  if (isLandingMode) {
    liveStatus.textContent =
      moved < 6
        ? "封面信封是一枚互动物件。按住拖动会让它晃动。"
        : "已放开信封。它会在原位带着惯性轻轻晃动。";
    return;
  }

  if (moved < 6) {
    toggleLetter();
  }
}

function handleWheel(event) {
  if (
    isLandingMode ||
    isNotesTransitioning ||
    event.ctrlKey ||
    activeTimeline
  ) {
    return;
  }

  event.preventDefault();
  const now = performance.now();
  if (now - wheelLastTime > 180) {
    wheelAmount = 0;
  }
  wheelLastTime = now;
  wheelAmount += event.deltaY;

  if (Math.abs(wheelAmount) > 38) {
    changeProject(wheelAmount > 0 ? 1 : -1);
    wheelAmount = 0;
  }
}

function handleKeyDown(event) {
  if (isLandingMode || isNotesTransitioning) {
    return;
  }

  if (event.target.closest("button")) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    changeProject(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    changeProject(1);
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    toggleLetter();
  }
}

gallery.addEventListener("pointerdown", handlePointerDown);
gallery.addEventListener("pointermove", handlePointerMove);
gallery.addEventListener("pointerup", handlePointerUp);
gallery.addEventListener("pointercancel", handlePointerUp);
gallery.addEventListener("pointerleave", () => {
  if (!motion.dragging) {
    motion.pointerX = 0;
    motion.pointerY = 0;
  }
});
gallery.addEventListener("wheel", handleWheel, { passive: false });
gallery.addEventListener("keydown", handleKeyDown);
readButton.addEventListener("click", openReader);
previousLetterButton?.addEventListener("click", () => changeProject(-1));
nextLetterButton?.addEventListener("click", () => changeProject(1));
notesNavigationLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (isNotesTransitioning) {
      return;
    }

    isNotesTransitioning = true;
    notesNavigationLinks.forEach((item) => {
      item.setAttribute("aria-disabled", "true");
    });
    document.body.classList.add("leaving-for-notes");
    liveStatus.textContent = "合上手记，正在去往六封信。";

    const navigate = () => {
      sessionStorage.setItem("ray:notes-transition", "from-right");
      window.location.assign("/notes.html");
    };

    if (reducedMotionQuery.matches) {
      gsap.set(pageTransitionCover, {
        display: "block",
        opacity: 1,
        pointerEvents: "auto",
      });
      window.setTimeout(navigate, 80);
      return;
    }

    gsap.set(pageTransitionCover, {
      display: "block",
      opacity: 0,
      pointerEvents: "auto",
    });
    gsap
      .timeline()
      .to(
        [
          topTextMaterial.uniforms.uOpacity,
          bottomTextMaterial.uniforms.uOpacity,
        ],
        {
          value: 0,
          duration: 0.34,
          ease: "power2.out",
        },
        0,
      )
      .to(
        envelopeMotion.position,
        {
          x: isMobileQuery.matches ? 7.8 : 6.8,
          z: -0.45,
          duration: 0.92,
          ease: "power3.in",
        },
        0.34,
      )
      .to(
        envelopeMotion.rotation,
        {
          z: -0.12,
          duration: 0.92,
          ease: "power2.in",
        },
        0.34,
      )
      .to(
        pageTransitionCover,
        {
          opacity: 1,
          duration: 0.2,
          ease: "power1.in",
        },
        1.06,
      )
      .call(navigate);
  });
});
function beginReturnToHome() {
  if (isNotesTransitioning) {
    return;
  }

  isNotesTransitioning = true;
  document.body.classList.add("notes-leaving");
  liveStatus.textContent = "合上手记，正在回到主页。";

  const navigate = () => {
    sessionStorage.setItem(
      "ray:home-transition",
      "return-from-right",
    );
    window.location.assign("/");
  };

  if (reducedMotionQuery.matches) {
    gsap.set(pageTransitionCover, {
      display: "block",
      opacity: 1,
      pointerEvents: "auto",
    });
    window.setTimeout(navigate, 80);
    return;
  }

  gsap.set(pageTransitionCover, {
    display: "block",
    opacity: 0,
    pointerEvents: "auto",
  });
  gsap
    .timeline()
    .to(
      [
        topTextMaterial.uniforms.uOpacity,
        bottomTextMaterial.uniforms.uOpacity,
      ],
      {
        value: 0,
        duration: 0.34,
        ease: "power2.out",
      },
      0,
    )
    .to(
      envelopeMotion.position,
      {
        x: isMobileQuery.matches ? 7.8 : 6.8,
        z: -0.45,
        duration: 0.92,
        ease: "power3.in",
      },
      0.34,
    )
    .to(
      envelopeMotion.rotation,
      {
        z: 0.12,
        duration: 0.92,
        ease: "power2.in",
      },
      0.34,
    )
    .to(
      pageTransitionCover,
      {
        opacity: 1,
        duration: 0.2,
        ease: "power1.in",
      },
      1.06,
    )
    .call(navigate);
}

returnHomeButton?.addEventListener("click", (event) => {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  beginReturnToHome();
});
readerReturnHomeButton?.addEventListener("click", (event) => {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  if (readerIsOpen) {
    closeReader(beginReturnToHome);
  } else {
    beginReturnToHome();
  }
});
window.addEventListener("ray:open-note", (event) => {
  if (isLandingMode) {
    return;
  }

  const index = Number(event.detail?.index);
  if (!Number.isInteger(index) || index < 0 || index >= PROJECTS.length) {
    return;
  }

  if (readerIsOpen || activeTimeline) {
    return;
  }

  setProject(index);
  motion.isOpen = true;
  openReader();
});
readerClose.addEventListener("click", () => closeReader());
readerOverlay.addEventListener("click", (event) => {
  if (event.target === readerOverlay) {
    closeReader();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && readerIsOpen) {
    event.preventDefault();
    closeReader();
    return;
  }
  if (event.key === "Tab" && readerIsOpen) {
    const focusable = [
      ...readerOverlay.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !readerOverlay.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !readerOverlay.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
});

function resize() {
  const width = canvasHost.clientWidth;
  const height = canvasHost.clientHeight;
  const mobile = isMobileQuery.matches;
  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    mobile ? SETTINGS.mobilePixelRatioCap : SETTINGS.desktopPixelRatioCap,
  );

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  if (!readerIsOpen) {
    camera.fov = mobile ? 48 : 35;
    camera.position.z = mobile ? 6.15 : SETTINGS.cameraZ;
    modelMount.position.x = !mobile && width < 1200 ? -0.1 : 0;
  } else {
    window.requestAnimationFrame(resizeReaderPaperFlow);
  }
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvasHost);
resize();

const visibilityObserver = new IntersectionObserver(
  ([entry]) => {
    isVisible = entry.isIntersecting;
  },
  { rootMargin: "100px" },
);
visibilityObserver.observe(gallery);

document.addEventListener("visibilitychange", () => {
  isPageVisible = document.visibilityState === "visible";
});

function animate(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;

  if (!isVisible || !isPageVisible) {
    renderer.setAnimationLoop(animate);
    return;
  }

  if (
    !readerIsOpen &&
    !motion.dragging &&
    !isNotesTransitioning &&
    !reducedMotionQuery.matches
  ) {
    motion.targetY += motion.velocityY;
    motion.targetX += motion.velocityX;
    motion.velocityY *= 0.9;
    motion.velocityX *= 0.9;

    const hoverX = SETTINGS.restRotationX + motion.pointerY * 0.045;
    const hoverY = SETTINGS.restRotationY + motion.pointerX * 0.095;
    motion.targetX += (hoverX - motion.targetX) * delta * 0.7;
    motion.targetY += (hoverY - motion.targetY) * delta * 0.7;

  }

  if (!readerIsOpen && !isNotesTransitioning) {
    motion.targetX = THREE.MathUtils.clamp(motion.targetX, -0.28, 0.2);
    motion.targetY = THREE.MathUtils.clamp(motion.targetY, -0.62, 0.4);
    paperReflectionLight.position.x = -2.8 + motion.pointerX * 1.05;
    paperReflectionLight.position.y = 3.5 - motion.pointerY * 0.68;
    paperReflectionLight.lookAt(0, 0, 0);
    motion.x = THREE.MathUtils.damp(
      motion.x,
      motion.targetX,
      reducedMotionQuery.matches ? 1000 : SETTINGS.followSpeed,
      delta,
    );
    motion.y = THREE.MathUtils.damp(
      motion.y,
      motion.targetY,
      reducedMotionQuery.matches ? 1000 : SETTINGS.followSpeed,
      delta,
    );

    envelopeMotion.rotation.x = motion.x;
    envelopeMotion.rotation.y = motion.y;
    envelopeMotion.rotation.z =
      -0.035 +
      (reducedMotionQuery.matches ? 0 : Math.sin(now * 0.00045) * 0.006);

  }
  updateEnvelopeMouthPlane();
  updateReadButtonPosition();
  renderer.render(scene, camera);
}

function revealNotesArrivalContent() {
  if (!awaitingNotesArrival) {
    return;
  }

  gsap.set(notesArrivalText, { opacity: 0, y: 10 });
  document.documentElement.removeAttribute("data-arrival");
  awaitingNotesArrival = false;
  revealInterfaceCopy();
  gsap.to(notesArrivalText, {
    opacity: 1,
    y: 0,
    duration: reducedMotionQuery.matches ? 0.01 : 0.58,
    stagger: reducedMotionQuery.matches ? 0 : 0.07,
    ease: "power2.out",
  });
  revealMobileLetterNav();
}

function revealHomeArrivalContent() {
  if (!awaitingHomeArrival) {
    return;
  }

  gsap.set(homeArrivalText, { opacity: 0, y: 10 });
  document.documentElement.removeAttribute("data-home-arrival");
  awaitingHomeArrival = false;
  revealInterfaceCopy();
  gsap.to(homeArrivalText, {
    opacity: 1,
    y: 0,
    duration: reducedMotionQuery.matches ? 0.01 : 0.58,
    stagger: reducedMotionQuery.matches ? 0 : 0.07,
    ease: "power2.out",
  });
}

if (isHomeArrival) {
  if (reducedMotionQuery.matches) {
    gsap.set(pageTransitionCover, {
      display: "none",
      opacity: 0,
      pointerEvents: "none",
    });
    revealHomeArrivalContent();
  } else {
    gsap.set(pageTransitionCover, {
      display: "block",
      opacity: 1,
      pointerEvents: "auto",
    });
    gsap.set(introRoot.position, { x: 0, y: 0, z: 0 });
    gsap.set(introRoot.rotation, { x: 0, y: 0, z: 0 });
    gsap.set(envelopeMotion.position, {
      x: isMobileQuery.matches ? 7.8 : 6.8,
      z: -0.35,
    });
    renderer.render(scene, camera);
    gsap
      .timeline({ delay: 0.08 })
      .to(pageTransitionCover, {
        opacity: 0,
        duration: 0.18,
        ease: "power1.out",
      })
      .to(envelopeMotion.position, {
        x: 0,
        z: 0,
        duration: 1.35,
        ease: "power3.out",
      }, 0.05)
      .call(revealHomeArrivalContent)
      .set(pageTransitionCover, {
        display: "none",
        pointerEvents: "none",
      });
  }
} else if (isNotesArrival) {
  if (reducedMotionQuery.matches) {
    gsap.set(pageTransitionCover, {
      display: "none",
      opacity: 0,
      pointerEvents: "none",
    });
    revealNotesArrivalContent();
  } else {
    gsap.set(pageTransitionCover, {
      display: "block",
      opacity: 1,
      pointerEvents: "auto",
    });
    gsap.set(introRoot.position, { x: 0, y: 0, z: 0 });
    gsap.set(introRoot.rotation, { x: 0, y: 0, z: 0 });
    gsap.set(envelopeMotion.position, {
      x: isMobileQuery.matches ? 7.8 : 6.8,
      z: -0.35,
    });
    renderer.render(scene, camera);
    gsap
      .timeline({ delay: 0.08 })
      .to(pageTransitionCover, {
        opacity: 0,
        duration: 0.18,
        ease: "power1.out",
      })
      .to(envelopeMotion.position, {
        x: 0,
        z: 0,
        duration: 1.35,
        ease: "power3.out",
      }, 0.05)
      .call(revealNotesArrivalContent)
      .set(pageTransitionCover, {
        display: "none",
        pointerEvents: "none",
      });
  }
} else if (!reducedMotionQuery.matches) {
  gsap.set(introRoot.position, { y: -2.2, z: -0.7 });
  gsap.set(introRoot.rotation, { z: -0.12, y: -0.32 });
  gsap
    .timeline()
    .to(introRoot.position, {
      y: 0,
      z: 0,
      duration: 1.45,
      ease: "expo.out",
    })
    .to(
      introRoot.rotation,
      {
        z: 0,
        y: 0,
        duration: 1.65,
        ease: "power3.out",
      },
      0,
    )
    .call(revealMobileLetterNav);
}

if (reducedMotionQuery.matches && !isNotesArrival) {
  revealMobileLetterNav();
}

updateMeta();

const copyVisibilityObserver = new IntersectionObserver(
  ([entry]) => {
    if (awaitingNotesArrival || awaitingHomeArrival) {
      return;
    }
    if (entry.isIntersecting) {
      revealInterfaceCopy();
    } else {
      dissolveInterfaceCopy();
    }
  },
  { threshold: 0.08 },
);
copyVisibilityObserver.observe(gallery);

renderer.setAnimationLoop(animate);

window.addEventListener("beforeunload", () => {
  stopTextScramble();
  textRevealTimeline?.kill();
  readerRevealTimeline?.kill();
  readerTransitionTimeline?.kill();
  resizeObserver.disconnect();
  visibilityObserver.disconnect();
  copyVisibilityObserver.disconnect();
  letterBaseTexture.dispose();
  letterTextTexture.dispose();
  waxSealCache.forEach((model) => disposeWaxSealModel(model));
  paperSurfaceCache.forEach((surface) => {
    surface.colorTexture.dispose();
    surface.bumpTexture.dispose();
    surface.normalTexture.dispose();
    surface.roughnessTexture.dispose();
  });
  envelopeMaterial.dispose();
  flapMaterial.dispose();
  letterMaterial.dispose();
  letterBackMaterial.dispose();
  topTextMaterial.dispose();
  bottomTextMaterial.dispose();
  foldedCoverMaterial.dispose();
  environmentTarget.dispose();
  renderer.dispose();
});
