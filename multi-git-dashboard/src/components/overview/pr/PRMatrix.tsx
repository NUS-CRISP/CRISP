import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface PRNode {
  id: string;
}

interface PREdge {
  source: string | PRNode;
  target: string | PRNode;
  weight: number;
  status: string; // "approved", "changes_requested", "dismissed"
}

interface PRGraphProps {
  graphData: {
    nodes: PRNode[];
    edges: PREdge[];
  };
}

const PRMatrix: React.FC<PRGraphProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    // Set dimensions and margins.
    const margin = { top: 100, right: 100, bottom: 100, left: 100 },
      width = 600 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    // Clear previous SVG content.
    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);

    const n = graphData.nodes.length;
    // Create a mapping from node id to index.
    const indexById = new Map<string, number>();
    graphData.nodes.forEach((node, i) => {
      indexById.set(node.id, i);
    });

    // Initialize the matrix with zeros.
    const matrix: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0)
    );

    // Populate the matrix based on edge weights.
    graphData.edges.forEach((edge) => {
      const sourceId =
        typeof edge.source === "string" ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === "string" ? edge.target : edge.target.id;
      const sourceIndex = indexById.get(sourceId);
      const targetIndex = indexById.get(targetId);
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] += edge.weight;
      }
    });

    // Flatten the matrix into an array of cell objects.
    const cells: { row: number; col: number; weight: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cells.push({ row: i, col: j, weight: matrix[i][j] });
      }
    }

    // Create scales for rows and columns.
    const xScale = d3
      .scaleBand()
      .domain(d3.range(n).map(String))
      .range([0, width])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(d3.range(n).map(String))
      .range([0, height])
      .padding(0.05);

    // Define a color scale for the cell intensity.
    const maxWeight = d3.max(cells, (d) => d.weight) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxWeight]);

    // Draw the cells (rectangles) of the matrix.
    svg
      .selectAll("rect")
      .data(cells)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(String(d.col))!)
      .attr("y", (d) => yScale(String(d.row))!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => (d.weight > 0 ? colorScale(d.weight) : "#eee"))
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${graphData.nodes[d.row].id} → ${graphData.nodes[d.col].id}</strong><br/>Weight: ${d.weight}`
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

    // Add row labels.
    svg
      .selectAll(".rowLabel")
      .data(graphData.nodes)
      .enter()
      .append("text")
      .attr("x", -6)
      .attr("y", (_, i) => (yScale(String(i)) || 0) + yScale.bandwidth() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .text((d) => d.id);

    // Add column labels.
    svg
      .selectAll(".colLabel")
      .data(graphData.nodes)
      .enter()
      .append("text")
      .attr("x", (_, i) => (xScale(String(i)) || 0) + xScale.bandwidth() / 2)
      .attr("y", -6)
      .attr("dy", ".32em")
      .attr("text-anchor", "middle")
      .text((d) => d.id)
      .attr("transform", (_, i) =>
        `translate(0,0) rotate(-90, ${(xScale(String(i)) || 0) + xScale.bandwidth() / 2}, -6)`
      );
  }, [graphData]);

  return (
    <div style={{ position: "relative" }}>
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
      ></div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default PRMatrix;
