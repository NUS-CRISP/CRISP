import { useEffect, useRef } from "react";
import * as d3 from "d3";

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

interface PRMatrixProps {
  graphData: PRGraphData;
}

const PRMatrixStatusColor: React.FC<PRMatrixProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    // Larger margins to accommodate labels.
    const margin = { top: 100, right: 100, bottom: 150, left: 160 },
      width = 600 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

// 1) Clear previous SVG content
d3.select(svgRef.current).selectAll("*").remove();

// 2) Create a root SVG selection
const svg = d3.select(svgRef.current)
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

// 3) Append the title
svg
  .append("text")
  .attr("x", (width + margin.left + margin.right) / 2)
  .attr("y", 30) // Adjust as needed
  .attr("text-anchor", "middle")
  .attr("font-size", "16px")
  .attr("font-weight", "bold")
  .text("Matrix with Status Colors");

// 4) Now create the main group for the matrix
const matrixG = svg
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);


    const tooltip = d3.select(tooltipRef.current);

    const n = graphData.nodes.length;
    // Map node ID -> index
    const indexById = new Map<string, number>();
    graphData.nodes.forEach((node, i) => {
      indexById.set(node.id, i);
    });

    // 1) Build a 2D matrix of objects with { weight, status }
    // Initialize everything to { weight: 0, status: "" }
    type CellData = { weight: number; status: string };
    const matrix: CellData[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({ weight: 0, status: "" }))
    );

    // 2) Fill the matrix from the edges
    graphData.edges.forEach((edge) => {
      const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id;
      const targetId = typeof edge.target === "string" ? edge.target : edge.target.id;
      const sIndex = indexById.get(sourceId);
      const tIndex = indexById.get(targetId);
      if (sIndex !== undefined && tIndex !== undefined) {
        matrix[sIndex][tIndex].weight += edge.weight;
        // Overwrite status with the final one we see for this pair
        matrix[sIndex][tIndex].status = edge.status;
      }
    });

    // Flatten into an array for easy binding
    const cells = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        cells.push({
          row,
          col,
          weight: matrix[row][col].weight,
          status: matrix[row][col].status,
        });
      }
    }

    // 3) Scales for rows/columns
    const xScale = d3.scaleBand().domain(d3.range(n).map(String)).range([0, width]).padding(0.05);
    const yScale = d3.scaleBand().domain(d3.range(n).map(String)).range([0, height]).padding(0.05);

    // 4) Determine max weight
    const maxWeight = d3.max(cells, (d) => d.weight) || 1;

    // 5) Define a color map for statuses
    const statusColorMap: Record<string, string> = {
      approved: "#4caf50",          // green
      changes_requested: "#ff9800", // orange
      dismissed: "#9e9e9e",         // gray
      commented: "#2196f3",         // blue
    };

    // A helper to get the cell color
    function getCellColor(d: { weight: number; status: string }) {
      if (d.weight === 0) return "#eee"; // No interaction
      // If we don't have a recognized status, default to a neutral color
      const baseColor = statusColorMap[d.status] || "#ccc";
      // Interpolate from #eee (light gray) to baseColor based on weight
      const t = d.weight / maxWeight; // 0..1
      return d3.interpolateRgb("#eee", baseColor)(t);
    }

    // 6) Draw the cells
    matrixG
      .selectAll("rect")
      .data(cells)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(String(d.col))!)
      .attr("y", (d) => yScale(String(d.row))!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", getCellColor)
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        if (d.weight > 0) {
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${graphData.nodes[d.row].id} → ${
                graphData.nodes[d.col].id
              }</strong><br/>Weight: ${d.weight}<br/>Status: ${
                d.status || "N/A"
              }`
            )
            .style("left", `${event.offsetX + 10}px`)
            .style("top", `${event.offsetY + 10}px`);
        }
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY + 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // 7) Row labels (reviewers)
    matrixG
      .selectAll(".rowLabel")
      .data(graphData.nodes)
      .enter()
      .append("text")
      .attr("class", "rowLabel")
      .attr("x", -10)
      .attr("y", (_, i) => (yScale(String(i)) || 0) + yScale.bandwidth() / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text((d) => d.id);

    // 8) Column labels (authors)
    matrixG
    .selectAll(".colLabel")
    .data(graphData.nodes)
    .enter()
    .append("text")
    .attr("class", "colLabel")
    // Place each label horizontally in the center of its column
    .attr("x", (_, i) => (xScale(String(i)) || 0) + xScale.bandwidth() / 2)
    // Place the labels below the matrix area
    .attr("y", height + 30)
    // You can adjust dy for small vertical offsets
    .attr("dy", ".35em")
    // Anchor the text so rotation looks natural
    .attr("text-anchor", "end")
    // Rotate -45 degrees (or whatever angle you want) around (x, y)
    .attr("transform", (_, i) => {
      const x = (xScale(String(i)) || 0) + xScale.bandwidth() / 2;
      const y = height + 30;
      return `rotate(-45, ${x}, ${y})`;
    })
    .text((d) => d.id);
  
    // 9) Add a small legend for statuses (optional)
    const legendData = [
      { status: "approved", color: statusColorMap.approved },
      { status: "changed", color: statusColorMap.changes_requested },
      { status: "dismissed", color: statusColorMap.dismissed },
      { status: "commented", color: statusColorMap.commented },
    ];

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${margin.left - 50}, ${margin.top - 40})`);

    legend
      .selectAll("rect")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", (_, i) => i * 120)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (d) => d.color);

    legend
      .selectAll("text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", (_, i) => i * 120 + 18)
      .attr("y", 6)
      .attr("dy", ".35em")
      .text((d) => d.status);
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

export default PRMatrixStatusColor;
