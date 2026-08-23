export async function loadTextures(paths) {
  const textureLoader = new THREE.TextureLoader();

  return Promise.all(
    paths.map(path =>
      new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          texture => resolve(texture),
          undefined,
          error => reject(
            new Error(`Failed to load texture: ${path}`, {
              cause: error
            })
          )
        );
      })
    )
  );
}