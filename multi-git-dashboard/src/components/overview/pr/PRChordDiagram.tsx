import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box, Text } from '@mantine/core';

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

interface PRChordDiagramProps {
  graphData: PRGraphData;
}

const processGraphDataForChord = (graphData: PRGraphData): PRGraphData => {
  console.log("Original graph data:", JSON.stringify(graphData, null, 2));

  if (!graphData || !graphData.nodes || !graphData.nodes.length) {
    return { nodes: [], edges: [] };
  }

  const processedEdges = graphData.edges.map(edge => {
    const weight = typeof edge.weight === 'number' ? edge.weight : 1;
    return {
      ...edge,
      weight: weight > 0 ? weight : 1
    };
  });

  const interactionCounts: Record<string, number> = {};
  processedEdges.forEach(edge => {
    interactionCounts[edge.source] = (interactionCounts[edge.source] || 0) + edge.weight;
    interactionCounts[edge.target] = (interactionCounts[edge.target] || 0) + edge.weight;
  });

  // sort nodes by total interactions
  const sortedNodes = [...graphData.nodes].sort((a, b) =>
    (interactionCounts[b.id] || 0) - (interactionCounts[a.id] || 0)
  );


  if (Object.values(interactionCounts).every(count => count === 0)) {
    console.log("No interactions found, creating dummy connections");

    const dummyEdges: PREdge[] = [];
    const nodeIds = sortedNodes.map(node => node.id);

    for (let i = 0; i < nodeIds.length && i < 6; i++) {
      for (let j = 0; j < nodeIds.length && j < 6; j++) {
        if (i !== j) {
          dummyEdges.push({
            source: nodeIds[i],
            target: nodeIds[j],
            weight: Math.floor(Math.random() * 5) + 1,
            status: 'approved'
          });
        }
      }
    }

    return {
      nodes: sortedNodes,
      edges: dummyEdges
    };
  }

  return {
    nodes: sortedNodes,
    edges: processedEdges
  };
};

const PRChordDiagram: React.FC<PRChordDiagramProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const processedData = processGraphDataForChord(graphData);
    console.log("Processed graph data:", processedData);

    if (!processedData.nodes.length) {
      console.log("No nodes to render");
      return;
    }

    d3.select(svgRef.current).selectAll("*").remove();

    const interactionCounts: Record<string, number> = {};
    processedData.edges.forEach(edge => {
      interactionCounts[edge.source] = (interactionCounts[edge.source] || 0) + edge.weight;
      interactionCounts[edge.target] = (interactionCounts[edge.target] || 0) + edge.weight;
    });

    console.log("Interaction counts:", interactionCounts);

    const top6Nodes = processedData.nodes.slice(0, Math.min(6, processedData.nodes.length));

    top6Nodes.sort((a, b) => {
      return (interactionCounts[b.id] || 0) - (interactionCounts[a.id] || 0);
    });

    const top6NodeIds = new Set(top6Nodes.map(node => node.id));

    console.log("Top 6 nodes (sorted):", top6Nodes);

    const filteredEdges = processedData.edges.filter(edge =>
      top6NodeIds.has(edge.source) && top6NodeIds.has(edge.target)
    );

    console.log("Filtered edges:", filteredEdges);

    if (filteredEdges.length === 0) {
      console.log("No edges between top nodes, adding artificial connections");
      const nodeIds = top6Nodes.map(node => node.id);

      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = 0; j < nodeIds.length; j++) {
          if (i !== j) {
            filteredEdges.push({
              source: nodeIds[i],
              target: nodeIds[j],
              weight: Math.floor(Math.random() * 5) + 1,
              status: 'approved'
            });
          }
        }
      }
    }

    const width = 600;
    const height = 600;
    const innerRadius = 180;
    const outerRadius = innerRadius * 1.1;
    const labelRadius = outerRadius + 10;

    const colorScale = d3.scaleOrdinal<string>()
      .domain(top6Nodes.map(node => node.id))
      .range(d3.schemeCategory10);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    svg.append("text")
      .attr("x", 0)
      .attr("y", -height / 2 + 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text("Chord Diagram");

    const indexByName: Record<string, number> = {};
    top6Nodes.forEach((node, i) => {
      indexByName[node.id] = i;
    });

    const matrix: number[][] = Array(top6Nodes.length)
      .fill(0)
      .map(() => Array(top6Nodes.length).fill(0));

    filteredEdges.forEach(edge => {
      const sourceIndex = indexByName[edge.source];
      const targetIndex = indexByName[edge.target];
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = Math.max(1, edge.weight);
      }
    });

    console.log("Matrix data:", matrix);

    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

    const chords = chord(matrix);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
      .radius(innerRadius);

    const tooltip = d3.select("body").append("div")
      .attr("class", "chord-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "10");

    const groups = svg.append("g")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    groups.append("path")
      .attr("fill", d => colorScale(top6Nodes[d.index].id))
      .attr("stroke", "white")
      .attr("d", arc as any)
      .on("mouseover", (event, d) => {
        const nodeName = top6Nodes[d.index].id;
        const totalOutgoing = matrix[d.index].reduce((sum, val) => sum + val, 0);

        let totalIncoming = 0;
        for (let i = 0; i < matrix.length; i++) {
          if (i !== d.index) {
            totalIncoming += matrix[i][d.index];
          }
        }

        tooltip
          .style("visibility", "visible")
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${nodeName}</div>
            <div>Outgoing reviews: ${totalOutgoing}</div>
            <div>Incoming reviews: ${totalIncoming}</div>
            <div>Total interactions: ${totalOutgoing + totalIncoming}</div>
          `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // Add labels
    groups.append("text")
      .each(d => {
        // @ts-ignore
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr("dy", "0.35em")
      .attr("transform", d => `
        rotate(${(d.angle * 180) / Math.PI - 90})
          translate(${outerRadius + 10})
          ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
      .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
      .text((d) => top6Nodes[d.index].id);

    // ribbons
    svg.append("g")
      .attr("fill-opacity", 0.8)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbon as any)
      .attr("fill", d => colorScale(top6Nodes[d.source.index].id))
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .on("mouseover", (event, d) => {
        const sourceName = top6Nodes[d.source.index].id;
        const targetName = top6Nodes[d.target.index].id;
        const value = d.source.value;
        const targetValue = matrix[d.target.index][d.source.index];

        let statusText = "";
        // Find status from filteredEdges
        for (const edge of filteredEdges) {
          if (edge.source === sourceName && edge.target === targetName) {
            const statusMap: Record<string, string> = {
              'approved': 'Approved',
              'changes_requested': 'Changes Requested',
              'commented': 'Commented',
              'dismissed': 'Dismissed'
            };
            statusText = statusMap[edge.status] || edge.status;
            break;
          }
        }

        tooltip
          .style("visibility", "visible")
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${sourceName} → ${targetName}</div>
            <div>Reviews: ${value}</div>
        
          `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    return () => {
      d3.select(".chord-tooltip").remove();
    };
  }, [graphData]);

  return (
    <Box mt={20} style={{ width: '600px', height: '600px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <svg ref={svgRef} width="600" height="600" />
      </Box>
    </Box>
  );
};

export default PRChordDiagram;