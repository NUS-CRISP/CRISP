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

interface PRArcDiagramProps {
  graphData: PRGraphData;
  width?: number;
  height?: number;
}

const PRArcDiagram: React.FC<PRArcDiagramProps> = ({
  graphData,
  width = 600,
  height = 500,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#28a745';
      case 'changes_requested':
        return '#dc3545';
      case 'commented':
        return '#17a2b8';
      case 'dismissed':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  useEffect(() => {
    if (!graphData || !graphData.nodes.length || !graphData.edges.length || !svgRef.current) {
      return;
    }

    d3.select(svgRef.current).selectAll('*').remove();


    const margin = { top: 50, right: 70, bottom: 70, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svg
      .append("text")
      .attr("x", width / 2 - 50)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Arc Diagram");

    const nodeIds = Array.from(new Set([
      ...graphData.edges.map(e => e.source),
      ...graphData.edges.map(e => e.target)
    ]));

    const nodeMap = new Map();
    nodeIds.forEach((id, i) => {
      nodeMap.set(id, i);
    });

    const spacingFactor = 0.6;
    const totalSpace = innerWidth * spacingFactor;
    const nodePositions = nodeIds.map((id, i) => ({
      id, // Store the actual string ID
      x: margin.left + (i * totalSpace) / Math.max(1, nodeIds.length - 1),
      y: innerHeight / 2
    }));

    const links = graphData.edges.map(edge => {
      const sourceIndex = nodeMap.get(edge.source);
      const targetIndex = nodeMap.get(edge.target);

      // Ensure have valid indices
      if (sourceIndex === undefined || targetIndex === undefined) {
        return null;
      }

      return {
        source: sourceIndex,
        sourceId: edge.source,
        target: targetIndex,
        targetId: edge.target,
        weight: edge.weight,
        status: edge.status
      };

    }).filter(link => link !== null);

    // Draw arcs
    svg.selectAll('.arc')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('d', (d: any) => {
        const sourceNode = nodePositions[d.source];
        const targetNode = nodePositions[d.target];

        if (sourceNode === undefined || targetNode === undefined) {
          return '';
        }

        const x1 = sourceNode.x;
        const x2 = targetNode.x;
        const y = innerHeight / 2;

        const distance = Math.abs(x2 - x1);

        const nodeSpan = Math.abs(d.target - d.source);
        const arcHeight = Math.min(
          distance * 0.5,
          innerHeight * 0.4 * (nodeSpan / nodeIds.length) * 5
        );

        return `M${x1},${y} A${distance / 2},${arcHeight} 0 0,1 ${x2},${y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', (d: any) => getStatusColor(d.status))
      .attr('stroke-width', (d: any) => Math.max(1, Math.min(d.weight, 5)))
      .attr('opacity', 0.8);

    // Draw nodes
    svg.selectAll('.node')
      .data(nodePositions)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 6)
      .attr('fill', '#4c78a8');

    // Add node labels
    svg.selectAll('.node-label')
      .data(nodePositions)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('transform', d => {
        return `rotate(45, ${d.x}, ${d.y + 20})`;
      })
      .text(d => {
        const name = d.id;
        return name.length > 12 ? name.substring(0, 10) + '...' : name;
      });

    // Create legend
    const legendX = 400;
    const legendY = 10;
    const legendData = [
      { status: 'approved', color: getStatusColor('approved') },
      { status: 'changes_requested', color: getStatusColor('changes_requested') },
      { status: 'commented', color: getStatusColor('commented') },
      { status: 'dismissed', color: getStatusColor('dismissed') }
    ];

    const legend = svg.append('g')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    legendData.forEach((item, i) => {
      legend.append('rect')
        .attr('x', 0)
        .attr('y', i * 20)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color);

      legend.append('text')
        .attr('x', 20)
        .attr('y', i * 20 + 12)
        .attr('font-size', '12px')
        .text(item.status);
    });

  }, [graphData, width, height]);

  if (!graphData?.nodes?.length || !graphData?.edges?.length) {
    return <Text mt={15}>No interaction data available for arc diagram</Text>;
  }

  return (

    <svg ref={svgRef} width="600" height="500" style={{ border: "1px solid #ccc", borderRadius: "8px" }}></svg>

  );
};

export default PRArcDiagram;