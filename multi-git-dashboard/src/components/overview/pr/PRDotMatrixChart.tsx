import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

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

interface StatusCount {
  approved: number;
  changes_requested: number;
  dismissed: number;
  commented: number;
}

interface PRDotMatrixChartProps {
  graphData: PRGraphData;
}

const PRDotMatrixChart: React.FC<PRDotMatrixChartProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData?.nodes?.length || !graphData?.edges?.length) {
      console.log('No data available for the dot matrix chart');
      return;
    }

    const width = 600;
    const height = 600;
    const margin = { top: 80, right: 60, bottom: 80, left: 110 };

    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll('*').remove();

    const svg = svgEl
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select(tooltipRef.current).style('opacity', 0);

    const interactionMap = new Map<string, StatusCount>();

    graphData.edges.forEach(edge => {
      const key = `${edge.source}->${edge.target}`;

      if (!interactionMap.has(key)) {
        interactionMap.set(key, {
          approved: 0,
          changes_requested: 0,
          dismissed: 0,
          commented: 0,
        });
      }

      const statusCounts = interactionMap.get(key);
      if (statusCounts) {
        statusCounts[edge.status as keyof StatusCount] += edge.weight;
      }
    });

    // total interactions for each user
    const userInteractions = new Map<string, number>();

    graphData.nodes.forEach(node => {
      const userId = node.id;
      let totalInteractions = 0;

      interactionMap.forEach((counts, key) => {
        const [source, target] = key.split('->');
        if (source === userId || target === userId) {
          totalInteractions += Object.values(counts).reduce(
            (sum, count) => sum + count,
            0
          );
        }
      });

      userInteractions.set(userId, totalInteractions);
    });

    const sortedUsers = Array.from(userInteractions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(entry => entry[0]);

    // only 6 users
    const filteredInteractionMap = new Map<string, StatusCount>();
    interactionMap.forEach((counts, key) => {
      const [source, target] = key.split('->');
      if (sortedUsers.includes(source) && sortedUsers.includes(target)) {
        filteredInteractionMap.set(key, counts);
      }
    });

    const xScale = d3
      .scaleBand()
      .domain(sortedUsers)
      .range([0, width - margin.left - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleBand()
      .domain(sortedUsers)
      .range([height - margin.top - margin.bottom, 0])
      .padding(0.1);

    let maxCount = 0;
    filteredInteractionMap.forEach(counts => {
      Object.values(counts).forEach(count => {
        if (count > maxCount) maxCount = count;
      });
    });

    const rScale = d3
      .scaleSqrt()
      .domain([0, maxCount])
      .range([0, xScale.bandwidth() / 1.7]);

    // color map
    const statusColorMap: Record<string, string> = {
      approved: '#2ecc71', // Green
      changes_requested: '#e74c3c', // Red
      dismissed: '#7f8c8d', // Gray
      commented: '#3498db', // Blue
    };

    // const statusOrder: Array<keyof StatusCount> = [
    //   'approved',
    //   'dismissed',
    //   'commented',
    //   'changes_requested',
    // ];

    // x axis (reviewer)
    svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    // y axis (author)
    svg.append('g').call(d3.axisLeft(yScale));

    const allPairs: Array<{ reviewer: string; author: string }> = [];
    sortedUsers.forEach(reviewer => {
      sortedUsers.forEach(author => {
        if (reviewer !== author) {
          // exclude self-reviews
          allPairs.push({ reviewer, author });
        }
      });
    });

    // circles
    allPairs.forEach(pair => {
      // key: reviewer->author (source->target)
      const key = `${pair.reviewer}->${pair.author}`;
      const interactions = filteredInteractionMap.get(key);

      if (interactions) {
        // X coordinate is based on reviewer, Y coordinate is based on author
        const cx = xScale(pair.reviewer)! + xScale.bandwidth() / 2;
        const cy = yScale(pair.author)! + yScale.bandwidth() / 2;

        // sort statuses by their count in ascending order
        const sortedStatuses = (
          Object.keys(interactions) as Array<keyof StatusCount>
        ).sort((a, b) => interactions[b] - interactions[a]);

        sortedStatuses.forEach(status => {
          const count = interactions[status];
          if (count > 0) {
            const radius = rScale(count);

            svg
              .append('circle')
              .attr('cx', cx)
              .attr('cy', cy)
              .attr('r', radius)
              .attr('fill', statusColorMap[status])
              .attr('stroke', '#fff')
              .attr('stroke-width', 1)
              .attr('opacity', 0.85) // transparent
              .attr('data-reviewer', pair.reviewer)
              .attr('data-author', pair.author)
              .attr('data-status', status)
              .attr('data-count', count)
              .on('mouseover', function (event) {
                d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);

                const tooltipContent = `
                  <strong>Reviewer:</strong> ${pair.reviewer}<br/>
                  <strong>Author:</strong> ${pair.author}<br/>
                  <strong>${status}:</strong> ${count}<br/>
                `;

                tooltip
                  .style('opacity', 1)
                  .html(tooltipContent)
                  .style('left', `${event.offsetX + 10}px`)
                  .style('top', `${event.offsetY + 10}px`);
              })
              .on('mousemove', function (event) {
                tooltip
                  .style('left', `${event.offsetX + 10}px`)
                  .style('top', `${event.offsetY + 10}px`);
              })
              .on('mouseout', function () {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
                tooltip.style('opacity', 0);
              });
          }
        });
      }
    });

    svg
      .append('text')
      .attr('x', (width - margin.left - margin.right) / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', 16)
      .attr('font-weight', 'bold')
      .text('Dot Matrix Diagram');

    // legend
    const legendData = [
      { status: 'approved', label: 'Approved' },
      { status: 'changes_requested', label: 'Changes Requested' },
      { status: 'dismissed', label: 'Dismissed' },
      { status: 'commented', label: 'Commented' },
    ];

    const legend = svg
      .append('g')
      .attr(
        'transform',
        `translate(${width - margin.left - margin.right - 80}, -50)`
      );

    legendData.forEach((item, i) => {
      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow
        .append('circle')
        .attr('r', 6)
        .attr('fill', statusColorMap[item.status]);

      legendRow
        .append('text')
        .attr('x', 15)
        .attr('y', 5)
        .text(item.label)
        .style('font-size', 12);
    });

    // axis labels
    svg
      .append('text')
      .attr(
        'transform',
        `translate(${(width - margin.left - margin.right) / 2}, ${height - margin.top - margin.bottom + 70})`
      )
      .style('text-anchor', 'middle')
      .text('PR Reviewer');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -90)
      .attr('x', -(height - margin.top - margin.bottom) / 2)
      .style('text-anchor', 'middle')
      .text('PR Author');
  }, [graphData]);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width="600"
        height="600"
        style={{ border: '1px solid #ccc', borderRadius: '8px' }}
      ></svg>
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          opacity: 0,
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      ></div>
    </div>
  );
};

export default PRDotMatrixChart;
