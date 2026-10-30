// Accessible autocomplete (ARIA 1.2 combobox, list popup). Used by search and typed quiz answers.
import { h } from "./util.js";

let uid = 0;
/**
 * @param {HTMLInputElement} input
 * @param {HTMLUListElement} list
 * @param {{ getItems:(q:string)=>{key:string,label:string,sub?:string}[], onChoose:(item)=>void, onSubmit?:(text:string)=>void, minChars?:number }} opts
 */
export function createCombobox(input, list, opts) {
  const id = `cb${++uid}`;
  list.id = list.id || `${id}-list`;
  list.setAttribute("role", "listbox");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("spellcheck", "false");
  let items = [], active = -1;

  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; };
  const setActive = (i) => {
    active = i;
    [...list.children].forEach((li, n) => { li.setAttribute("aria-selected", String(n === i)); li.classList.toggle("is-active", n === i); });
    if (i >= 0) { input.setAttribute("aria-activedescendant", list.children[i].id); list.children[i].scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  };
  const choose = (item) => { close(); opts.onChoose(item); };
  const render = () => {
    const q = input.value;
    items = q.trim().length >= (opts.minChars ?? 1) ? opts.getItems(q) : [];
    list.replaceChildren(...items.map((it, n) => {
      const li = h("li", { role: "option", id: `${id}-o${n}`, "aria-selected": "false", class: "suggestion" },
        h("span", {}, it.label), it.sub ? h("span", { class: "suggestion-sub" }, it.sub) : null);
      // pointerdown (not click) so the input keeps focus and the list does not close first
      li.addEventListener("pointerdown", (e) => { e.preventDefault(); choose(it); });
      return li;
    }));
    list.hidden = items.length === 0;
    input.setAttribute("aria-expanded", String(items.length > 0));
    active = -1;
  };

  input.addEventListener("input", render);
  input.addEventListener("focus", () => { if (input.value) render(); });
  input.addEventListener("blur", () => setTimeout(close, 120));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) render(); if (items.length) setActive((active + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) setActive((active - 1 + items.length) % items.length); }
    else if (e.key === "Escape") { if (!list.hidden) { e.preventDefault(); close(); } }
    else if (e.key === "Enter") {
      if (active >= 0 && items[active]) { e.preventDefault(); choose(items[active]); }
      else if (opts.onSubmit) { e.preventDefault(); close(); opts.onSubmit(input.value); }
    }
  });
  return { close, render };
}
