const root = document.documentElement;
const topbar = document.querySelector(".topbar");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".nav-links a");
const revealEls = document.querySelectorAll(".reveal");
const tiltEls = document.querySelectorAll("[data-tilt]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const updateTopbar = () => {
  topbar?.classList.toggle("is-scrolled", window.scrollY > 18);
};

window.addEventListener("scroll", updateTopbar, { passive: true });
updateTopbar();

navToggle?.addEventListener("click", () => {
  const isOpen = topbar?.dataset.open === "true";
  if (!topbar) return;
  topbar.dataset.open = String(!isOpen);
  navToggle.setAttribute("aria-expanded", String(!isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!topbar) return;
    topbar.dataset.open = "false";
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16 },
  );

  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

const revealVisibleNow = () => {
  revealEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96 && rect.bottom > 0) {
      el.classList.add("is-visible");
    }
  });
};

requestAnimationFrame(revealVisibleNow);
window.setTimeout(revealVisibleNow, 180);

window.addEventListener(
  "pointermove",
  (event) => {
    root.style.setProperty("--cursor-x", `${event.clientX}px`);
    root.style.setProperty("--cursor-y", `${event.clientY}px`);
  },
  { passive: true },
);

tiltEls.forEach((el) => {
  el.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(max-width: 820px)").matches) return;

    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${y * -4.5}deg) rotateY(${x * 6}deg) translateY(-4px)`;
  });

  el.addEventListener("pointerleave", () => {
    el.style.transform = "";
  });
});

const canvas = document.querySelector("#network-canvas");
const ctx = canvas?.getContext("2d");
let width = 0;
let height = 0;
let dpr = 1;
let nodes = [];
let pointer = { x: 0, y: 0, active: false };

const nodeColors = [
  "rgba(99, 199, 255, 0.78)",
  "rgba(88, 213, 255, 0.68)",
  "rgba(124, 156, 255, 0.5)",
];

const resizeNetworkCanvas = () => {
  if (!canvas || !ctx) return;

  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const nodeCount = Math.max(38, Math.min(92, Math.round((width * height) / 17000)));
  nodes = Array.from({ length: nodeCount }, (_, index) => {
    const bias = index / nodeCount;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      size: 1.2 + Math.random() * 2.8,
      color: nodeColors[index % nodeColors.length],
      layer: 0.55 + bias * 0.7,
    };
  });
};

const drawNetwork = () => {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  nodes.forEach((node) => {
    node.x += node.vx * node.layer;
    node.y += node.vy * node.layer;

    if (node.x < -20) node.x = width + 20;
    if (node.x > width + 20) node.x = -20;
    if (node.y < -20) node.y = height + 20;
    if (node.y > height + 20) node.y = -20;
  });

  ctx.lineWidth = 1;

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];

    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.hypot(dx, dy);
      const maxDistance = width < 720 ? 96 : 138;

      if (distance > maxDistance) continue;

      const alpha = (1 - distance / maxDistance) * 0.18;
      ctx.strokeStyle = `rgba(99, 199, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (pointer.active) {
      const dx = a.x - pointer.x;
      const dy = a.y - pointer.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 180) {
        const alpha = (1 - distance / 180) * 0.42;
        ctx.strokeStyle = `rgba(88, 213, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
  }

  ctx.globalCompositeOperation = "lighter";
  nodes.forEach((node) => {
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
    ctx.fill();
  });

  if (pointer.active) {
    ctx.fillStyle = "rgba(88, 213, 255, 0.72)";
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!reducedMotion.matches) {
    requestAnimationFrame(drawNetwork);
  }
};

if (canvas && ctx) {
  resizeNetworkCanvas();
  window.addEventListener("resize", resizeNetworkCanvas, { passive: true });

  canvas.closest(".hero")?.addEventListener(
    "pointermove",
    (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    },
    { passive: true },
  );

  canvas.closest(".hero")?.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  drawNetwork();
}

const briefForm = document.querySelector("#brief-form");
const previewText = document.querySelector("#brief-preview-text");
const complexityInput = document.querySelector("#complexity");
const complexityOutput = document.querySelector("#complexity-output");
const contextInput = document.querySelector("#brief-context");
const statusEl = document.querySelector("#form-status");
const whatsappNumber = "5519992072301";

const briefState = {
  project: "landing page",
  style: "azul escuro",
  timeline: "7 a 14 dias",
  complexity: "3",
};

const updateBriefPreview = () => {
  briefState.complexity = complexityInput?.value || briefState.complexity;

  if (complexityInput) {
    const min = Number(complexityInput.min) || 1;
    const max = Number(complexityInput.max) || 5;
    const value = Number(briefState.complexity);
    const fill = ((value - min) / (max - min)) * 100;
    complexityInput.style.setProperty("--range-fill", `${fill}%`);
  }

  if (complexityOutput) {
    complexityOutput.textContent = `${briefState.complexity}/5`;
  }

  if (previewText) {
    previewText.textContent = `${briefState.project} | ${briefState.style} | ${briefState.timeline} | complexidade ${briefState.complexity}/5`;
  }
};

document.querySelectorAll(".chip-group").forEach((group) => {
  group.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    group.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.remove("is-active");
      chip.setAttribute("aria-pressed", "false");
    });

    target.classList.add("is-active");
    target.setAttribute("aria-pressed", "true");
    briefState[group.dataset.choice] = target.dataset.value || "";
    updateBriefPreview();
  });
});

complexityInput?.addEventListener("input", updateBriefPreview);
updateBriefPreview();

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
};

briefForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  updateBriefPreview();

  const context = contextInput?.value.trim();
  const lines = [
    "Oi, Henry. Quero começar um projeto com você.",
    `Tipo: ${briefState.project}`,
    `Estética: ${briefState.style}`,
    `Prazo: ${briefState.timeline}`,
    `Complexidade: ${briefState.complexity}/5`,
  ];

  if (context) {
    lines.push(`Contexto: ${context}`);
  }

  lines.push("Podemos conversar sobre escopo, preço e próximos passos?");

  try {
    const message = lines.join("\n");
    await copyText(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    statusEl.textContent = "Mensagem copiada e WhatsApp aberto para o número (19) 99207-2301.";
  } catch {
    statusEl.textContent = "Não consegui copiar automaticamente, mas a mensagem está montada acima.";
  }
});

