import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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

interface PRHiveProps {
  graphData: PRGraphData;
}

const PRHivePlot: React.FC<PRHiveProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData.nodes.length || !graphData.edges.length) return;

    const width = 600;
    const height = 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerRadiusMax = Math.min(width, height) / 2 - 50;

    // Clear previous svg contents.
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const tooltip = d3.select(tooltipRef.current);

    // Compute in/out degrees for each node.
    const nodeMap = new Map<
      string,
      { node: PRNode; inDegree: number; outDegree: number; total: number }
    >();
    graphData.nodes.forEach(n => {
      nodeMap.set(n.id, { node: n, inDegree: 0, outDegree: 0, total: 0 });
    });
    graphData.edges.forEach(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (nodeMap.has(sourceId)) {
        const data = nodeMap.get(sourceId)!;
        data.outDegree += edge.weight;
        data.total += edge.weight;
      }
      if (nodeMap.has(targetId)) {
        const data = nodeMap.get(targetId)!;
        data.inDegree += edge.weight;
        data.total += edge.weight;
      }
    });

    // Assign each node to an axis:
    // Axis 0: Mostly reviewers (outDegree > inDegree by at least 20%)
    // Axis 1: Balanced (inDegree and outDegree similar)
    // Axis 2: Mostly authors (inDegree > outDegree by at least 20%)
    const nodesWithAxis = Array.from(nodeMap.values()).map(d => {
      let axis = 1;
      if (d.outDegree > d.inDegree * 1.2) {
        axis = 0;
      } else if (d.inDegree > d.outDegree * 1.2) {
        axis = 2;
      }
      return { ...d, axis };
    });

    // Create a radius scale based on total interactions.
    const maxTotal = d3.max(nodesWithAxis, d => d.total) || 1;
    const radiusScale = d3
      .scaleLinear()
      .domain([0, maxTotal])
      .range([50, innerRadiusMax]);

    // For each node, compute its position based on its axis.
    // Use fixed angles: axis 0 at 0°, axis 1 at 120° (2π/3), axis 2 at 240° (4π/3).
    nodesWithAxis.forEach(d => {
      let angle = 0;
      if (d.axis === 0) angle = 0;
      else if (d.axis === 1) angle = (2 * Math.PI) / 3;
      else angle = (4 * Math.PI) / 3;
      d['x'] = radiusScale(d.total) * Math.cos(angle);
      d['y'] = radiusScale(d.total) * Math.sin(angle);
      d['angle'] = angle;
    });

    // Draw the three axes.
    const axesAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    axesAngles.forEach(a => {
      svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', innerRadiusMax * Math.cos(a))
        .attr('y2', innerRadiusMax * Math.sin(a))
        .attr('stroke', '#ccc')
        .attr('stroke-dasharray', '3,3');
    });

    // Draw nodes.
    svg
      .selectAll('circle.node')
      .data(nodesWithAxis)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', d => d['x'])
      .attr('cy', d => d['y'])
      .attr('r', 5)
      .attr('fill', 'steelblue')
      .on('mouseover', (event, d) => {
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${d.node.id}</strong><br/>In: ${d.inDegree} Out: ${d.outDegree}`
          )
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY + 10}px`);
      })
      .on('mousemove', event => {
        tooltip
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY + 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // Draw edges as curves using quadratic Bezier curves.
    svg
      .selectAll('path.edge')
      .data(graphData.edges)
      .enter()
      .append('path')
      .attr('class', 'edge')
      .attr('d', d => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        const s = nodesWithAxis.find(n => n.node.id === sourceId);
        const t = nodesWithAxis.find(n => n.node.id === targetId);
        if (s && t) {
          const midX = (s['x'] + t['x']) / 2;
          const midY = (s['y'] + t['y']) / 2;
          // Offset control point perpendicularly.
          const dx = t['x'] - s['x'],
            dy = t['y'] - s['y'];
          const norm = Math.sqrt(dx * dx + dy * dy);
          const offset = 20;
          const cx = midX - offset * (dy / norm);
          const cy = midY + offset * (dx / norm);
          return `M${s['x']},${s['y']} Q${cx},${cy} ${t['x']},${t['y']}`;
        }
        return '';
      })
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', d => Math.max(1, d.weight));

    // Optionally, add node labels.
    svg
      .selectAll('text.label')
      .data(nodesWithAxis)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => d['x'])
      .attr('y', d => d['y'])
      .attr('dy', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => d.node.id);
  }, [graphData]);

  return (
    <div style={{ position: 'relative', width: '600px', height: '600px' }}>
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          padding: '6px 12px',
          backgroundColor: 'black',
          color: 'white',
          fontSize: '12px',
          borderRadius: '5px',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease',
        }}
      ></div>
      <svg
        ref={svgRef}
        width="600"
        height="600"
        style={{ border: '1px solid black' }}
      ></svg>
    </div>
  );
};

export default PRHivePlot;
