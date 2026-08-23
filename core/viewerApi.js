let activeViewerApi = null;

export function registerViewerApi(api) {
  activeViewerApi = api;
}

export function getViewerApi() {
  return activeViewerApi;
}

export function clearViewerApi() {
    activeViewerApi = null;
}