import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PRGraph = ({ graphData }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 600;
    const height = 400;

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.edges).id((d) => d))
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
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);
    });
  }, [graphData]);

  return <svg ref={svgRef} width="600" height="400"></svg>;
};

export default PRGraph;
