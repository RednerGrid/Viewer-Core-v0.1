export function renderToolbar(actions = [], openScene) {
  const toolbar = document.getElementById("toolbar");
  toolbar.innerHTML = "";

  actions.forEach(action => {
    const button = document.createElement("button");
    button.className = "toolbar-btn";
    button.textContent = action.title;

    button.addEventListener("click", () => {
      openScene(action);
    });

    toolbar.appendChild(button);
  });
}