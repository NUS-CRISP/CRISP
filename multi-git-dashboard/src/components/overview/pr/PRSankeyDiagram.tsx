import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from "d3-sankey";

interface PRNode {
  id: string;
}

interface PREdge {
  source: string | PRNode;
  target: string | PRNode;
  weight: number;
  status: string; // "approved", "changes_requested", "dismissed", "commented"
}

interface PRGraphData {
  nodes: PRNode[];
  edges: PREdge[];
}

interface PRSankeyProps {
  graphData: PRGraphData;
}

interface PRLinkExtra {
  status: string;
}

// --- Tarjan's Algorithm to compute strongly connected components ---
function tarjanSCC(
  nodes: PRNode[],
  links: Array<{ source: PRNode; target: PRNode }>
): string[][] {
  const adj = new Map<string, string[]>();
  nodes.forEach((node) => {
    adj.set(node.id, []);
  });
  links.forEach((link) => {
    const s = link.source.id;
    const t = link.target.id;
    if (adj.has(s)) {
      adj.get(s)!.push(t);
    }
  });

  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const neighbors = adj.get(v) || [];
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  nodes.forEach((node) => {
    if (!indices.has(node.id)) {
      strongConnect(node.id);
    }
  });

  return sccs;
}

const PRSankeyDiagram: React.FC<PRSankeyProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData.nodes.length || !graphData.edges.length) return;

    const width = 600;
    const height = 500;

    // Clear existing SVG contents.
    d3.select(svgRef.current).selectAll("*").remove();

    // Create the root SVG and add a title.
    const rootSvg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    rootSvg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Sankey Diagram");

    // Create a group for the diagram (shifted down to leave room for title)
    const svg = rootSvg.append("g").attr("transform", "translate(0, 40)");

    const tooltip = d3.select(tooltipRef.current);

    // Create nodes copy.
    const sankeyNodes = graphData.nodes.map((d) => ({ ...d }));

    // Build a map from node id to node object.
    const idToNode = new Map<string, PRNode>();
    sankeyNodes.forEach((node) => idToNode.set(node.id, node));

    // Build links that directly reference node objects.
    const rawLinks = graphData.edges
      .map((d) => {
        const sourceNode =
          typeof d.source === "string" ? idToNode.get(d.source) : idToNode.get(d.source.id);
        const targetNode =
          typeof d.target === "string" ? idToNode.get(d.target) : idToNode.get(d.target.id);
        if (!sourceNode || !targetNode) return null;
        return {
          source: sourceNode,
          target: targetNode,
          value: d.weight,
          status: d.status,
        } as SankeyLink<PRNode, PRLinkExtra>;
      })
      .filter((d) => d !== null) as SankeyLink<PRNode, PRLinkExtra>[];

    // Compute strongly connected components on the raw graph.
    const sccs = tarjanSCC(sankeyNodes, rawLinks);
    // Build a map from node id to the size of its SCC.
    const sccSizeMap = new Map<string, number>();
    sccs.forEach((component) => {
      component.forEach((id) => sccSizeMap.set(id, component.length));
    });

    // Filter out links that are "circular" (i.e. where source and target are in the same non-trivial SCC)
    const sankeyLinks = rawLinks.filter((link) => {
      const sccSizeSource = sccSizeMap.get(link.source.id) || 1;
      const sccSizeTarget = sccSizeMap.get(link.target.id) || 1;
      // If both source and target belong to the same SCC with more than one node, drop the link.
      if (sccSizeSource > 1 && link.source.id === link.target.id) {
        return false;
      }
      if (sccSizeSource > 1 && sccSizeTarget > 1 && link.source.id === link.target.id) {
        return false;
      }
      // Alternatively, you might decide to drop any link where both nodes are in a nontrivial SCC:
      if (
        sccSizeMap.get(link.source.id) === sccSizeMap.get(link.target.id) &&
        (sccSizeMap.get(link.source.id) || 1) > 1
      ) {
        return false;
      }
      return true;
    });

    // Create the sankey layout.
    const sankeyGenerator = d3Sankey<PRNode, SankeyLink<PRNode, PRLinkExtra>>()
      .nodeId((d) => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height - 50]]); // leave room for title

    // Run the sankey layout.
    const sankeyData = sankeyGenerator({
      nodes: sankeyNodes,
      links: sankeyLinks,
    });

    const { nodes, links } = sankeyData;

    // Color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw links.
    svg
      .append("g")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal<PRNode, PRLinkExtra>())
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const c = d3.color(color((d.source as SankeyNode<PRNode, PRLinkExtra>).index.toString()));
        return c ? c.brighter(0.5).toString() : "#aaa";
      })
      .attr("stroke-width", (d) => Math.max(1, d.width || 1))
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${
              (d.source as SankeyNode<PRNode, PRLinkExtra>).id
            } → ${(d.target as SankeyNode<PRNode, PRLinkExtra>).id}</strong><br/>Value: ${
              d.value
            }<br/>Status: ${d.status}`
          )
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY + 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Draw nodes as rectangles.
    const nodeGroup = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g");

    nodeGroup
      .append("rect")
      .attr("x", (d) => d.x0!)
      .attr("y", (d) => d.y0!)
      .attr("width", (d) => d.x1! - d.x0!)
      .attr("height", (d) => d.y1! - d.y0!)
      .attr("fill", (d) => color((d as SankeyNode<PRNode, PRLinkExtra>).index.toString()))
      .attr("opacity", 0.9)
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.id}</strong><br/>Value: ${d.value || 0}`)
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY + 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Add node labels.
    nodeGroup
      .append("text")
      .attr("x", (d) => d.x0! - 6)
      .attr("y", (d) => (d.y1! + d.y0!) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("font-size", "12px")
      .text((d) => d.id)
      .filter((d) => d.x0! < width / 2)
      .attr("x", (d) => d.x1! + 6)
      .attr("text-anchor", "start");
  }, [graphData]);

  return (
    <div style={{ position: "relative", width: "600px", height: "500px" }}>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          padding: "6px 12px",
          backgroundColor: "black",
          color: "white",
          fontSize: "12px",
          borderRadius: "5px",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.3s ease",
        }}
      />
      <svg ref={svgRef} width="600" height="500" style={{ border: "1px solid black" }}></svg>
    </div>
  );
};

export default PRSankeyDiagram;
