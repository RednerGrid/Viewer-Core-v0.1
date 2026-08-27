export class RouteGraph {
  constructor(graphData) {
    if (!graphData) {
      throw new Error(
        "RouteGraph: graphData отсутствует."
      );
    }

    this.version =
      graphData.version ?? 1;

    this.startPanorama =
      graphData.startPanorama;

    this.startView =
      graphData.startView ?? null;

    this.panoramas =
      graphData.panoramas ?? {};

    this.edges =
      graphData.edges ?? {};
  }


  getPanorama(id) {
    return (
      this.panoramas[id] ??
      null
    );
  }


  getStartPanorama() {
    return this.getPanorama(
      this.startPanorama
    );
  }


  /*
    Возвращает все переходы,
    доступные из panoramaId.

    Runtime получает уже
    нормализованное направление:
    source → target.
  */

  getEdgesForPanorama(
    panoramaId
  ) {
    const result = [];

    for (
      const edge
      of Object.values(
        this.edges
      )
    ) {

      /*
        FROM → TO
      */

      if (
        edge.from?.panorama ===
        panoramaId
      ) {
        result.push({
          id: edge.id,

          edge,

          direction: "forward",

          sourcePanoramaId:
            edge.from.panorama,

          targetPanoramaId:
            edge.to.panorama,

          yaw:
            edge.from.yaw ?? 0,

          pitch:
            edge.from.pitch ?? 0,

          distance:
            edge.from.distance ?? 400,

          gateWidth:
            edge.from.gateWidth ?? 120,

          gateRotation:
            edge.from.gateRotation ?? 0,

          video:
            edge.videos?.forward ??
            null
        });

        continue;
      }


      /*
        TO → FROM
      */

      if (
        edge.to?.panorama ===
        panoramaId
      ) {
        result.push({
          id: edge.id,

          edge,

          direction: "reverse",

          sourcePanoramaId:
            edge.to.panorama,

          targetPanoramaId:
            edge.from.panorama,

          yaw:
            edge.to.yaw ?? 0,

          pitch:
            edge.to.pitch ?? 0,

          distance:
            edge.to.distance ?? 400,

          gateWidth:
            edge.to.gateWidth ?? 120,

          gateRotation:
            edge.to.gateRotation ?? 0,

          video:
            edge.videos?.reverse ??
            null
        });
      }
    }

    return result;
  }
}