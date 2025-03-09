import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface PRNode {
  id: string;
}

interface PREdge {
  source: string | PRNode;
  target: string | PRNode;
  weight: number;
  status: string;
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
    const innerRadius = 150;
    const outerRadius = innerRadius + 10;

    d3.select(svgRef.current).selectAll("*").remove();

    const rootSvg = d3.select(svgRef.current);

    rootSvg
      .append("text")
      .attr("x", 300)
      .attr("y", 20) 
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Chord Diagram");

    const svg = rootSvg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const tooltip = d3.select(tooltipRef.current);

    const indexById = new Map<string, number>();
    graphData.nodes.forEach((node, i) => {
      indexById.set(node.id, i);
    });

    const n = graphData.nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0)
    );

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

    // Create the chord
    const chord = d3
      .chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)(matrix);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const ribbon = d3.ribbon().radius(innerRadius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

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

    // Add labels
    group
      .append("text")
      .each((d) => {
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

    // Draw the chords (ribbons)
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

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [graphData]);

  return (

    <svg ref={svgRef} width="600" height="600" style={{ border: "1px solid #ccc", borderRadius: "8px" }}></svg>

  );
};

export default PRChordDiagram;
