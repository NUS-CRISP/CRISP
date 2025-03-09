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

    // Increase margins to make room for long row/column labels.
    const margin = { top: 90, right: 100, bottom: 150, left: 170 },
      width = 600 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

// 1) Clear previous SVG content
d3.select(svgRef.current).selectAll("*").remove();

// 2) Create a "root" SVG selection (instead of appending the <g> directly)
const rootSvg = d3
  .select(svgRef.current)
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

// 3) Add the title at the top
rootSvg
  .append("text")
  .attr("x", (width + margin.left + margin.right) / 2)
  .attr("y", 30) // Distance from the top; adjust as needed
  .attr("text-anchor", "middle")
  .attr("font-size", "16px")
  .attr("font-weight", "bold")
  .text("Matrix Diagram");

// 4) Now append the main group for the matrix
const svg = rootSvg
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

    // Add row labels (along the left).
    svg
      .selectAll(".rowLabel")
      .data(graphData.nodes)
      .enter()
      .append("text")
      // Shift labels slightly more to the left for clarity.
      .attr("x", -10)
      // Center vertically in each band.
      .attr("y", (_, i) => (yScale(String(i)) || 0) + yScale.bandwidth() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .text((d) => d.id);

    // Add column labels (along the top).
// Replace the "Add column labels (along the top)" block with this:

// Add column labels (along the bottom).
svg
  .selectAll(".colLabel")
  .data(graphData.nodes)
  .enter()
  .append("text")
  .attr("class", "colLabel")
  // Place each label horizontally in the center of its column
  .attr("x", (_, i) => (xScale(String(i)) || 0) + xScale.bandwidth() / 2)
  // Place the labels below the matrix area
  .attr("y", height + 20) // Adjust as needed
  .attr("dy", ".35em")
  // Anchor text so rotation looks natural
  .attr("text-anchor", "end")
  // Rotate (e.g., -45 degrees) around each label's (x, y)
  .attr("transform", (_, i) => {
    const x = (xScale(String(i)) || 0) + xScale.bandwidth() / 2;
    const y = height + 20;
    return `rotate(-45, ${x}, ${y})`;
  })
  .text((d) => d.id);

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
       <svg ref={svgRef} width="600" height="600" style={{ border: "1px solid black" }}></svg>
    </div>
  );
};

export default PRMatrix;
