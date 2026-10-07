// Turns each .example-tabs block into a set of tabs, one per child with a
// data-tab label. Runs after ReSpec in the editor's draft, and on load in
// the published document.
(function () {
  function build() {
    for (const box of document.querySelectorAll(".example-tabs")) {
      for (const old of box.querySelectorAll(":scope > .tab-bar")) old.remove();
      const panes = [...box.querySelectorAll(":scope > [data-tab]")];
      if (!panes.length) continue;
      const bar = document.createElement("div");
      bar.className = "tab-bar";
      bar.setAttribute("role", "tablist");
      const select = (i) => panes.forEach((pane, j) => {
        pane.hidden = i !== j;
        bar.children[j].setAttribute("aria-selected", String(i === j));
      });
      panes.forEach((pane, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "tab");
        button.textContent = pane.dataset.tab;
        button.addEventListener("click", () => select(i));
        bar.append(button);
      });
      box.prepend(bar);
      box.classList.add("ready");
      select(0);
    }
  }
  function start() {
    if (document.respec) document.respec.ready.then(build);
    else build();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
