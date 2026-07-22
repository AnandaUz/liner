import html from "./welcome.html?raw";
import "./welcome.scss";

export function welcomePage() {
  return {
    html,
    title: "Добро пожаловать — Liner",
    init() {
      (window as any).google?.accounts?.id?.renderButton(
        document.querySelector(".google-btn"),
        { theme: "outline", size: "large" },
      );
    },
  };
}
