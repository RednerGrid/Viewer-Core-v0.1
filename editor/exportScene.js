import { getEditableScene } from "./editorState.js";

export function exportScene() {

    const scene = getEditableScene();

    if (!scene) {
        alert("Нет активной сцены.");
        return;
    }

    const json = JSON.stringify(scene, null, 2);

    const blob = new Blob(
        [json],
        {
            type: "application/json"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${scene.id}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}