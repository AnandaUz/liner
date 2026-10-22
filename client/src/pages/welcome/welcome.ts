import html from "./welcome.html?raw";
import "./welcome.scss";

export function welcomePage() {
  return {
    html,
    title: "Добро пожаловать — Liner",
    init() {
      const renderBtn = () => {
        const btn = document.querySelector(".google-btn");
        if (btn && (window as any).google?.accounts?.id?.renderButton) {
          (window as any).google.accounts.id.renderButton(btn, {
            theme: "outline",
            size: "large",
          });
          return true;
        }
        return false;
      };

      if (!renderBtn()) {
        const timer = setInterval(() => {
          if (renderBtn()) clearInterval(timer);
        }, 100);
      }
    },
  };
}
