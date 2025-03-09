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

const PRChordDiagram: React.FC<PRGraphProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData.nodes.length || !graphData.edges.length) return;

    const width = 600;
    const height = 600;
    const innerRadius = Math.min(width, height) * 0.5 - 100;
    const outerRadius = innerRadius + 10;

    // Clear previous svg contents if any.
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const tooltip = d3.select(tooltipRef.current);

    // Map node id to index.
    const indexById = new Map<string, number>();
    graphData.nodes.forEach((node, i) => {
      indexById.set(node.id, i);
    });

    const n = graphData.nodes.length;
    // Initialize a matrix of size n x n with zeros.
    const matrix: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0)
    );

    // Populate the matrix with the weights from each edge.
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

    // Create the chord layout.
    const chord = d3
      .chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)(matrix);

    // Arc generator for the outer arcs (groups).
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    // Ribbon generator for the chords.
    const ribbon = d3.ribbon().radius(innerRadius);

    // Use a categorical color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw the group arcs.
    const group = svg
      .append("g")
      .selectAll("g")
      .data(chord.groups)
      .enter()
      .append("g");

    group
      .append("path")
      .attr("d", arc)
      .style("fill", (d) => color(d.index.toString()))
      .style("stroke", (d) => color(d.index.toString()))
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${graphData.nodes[d.index].id}</strong>`)
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

    // Add labels for each group.
    group
      .append("text")
      .each((d) => {
        // Calculate the angle for positioning the label.
        // @ts-ignore
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr("dy", ".35em")
      .attr("transform", (d) => `
          rotate(${(d.angle * 180) / Math.PI - 90})
          translate(${outerRadius + 10})
          ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
      .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
      .text((d) => graphData.nodes[d.index].id);

    // Draw the chords (ribbons) connecting the groups.
    svg
      .append("g")
      .attr("fill-opacity", 0.67)
      .selectAll("path")
      .data(chord)
      .enter()
      .append("path")
      .attr("d", ribbon)
      .style("fill", (d) => color(d.target.index.toString()))
      .style("stroke", (d) =>
        d3.rgb(color(d.target.index.toString())).darker().toString()
      )
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${graphData.nodes[d.source.index].id} → ${graphData.nodes[d.target.index].id}</strong><br/>Weight: ${matrix[d.source.index][d.target.index]}`
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

    // Clean up on component unmount.
    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [graphData]);

  return (
    <div style={{ position: "relative", width: "600px", height: "600px" }}>
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

export default PRChordDiagram;
