import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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
  offsetFactor?: number;
  directionFactor?: number;
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
    const filteredData = filterTopUsers(graphData, 6);

    const width = 600;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text('Directed Network Diagram');

    const tooltip = d3.select(tooltipRef.current);

    const simulation = d3
      .forceSimulation(filteredData.nodes)
      .force(
        'link',
        d3
          .forceLink(filteredData.edges)
          .id((d: PRNode) => d.id)
          .distance(300)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1))
      .force('collision', d3.forceCollide().radius(40));

    const colorMap = {
      approved: '#2ca02c', // Green
      changes_requested: '#d62728', // Red
      dismissed: '#7f7f7f', // Gray
      commented: '#1f77b4', // Blue
      default: '#ff7f0e', // Orange
    };

    const statusTypes = [
      { status: 'approved', label: 'Approved' },
      { status: 'changes_requested', label: 'Changes Requested' },
      { status: 'dismissed', label: 'Dismissed' },
      { status: 'commented', label: 'Commented' },
    ];

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 230}, 60)`);

    legend
      .append('text')
      .attr('x', -20)
      .attr('y', 0)
      .attr('font-weight', 'bold')
      .text('Interaction Types');

    statusTypes.forEach((item, _index) => {
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(-15, ${_index * 25 + 20})`);

      legendItem
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 30)
        .attr('y2', 0)
        .attr('stroke', colorMap[item.status as keyof typeof colorMap])
        .attr('stroke-width', 3)
        .attr('marker-end', `url(#arrow-${item.status})`);

      legendItem.append('text').attr('x', 40).attr('y', 5).text(item.label);
    });

    const defs = svg.append('defs');

    defs
      .selectAll('marker')
      .data(['approved', 'changes_requested', 'dismissed', 'commented'])
      .enter()
      .append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => colorMap[d as keyof typeof colorMap]);

    const edgesByPairs = groupEdgesByPairs(filteredData.edges);

    // Calculate weights for normalization
    const allEdges = Object.values(edgesByPairs).flat();
    const weights = allEdges.map(edge => edge.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    // Create a stroke width scale function
    const strokeWidthScale = d3
      .scaleLinear()
      .domain([minWeight, maxWeight])
      .range([1, 8]);

    const link = svg
      .append('g')
      .selectAll('g')
      .data(Object.values(edgesByPairs).flat())
      .enter()
      .append('path')
      .attr(
        'stroke',
        d => colorMap[d.status as keyof typeof colorMap] || colorMap.default
      )
      .attr('stroke-width', d => strokeWidthScale(d.weight))
      .attr('fill', 'none')
      .attr('marker-end', d => `url(#arrow-${d.status})`)
      .on('mouseover', (event: MouseEvent, d: PREdge) => {
        const currentTarget = event.currentTarget as SVGPathElement;
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${typeof d.source === 'string' ? d.source : d.source.id} → ${typeof d.target === 'string' ? d.target : d.target.id}</strong><br/>${d.weight} reviews (${d.status})`
          )
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY + 10}px`);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY + 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(filteredData.nodes)
      .enter()
      .append('circle')
      .attr('r', 15)
      .attr('fill', '#4682B4')
      .call(
        d3
          .drag<SVGCircleElement, PRNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    const labels = svg
      .append('g')
      .selectAll('text')
      .data(filteredData.nodes)
      .enter()
      .append('text')
      .attr('dy', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', 'black')
      .text(d => d.id);

    simulation.on('tick', () => {
      link.attr('d', (d: PREdge) => {
        const x1 = (d.source as PRNode).x!;
        const y1 = (d.source as PRNode).y!;
        const x2 = (d.target as PRNode).x!;
        const y2 = (d.target as PRNode).y!;

        const dx = x2 - x1;
        const dy = y2 - y1;

        const offsetFactor = d.offsetFactor || 0;
        const curveOffset = 20 + offsetFactor * 15;

        const statusDirection =
          d.status === 'approved'
            ? 1
            : d.status === 'changes_requested'
              ? -1
              : d.status === 'commented'
                ? 0.5
                : 0;

        const directionFactor = d.directionFactor || 1;

        const finalDirection = statusDirection * directionFactor;

        const mx = x1 + dx / 2 + curveOffset * finalDirection;
        const my = y1 + dy / 2 + curveOffset * finalDirection;

        return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
      });

      node
        .attr('cx', d => (d.x = Math.max(15, Math.min(width - 15, d.x!))))
        .attr('cy', d => (d.y = Math.max(15, Math.min(height - 15, d.y!))));

      labels.attr('x', d => d.x!).attr('y', d => d.y!);
    });
  }, [graphData]);

  const groupEdgesByPairs = (edges: PREdge[]) => {
    const pairs: Record<string, PREdge[]> = {};
    const bidirectionalPairs: Record<string, boolean> = {};

    // First identify bidirectional relationships (A->B and B->A)
    edges.forEach(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;
      const pairKey = `${sourceId}-${targetId}`;
      const reversePairKey = `${targetId}-${sourceId}`;

      if (pairs[reversePairKey]) {
        bidirectionalPairs[pairKey] = true;
        bidirectionalPairs[reversePairKey] = true;
      }

      if (!pairs[pairKey]) {
        pairs[pairKey] = [];
      }
      pairs[pairKey].push(edge);
    });

    Object.entries(pairs).forEach(([pairKey, pairEdges]) => {
      const [sourceId, targetId] = pairKey.split('-');
      const isBidirectional = bidirectionalPairs[pairKey];

      // Group by status
      const statusGroups: Record<string, PREdge[]> = {};
      pairEdges.forEach(edge => {
        if (!statusGroups[edge.status]) {
          statusGroups[edge.status] = [];
        }
        statusGroups[edge.status].push(edge);
      });

      Object.entries(statusGroups).forEach(
        ([_status, statusEdges], statusIndex) => {
          statusEdges.forEach(edge => {
            // @ts-expect-error Adding custom property offsetFactor to edge which is not in the original type definition
            edge.offsetFactor = statusIndex;

            if (isBidirectional) {
              // @ts-expect-error Adding custom property directionFactor to edge which is not in the original type definition
              edge.directionFactor = sourceId < targetId ? 1 : -1;
            } else {
              // @ts-expect-error Adding custom property directionFactor to edge which is not in the original type definition
              edge.directionFactor = 1;
            }
          });
        }
      );
    });

    return pairs;
  };

  const filterTopUsers = (
    data: { nodes: PRNode[]; edges: PREdge[] },
    limit: number
  ) => {
    const interactionCounts = new Map<string, number>();

    data.nodes.forEach(node => {
      interactionCounts.set(node.id, 0);
    });

    data.edges.forEach(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;

      interactionCounts.set(
        sourceId,
        (interactionCounts.get(sourceId) || 0) + edge.weight
      );
      interactionCounts.set(
        targetId,
        (interactionCounts.get(targetId) || 0) + edge.weight
      );
    });

    // Sort users by interaction count and get top users
    const topUserIds = Array.from(interactionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);

    const filteredNodes = data.nodes.filter(node =>
      topUserIds.includes(node.id)
    );

    const filteredEdges = data.edges.filter(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;
      return topUserIds.includes(sourceId) && topUserIds.includes(targetId);
    });

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  };

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
        style={{ border: '1px solid #ccc', borderRadius: '8px' }}
      ></svg>
    </div>
  );
};

export default PRGraph;
