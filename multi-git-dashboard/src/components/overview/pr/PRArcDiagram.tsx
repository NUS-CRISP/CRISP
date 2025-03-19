import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Text } from '@mantine/core';

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
    if (
      !graphData ||
      !graphData.nodes.length ||
      !graphData.edges.length ||
      !svgRef.current
    ) {
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

    // Title
    svg
      .append('text')
      .attr('x', width / 2 - 50)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Arc Diagram');

    // node IDs
    const nodeIds = Array.from(
      new Set([
        ...graphData.edges.map((e) => e.source),
        ...graphData.edges.map((e) => e.target),
      ])
    );

    // total interactions for each node
    const interactionCount: Record<string, number> = {};
    graphData.edges.forEach((edge) => {
      interactionCount[edge.source] =
        (interactionCount[edge.source] || 0) + edge.weight;
      interactionCount[edge.target] =
        (interactionCount[edge.target] || 0) + edge.weight;
    });

    // sort DESC
    nodeIds.sort((a, b) => (interactionCount[b] || 0) - (interactionCount[a] || 0));

    const nodeMap = new Map<string, number>();
    nodeIds.forEach((id, i) => {
      nodeMap.set(id, i);
    });

    // x-positions
    const spacingFactor = 0.6;
    const totalSpace = innerWidth * spacingFactor;
    const nodePositions = nodeIds.map((id, i) => ({
      id,
      x: margin.left + (i * totalSpace) / Math.max(1, nodeIds.length - 1),
      y: innerHeight / 2,
    }));

    // links array
    const links = graphData.edges
      .map((edge) => {
        const sourceIndex = nodeMap.get(edge.source);
        const targetIndex = nodeMap.get(edge.target);

        if (sourceIndex === undefined || targetIndex === undefined) {
          return null;
        }

        return {
          source: sourceIndex,
          sourceId: edge.source,
          target: targetIndex,
          targetId: edge.target,
          weight: edge.weight,
          status: edge.status,
        };
      })
      .filter((link) => link !== null) as {
        source: number;
        sourceId: string;
        target: number;
        targetId: string;
        weight: number;
        status: string;
      }[];

    // min and max weights for normalization
    const weights = links.map(link => link.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    
    // linear scale for stroke width
    const MIN_STROKE_WIDTH = 1;
    const MAX_STROKE_WIDTH = 8;
    
    // scale func: map weights to stroke widths
    const strokeWidthScale = d3.scaleLinear()
      .domain([minWeight, maxWeight])
      .range([MIN_STROKE_WIDTH, MAX_STROKE_WIDTH]);

    // arcs
    const arcSelection = svg
      .selectAll('.arc')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('d', (d) => {
        const sourceNode = nodePositions[d.source];
        const targetNode = nodePositions[d.target];

        if (!sourceNode || !targetNode) {
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

        // arc path
        return `M${x1},${y} A${distance / 2},${arcHeight} 0 0,1 ${x2},${y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', (d) => getStatusColor(d.status))
      .attr('stroke-width', (d) => strokeWidthScale(d.weight)) // Use the scale function
      .attr('opacity', 0.8);

    // hide arcs that are NOT "approved" by default
    arcSelection
      .filter((d) => d.status !== 'approved')
      .style('display', 'none');

    // nodes
    svg
      .selectAll('.node')
      .data(nodePositions)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 6)
      .attr('fill', '#4c78a8');

    // node labels
    svg
      .selectAll('.node-label')
      .data(nodePositions)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('transform', (d) => `rotate(45, ${d.x}, ${d.y + 20})`)
      .text((d) => {
        const name = d.id;
        // Truncate if very long
        return name.length > 12 ? name.substring(0, 10) + '...' : name;
      });

    // legend data for status colors
    const legendData = [
      { status: 'approved', color: getStatusColor('approved') },
      { status: 'changes_requested', color: getStatusColor('changes_requested') },
      { status: 'commented', color: getStatusColor('commented') },
      { status: 'dismissed', color: getStatusColor('dismissed') },
    ];

    // group edges by status
    const edgesByStatus: Record<string, typeof links> = {};
    legendData.forEach(item => {
      edgesByStatus[item.status] = links.filter(link => link.status === item.status);
    });

    // weight stats by status
    const weightStatsByStatus: Record<string, {min: number, max: number, mid?: number}> = {};
    
    Object.entries(edgesByStatus).forEach(([status, statusLinks]) => {
      if (statusLinks.length === 0) {
        weightStatsByStatus[status] = { min: 0, max: 0 };
        return;
      }
      
      const statusWeights = statusLinks.map(link => link.weight);
      const min = Math.min(...statusWeights);
      const max = Math.max(...statusWeights);
      
      weightStatsByStatus[status] = {
        min,
        max,
        ...(max - min > 2 ? { mid: Math.round((min + max) / 2) } : {})
      };
    });

    // weight legend (updated on hover)
    const weightLegendX = 10;
    const weightLegendY = 10;
    
    const weightLegendGroup = svg.append('g')
      .attr('transform', `translate(${weightLegendX}, ${weightLegendY})`)
      .attr('class', 'weight-legend');
    
    // weight legend title
    weightLegendGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Weight Legend');
    
    // update weight legend based on status
    const updateWeightLegend = (status: string) => {
      const stats = weightStatsByStatus[status] || { min: 0, max: 0 };
      
      // clear
      weightLegendGroup.selectAll('.weight-line, .weight-text').remove();
      
      if (stats.min === stats.max) {
        // when only one weight value
        weightLegendGroup.append('line')
          .attr('class', 'weight-line')
          .attr('x1', 0)
          .attr('y1', 20)
          .attr('x2', 30)
          .attr('y2', 20)
          .attr('stroke', getStatusColor(status))
          .attr('stroke-width', MIN_STROKE_WIDTH);
        
        weightLegendGroup.append('text')
          .attr('class', 'weight-text')
          .attr('x', 35)
          .attr('y', 24)
          .attr('font-size', '10px')
          .text(`Weight: ${stats.min}`);
      } else {
        // min weight
        weightLegendGroup.append('line')
          .attr('class', 'weight-line')
          .attr('x1', 0)
          .attr('y1', 20)
          .attr('x2', 30)
          .attr('y2', 20)
          .attr('stroke', getStatusColor(status))
          .attr('stroke-width', MIN_STROKE_WIDTH);
        
        weightLegendGroup.append('text')
          .attr('class', 'weight-text')
          .attr('x', 35)
          .attr('y', 24)
          .attr('font-size', '10px')
          .text(`Min: ${stats.min}`);
        
        // mid weight
        if (stats.mid !== undefined) {
          const midStrokeWidth = strokeWidthScale(stats.mid);
          weightLegendGroup.append('line')
            .attr('class', 'weight-line')
            .attr('x1', 0)
            .attr('y1', 40)
            .attr('x2', 30)
            .attr('y2', 40)
            .attr('stroke', getStatusColor(status))
            .attr('stroke-width', midStrokeWidth);
          
          weightLegendGroup.append('text')
            .attr('class', 'weight-text')
            .attr('x', 35)
            .attr('y', 44)
            .attr('font-size', '10px')
            .text(`Mid: ${stats.mid}`);
        }
        
        // max weight
        const yPos = stats.mid !== undefined ? 60 : 40;
        weightLegendGroup.append('line')
          .attr('class', 'weight-line')
          .attr('x1', 0)
          .attr('y1', yPos)
          .attr('x2', 30)
          .attr('y2', yPos)
          .attr('stroke', getStatusColor(status))
          .attr('stroke-width', MAX_STROKE_WIDTH);
        
        weightLegendGroup.append('text')
          .attr('class', 'weight-text')
          .attr('x', 35)
          .attr('y', yPos + 4)
          .attr('font-size', '10px')
          .text(`Max: ${stats.max}`);
      }
    };
    
    updateWeightLegend('approved');
    
    const legendX = 400;
    const legendY = 10;

    const legend = svg.append('g').attr('transform', `translate(${legendX}, ${legendY})`);


    legendData.forEach((item, i) => {

      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 20})`)
        .on('mouseover', () => {
          // arcs for the hovered status
          arcSelection.style('display', (d) =>
            d.status === item.status ? 'block' : 'none'
          );
          
          // update weight legend
          updateWeightLegend(item.status);
        })
        .on('mouseout', () => {
          // revert to default: "approved" arcs
          arcSelection.style('display', (d) =>
            d.status === 'approved' ? 'block' : 'none'
          );
          
          updateWeightLegend('approved');
        });

      // legend color box
      legendRow
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color);

      // legend text
      legendRow
        .append('text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('font-size', '12px')
        .text(item.status);
    });

  }, [graphData, width, height]);



  return (
    <svg
      ref={svgRef}
      width="600"
      height="500"
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
    />
  );
};

export default PRArcDiagram;