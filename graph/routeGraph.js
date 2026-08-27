export class RouteGraph {
  constructor(config) {
    this.config = config;

    this.nodes =
      config.nodes ?? {};

    this.edges =
      config.edges ?? {};

    this.startNodeId =
      config.startNode ?? null;

    this.validate();
  }

  getStartNode() {
    return this.getNode(
      this.startNodeId
    );
  }

  getNode(nodeId) {
    return this.nodes[nodeId] ?? null;
  }

  getEdge(edgeId) {
    return this.edges[edgeId] ?? null;
  }

  getEdgesForNode(nodeId) {
    return Object
      .values(this.edges)
      .filter(edge =>
        edge.from === nodeId ||
        edge.to === nodeId
      )
      .map(edge =>
        this.createNodeEdgeView(
          edge,
          nodeId
        )
      );
  }

  createNodeEdgeView(
    edge,
    nodeId
  ) {
    const forward =
      edge.from === nodeId;

    return {
      id: edge.id,

      edge,

      direction:
        forward
          ? "forward"
          : "reverse",

      sourceNodeId:
        nodeId,

      targetNodeId:
        forward
          ? edge.to
          : edge.from,

      yaw:
        forward
          ? edge.fromYaw
          : edge.toYaw,

      video:
        forward
          ? edge.forward
          : edge.reverse
    };
  }

  validate() {
    if (!this.startNodeId) {
      throw new Error(
        "RouteGraph: startNode не указан."
      );
    }

    if (!this.nodes[this.startNodeId]) {
      throw new Error(
        `RouteGraph: startNode "${this.startNodeId}" не найден.`
      );
    }

    Object.values(
      this.edges
    ).forEach(edge => {

      if (!this.nodes[edge.from]) {
        throw new Error(
          `RouteGraph: edge "${edge.id}" ссылается на неизвестный node "${edge.from}".`
        );
      }

      if (!this.nodes[edge.to]) {
        throw new Error(
          `RouteGraph: edge "${edge.id}" ссылается на неизвестный node "${edge.to}".`
        );
      }

      if (
        typeof edge.fromYaw !== "number" ||
        typeof edge.toYaw !== "number"
      ) {
        throw new Error(
          `RouteGraph: у edge "${edge.id}" отсутствует fromYaw/toYaw.`
        );
      }
    });
  }
}