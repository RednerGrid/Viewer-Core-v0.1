import { renderToolbar } from "../ui/toolbar.js";

let viewerRef = null;

export async function init({ project, scene, viewer, openScene }) {
  viewerRef = viewer;

  renderToolbar(scene.actions, openScene);

  const image = document.createElement("img");
  image.src = `${project.basePath}${scene.assets.image}`;
  image.className = "overview-image";

  viewer.appendChild(image);
}

export function destroy() {
  if (viewerRef) {
    viewerRef.innerHTML = "";
  }

  viewerRef = null;
}

export function resize() {}

export function update() {}