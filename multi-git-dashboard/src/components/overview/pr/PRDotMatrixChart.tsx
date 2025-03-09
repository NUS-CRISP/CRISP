import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

interface PRNode {
  id: string;
}

interface PREdge {
  source: string;
  target: string;
  weight: number;
  status: string;
}

interface PRGraphData {
  nodes: PRNode[];
  edges: PREdge[];
}

interface PRDotMatrixChartProps {
  graphData: PRGraphData;
}

const PRDotMatrixChart: React.FC<PRDotMatrixChartProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If there are no nodes or edges, exit early
    if (!graphData?.nodes?.length || !graphData?.edges?.length) {
      console.log("No data available for the dot matrix chart");
      return;
    }

    const width = 600;
    const height = 600;
    const margin = { top: 80, right: 80, bottom: 80, left: 80 };

    // Clear any existing SVG content
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    // Create main container group
    const svg = svgEl
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Setup tooltip
    const tooltip = d3.select(tooltipRef.current).style("opacity", 0);

    // 1) Prepare data
    const users = graphData.nodes.map(d => d.id);
    users.sort(); // Sort alphabetically (optional)
    console.log("Users:", users);

    // Build an edge lookup map with key format "source->target"
    const edgeMap = new Map<string, { weight: number; status: string }>();
    graphData.edges.forEach(edge => {
      const key = `${edge.source}->${edge.target}`;
      edgeMap.set(key, { weight: edge.weight, status: edge.status });
    });
    console.log("Edge map keys:");
    edgeMap.forEach((value, key) => console.log(key, value));

    // 2) Create scales for the matrix layout
    const xScale = d3
      .scaleBand()
      .domain(users)
      .range([0, width - margin.left - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleBand()
      .domain(users)
      .range([0, height - margin.top - margin.bottom])
      .padding(0.1);

    // Determine maximum weight for scaling circle sizes
    const maxWeight = d3.max(graphData.edges, d => d.weight) || 1;
    const rScale = d3
      .scaleSqrt()
      .domain([0, maxWeight])
      .range([0, xScale.bandwidth() / 2]);

    // Define a color map for review statuses
    const statusColorMap: Record<string, string> = {
      approved: "green",
      changes_requested: "red",
      dismissed: "gray",
      commented: "#999",
    };

    // 3) Draw axes
    // X-axis (authors)
    svg.append("g")
      .attr("transform", `translate(0, ${yScale.range()[1]})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-45)")
      .attr("dx", "-0.5em")
      .attr("dy", "0.5em");

    // Y-axis (reviewers)
    svg.append("g").call(d3.axisLeft(yScale));

    // 4) Build all possible (reviewer, author) pairs
    const allPairs: Array<{ reviewer: string; author: string }> = [];
    users.forEach(reviewer => {
      users.forEach(author => {
        allPairs.push({ reviewer, author });
      });
    });
    console.log("All pairs:", allPairs);

    // 5) Draw circles for each cell in the matrix
    svg.selectAll(".cell")
      .data(allPairs)
      .enter()
      .append("circle")
      .attr("class", "cell")
      .attr("cx", d => {
        const bandX = xScale(d.author);
        return bandX !== undefined ? bandX + xScale.bandwidth() / 2 : 0;
      })
      .attr("cy", d => {
        const bandY = yScale(d.reviewer);
        return bandY !== undefined ? bandY + yScale.bandwidth() / 2 : 0;
      })
      .attr("r", d => {
        const key = `${d.reviewer}->${d.author}`;
        const edgeInfo = edgeMap.get(key);
        return edgeInfo ? rScale(edgeInfo.weight) : 0;
      })
      .attr("fill", d => {
        const key = `${d.reviewer}->${d.author}`;
        const edgeInfo = edgeMap.get(key);
        return edgeInfo ? (statusColorMap[edgeInfo.status] || "black") : "#fff";
      })
      .attr("stroke", "#ccc")
      .on("mouseover", function (event, d) {
        const key = `${d.reviewer}->${d.author}`;
        const edgeInfo = edgeMap.get(key);
        if (edgeInfo) {
          d3.select(this)
            .attr("stroke", "orange")
            .attr("stroke-width", 2);
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>Reviewer:</strong> ${d.reviewer}<br/>
               <strong>Author:</strong> ${d.author}<br/>
               <strong>Weight:</strong> ${edgeInfo.weight}<br/>
               <strong>Status:</strong> ${edgeInfo.status}`
            )
            .style("left", `${event.offsetX + 10}px`)
            .style("top", `${event.offsetY + 10}px`);
        }
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY + 10}px`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1);
        tooltip.style("opacity", 0);
      });

    // 6) Add chart title
    svg.append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", "bold")
      .text("Dot Matrix of PR Reviews");

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
          pointerEvents: "none",
          transition: "opacity 0.3s ease",
        }}
      />
      <svg ref={svgRef} style={{ border: "1px solid #ccc" }} />
    </div>
  );
};

export default PRDotMatrixChart;
