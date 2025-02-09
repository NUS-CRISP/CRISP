import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string; // Unique identifier for each node
  x?: number; // D3 adds x and y coordinates dynamically
  y?: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface PRGraphProps {
  graphData: GraphData;
}

const PRGraph: React.FC<PRGraphProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 600;
    const height = 400;

    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(graphData.edges).id(d => (d as GraphNode).id))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(graphData.edges)
      .enter().append('line')
      .style('stroke', '#aaa');

    const node = svg.append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter().append('circle')
      .attr('r', 10)
      .style('fill', 'steelblue');

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x || 0)
        .attr('y1', (d) => (d.source as GraphNode).y || 0)
        .attr('x2', (d) => (d.target as GraphNode).x || 0)
        .attr('y2', (d) => (d.target as GraphNode).y || 0);

      node
        .attr('cx', (d) => d.x || 0)
        .attr('cy', (d) => d.y || 0);
    });
  }, [graphData]);

  return <svg ref={svgRef} width="600" height="400"></svg>;
};

export default PRGraph;
