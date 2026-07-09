export async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить JSON: ${path}`);
  }

  return await response.json();
}

export async function loadProject(projectId) {
  const basePath = `projects/${projectId}/`;

  const project = await loadJson(`${basePath}project.json`);

  const scenes = {};

  for (const sceneId of project.scenes) {
    scenes[sceneId] = await loadJson(`${basePath}scenes/${sceneId}.json`);
  }

  return {
    ...project,
    basePath,
    scenes
  };
}