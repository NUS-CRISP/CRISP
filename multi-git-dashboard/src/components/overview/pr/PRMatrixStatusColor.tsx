import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PRNode {
  id: string;
}

interface PREdge {
  source: string | PRNode;
  target: string | PRNode;
  weight: number;
  status: string;
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

    const margin = { top: 100, right: 100, bottom: 150, left: 160 },
      width = 600 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    svg
      .append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Matrix with Status Colors');

    const matrixG = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);

    const n = graphData.nodes.length;

    const indexById = new Map<string, number>();
    graphData.nodes.forEach((node, i) => {
      indexById.set(node.id, i);
    });

    type CellData = { weight: number; status: string };
    const matrix: CellData[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({ weight: 0, status: '' }))
    );

    graphData.edges.forEach(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;
      const sIndex = indexById.get(sourceId);
      const tIndex = indexById.get(targetId);
      if (sIndex !== undefined && tIndex !== undefined) {
        matrix[sIndex][tIndex].weight += edge.weight;
        matrix[sIndex][tIndex].status = edge.status;
      }
    });

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

    const xScale = d3
      .scaleBand()
      .domain(d3.range(n).map(String))
      .range([0, width])
      .padding(0.05);
    const yScale = d3
      .scaleBand()
      .domain(d3.range(n).map(String))
      .range([0, height])
      .padding(0.05);

    const maxWeight = d3.max(cells, d => d.weight) || 1;

    const statusColorMap: Record<string, string> = {
      approved: '#4caf50', // green
      changes_requested: '#ff9800', // orange
      dismissed: '#9e9e9e', // gray
      commented: '#2196f3', // blue
    };

    function getCellColor(d: { weight: number; status: string }) {
      if (d.weight === 0) return '#eee';

      const baseColor = statusColorMap[d.status] || '#ccc';

      const t = d.weight / maxWeight; // 0..1

      return d3.interpolateRgb('#eee', baseColor)(t);
    }

    // cells
    matrixG
      .selectAll('rect')
      .data(cells)
      .enter()
      .append('rect')
      .attr('x', d => xScale(String(d.col))!)
      .attr('y', d => yScale(String(d.row))!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', getCellColor)
      .attr('stroke', '#fff')
      .on('mouseover', (event, d) => {
        if (d.weight > 0) {
          tooltip
            .style('opacity', 1)
            .html(
              `<strong>${graphData.nodes[d.row].id} → ${
                graphData.nodes[d.col].id
              }</strong><br/>Weight: ${d.weight}<br/>Status: ${
                d.status || 'N/A'
              }`
            )
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY + 10}px`);
        }
      })
      .on('mousemove', event => {
        tooltip
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY + 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // Row labels
    matrixG
      .selectAll('.rowLabel')
      .data(graphData.nodes)
      .enter()
      .append('text')
      .attr('class', 'rowLabel')
      .attr('x', -10)
      .attr('y', (_, i) => (yScale(String(i)) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .text(d => d.id);

    // Column labels
    matrixG
      .selectAll('.colLabel')
      .data(graphData.nodes)
      .enter()
      .append('text')
      .attr('class', 'colLabel')
      .attr('x', (_, i) => (xScale(String(i)) || 0) + xScale.bandwidth() / 2)
      .attr('y', height + 30)
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .attr('transform', (_, i) => {
        const x = (xScale(String(i)) || 0) + xScale.bandwidth() / 2;
        const y = height + 30;
        return `rotate(-45, ${x}, ${y})`;
      })
      .text(d => d.id);

    // Legends
    const legendData = [
      { status: 'approved', color: statusColorMap.approved },
      { status: 'changed', color: statusColorMap.changes_requested },
      { status: 'dismissed', color: statusColorMap.dismissed },
      { status: 'commented', color: statusColorMap.commented },
    ];

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left - 50}, ${margin.top - 40})`);

    legend
      .selectAll('rect')
      .data(legendData)
      .enter()
      .append('rect')
      .attr('x', (_, i) => i * 120)
      .attr('y', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', d => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .enter()
      .append('text')
      .attr('x', (_, i) => i * 120 + 18)
      .attr('y', 6)
      .attr('dy', '.35em')
      .text(d => d.status);
  }, [graphData]);

  return (
    <svg
      ref={svgRef}
      width="600"
      height="600"
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
    ></svg>
  );
};

export default PRMatrixStatusColor;
