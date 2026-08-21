// Central design tokens for Vetty's light-blue and gold visual system.
// Keep this in sync with tailwind.config.js if you extend the palette.
export const C = {
  maroon: "#1376B8",
  maroonDark: "#07517F",
  rose: "#248FCD",
  gold: "#F6C94C",
  goldDark: "#DDAA24",
  charcoal: "#123047",
  gray: "#60768A",
  lightGray: "#D9E7F1",
  sectionBg: "#F3F9FD",
  success: "#29966D",
  danger: "#D95662",
  warning: "#E7AF22",
};

export const GRADIENT = `linear-gradient(145deg, ${C.maroonDark} 0%, ${C.maroon} 58%, ${C.rose} 100%)`;
export const serif = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";
export const sans = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

export const statusColor = (s) =>
  ({
    pending: [C.gold, C.maroonDark],
    approved: [C.success, "#fff"],
    completed: [C.success, "#fff"],
    delivered: [C.success, "#fff"],
    out_for_delivery: [C.gold, C.maroonDark],
    rejected: [C.danger, "#fff"],
  }[s] || [C.lightGray, C.charcoal]);
