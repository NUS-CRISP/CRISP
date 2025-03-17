import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface PRNode {
    id: string;
    fx?: number | null;
    fy?: number | null;
    x?: number;
    y?: number;
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

const PRGraph: React.FC<PRGraphProps> = ({ graphData }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!graphData.nodes.length || !graphData.edges.length) return;

        const width = 600;
        const height = 600;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", 50)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text("Animated Directed Network Graph");

        const tooltip = d3.select(tooltipRef.current);

        const simulation = d3
            .forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.edges).id((d: any) => d.id).distance(250))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1))
            .force("collision", d3.forceCollide().radius(40));

        const colorMap = {
            approved: "green",
            changes_requested: "red",
            dismissed: "gray",
        };

        const defs = svg.append("defs");

        defs
            .selectAll("marker")
            .data(["approved", "changes_requested", "dismissed"])
            .enter()
            .append("marker")
            .attr("id", (d) => `arrow-${d}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 3)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", (d) => colorMap[d as keyof typeof colorMap]);

        const link = svg
            .append("g")
            .selectAll("path")
            .data(graphData.edges)
            .enter()
            .append("path")
            .attr("stroke", (d) => colorMap[d.status as keyof typeof colorMap] || "black")
            .attr("stroke-width", (d) => Math.max(2, Math.min(d.weight * 2, 6)))
            .attr("fill", "none")
            .attr("marker-end", (d) => `url(#arrow-${d.status})`)
            .on("mouseover", function (event, d) {
                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>${(d.source as PRNode).id} → ${(d.target as PRNode).id}</strong><br/>${d.weight} reviews (${d.status})`
                    )
                    .style("left", `${event.offsetX + 10}px`)
                    .style("top", `${event.offsetY + 10}px`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", `${event.offsetX + 10}px`).style("top", `${event.offsetY + 10}px`);
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
            });

        const node = svg
            .append("g")
            .selectAll("circle")
            .data(graphData.nodes)
            .enter()
            .append("circle")
            .attr("r", 15)
            .attr("fill", "steelblue")
            .call(
                d3
                    .drag<SVGCircleElement, PRNode>()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            );

        const labels = svg
            .append("g")
            .selectAll("text")
            .data(graphData.nodes)
            .enter()
            .append("text")
            .attr("dy", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "black")
            .text((d) => d.id);

        simulation.on("tick", () => {
            link.attr("d", (d: any) => {
                const x1 = (d.source as PRNode).x!;
                const y1 = (d.source as PRNode).y!;
                const x2 = (d.target as PRNode).x!;
                const y2 = (d.target as PRNode).y!;

                const dx = x2 - x1;
                const dy = y2 - y1;
                const curveOffset = d.status === "approved" ? 20 : -20;
                const mx = x1 + dx / 2 + curveOffset;
                const my = y1 + dy / 2 + curveOffset;

                return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
            });

            node
              .attr("cx", (d) => d.x = Math.max(15, Math.min(width - 15, d.x!)))
              .attr("cy", (d) => d.y = Math.max(15, Math.min(height - 15, d.y!)));
            labels
              .attr("x", (d) => d.x!)
              .attr("y", (d) => d.y!);
        });
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
            <svg ref={svgRef} width="600" height="600" style={{ border: "1px solid #ccc", borderRadius: "8px" }}></svg>
        </div>
    );
};

export default PRGraph;
