import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box } from '@mantine/core';

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

// Extended ChordGroup interface with optional angle property
interface ChordGroup {
  startAngle: number;
  endAngle: number;
  value: number;
  index: number;
  angle?: number; // Adding optional angle property to fix TypeScript error
}

interface ArcChordGroup extends ChordGroup {
  innerRadius: number;
  outerRadius: number;
}

// Removed unused RibbonData interface

// Type for arc usage tracking
interface ArcUsage {
  [key: number]: {
    startAngle: number;
    endAngle: number;
    used: number;
  };
}

const processGraphDataForChord = (graphData: PRGraphData): PRGraphData => {
  console.log('Original graph data:', JSON.stringify(graphData, null, 2));

  if (!graphData || !graphData.nodes || !graphData.nodes.length) {
    return { nodes: [], edges: [] };
  }

  const processedEdges = graphData.edges.map(edge => {
    const weight = typeof edge.weight === 'number' ? edge.weight : 1;
    return {
      ...edge,
      weight: weight > 0 ? weight : 1,
    };
  });

  const interactionCounts: Record<string, number> = {};
  processedEdges.forEach(edge => {
    interactionCounts[edge.source] =
      (interactionCounts[edge.source] || 0) + edge.weight;
    interactionCounts[edge.target] =
      (interactionCounts[edge.target] || 0) + edge.weight;
  });

  const sortedNodes = [...graphData.nodes].sort(
    (a, b) => (interactionCounts[b.id] || 0) - (interactionCounts[a.id] || 0)
  );

  if (Object.values(interactionCounts).every(count => count === 0)) {
    console.log('No interactions found, creating dummy connections');

    const dummyEdges: PREdge[] = [];
    const nodeIds = sortedNodes.map(node => node.id);

    for (let i = 0; i < nodeIds.length && i < 6; i++) {
      for (let j = 0; j < nodeIds.length && j < 6; j++) {
        if (i !== j) {
          dummyEdges.push({
            source: nodeIds[i],
            target: nodeIds[j],
            weight: Math.floor(Math.random() * 5) + 1,
            status: 'approved',
          });
        }
      }
    }

    return {
      nodes: sortedNodes,
      edges: dummyEdges,
    };
  }

  return {
    nodes: sortedNodes,
    edges: processedEdges,
  };
};

const PRChordDiagram: React.FC<PRChordDiagramProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const processedData = processGraphDataForChord(graphData);
    console.log('Processed graph data:', processedData);

    if (!processedData.nodes.length) {
      console.log('No nodes to render');
      return;
    }

    d3.select(svgRef.current).selectAll('*').remove();

    const interactionCounts: Record<string, number> = {};
    processedData.edges.forEach(edge => {
      interactionCounts[edge.source] =
        (interactionCounts[edge.source] || 0) + edge.weight;
      interactionCounts[edge.target] =
        (interactionCounts[edge.target] || 0) + edge.weight;
    });

    console.log('Interaction counts:', interactionCounts);

    // Get top 6 nodes by total interactions
    const top6Nodes = processedData.nodes.slice(
      0,
      Math.min(6, processedData.nodes.length)
    );
    top6Nodes.sort((a, b) => {
      return (interactionCounts[b.id] || 0) - (interactionCounts[a.id] || 0);
    });
    const top6NodeIds = new Set(top6Nodes.map(node => node.id));

    console.log('Top 6 nodes (sorted):', top6Nodes);

    const filteredEdges = processedData.edges.filter(
      edge => top6NodeIds.has(edge.source) && top6NodeIds.has(edge.target)
    );

    console.log('Filtered edges:', filteredEdges);

    if (filteredEdges.length === 0) {
      console.log('No edges between top nodes, adding artificial connections');
      const nodeIds = top6Nodes.map(node => node.id);

      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = 0; j < nodeIds.length; j++) {
          if (i !== j) {
            filteredEdges.push({
              source: nodeIds[i],
              target: nodeIds[j],
              weight: Math.floor(Math.random() * 5) + 1,
              status: 'approved',
            });
          }
        }
      }
    }

    const width = 600;
    const height = 600;
    const innerRadius = 180;
    const outerRadius = innerRadius * 1.1;

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(top6Nodes.map(node => node.id))
      .range(d3.schemeCategory10);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    svg
      .append('text')
      .attr('x', 0)
      .attr('y', -height / 2 + 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text('Chord Diagram');

    const indexByName: Record<string, number> = {};
    top6Nodes.forEach((node, i) => {
      indexByName[node.id] = i;
    });

    // matrix for chord connections
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

    console.log('Matrix data:', matrix);

    // Calculate total incoming and outgoing for each node
    const interactionsMap: Record<string, number> = {}; // Store by node ID for sorting
    const outgoingInteractions: number[] = [];
    const incomingInteractions: number[] = [];
    const totalInteractions: number[] = [];

    for (let i = 0; i < top6Nodes.length; i++) {
      let outgoing = 0;
      let incoming = 0;

      for (let j = 0; j < top6Nodes.length; j++) {
        outgoing += matrix[i][j];
      }

      for (let j = 0; j < top6Nodes.length; j++) {
        if (j !== i) {
          incoming += matrix[j][i];
        }
      }

      outgoingInteractions[i] = outgoing;
      incomingInteractions[i] = incoming;
      totalInteractions[i] = outgoing + incoming;
      interactionsMap[top6Nodes[i].id] = totalInteractions[i];
    }
    console.log('Total interactions per node:', totalInteractions);

    // Sort
    top6Nodes.sort((a, b) => interactionsMap[b.id] - interactionsMap[a.id]);

    top6Nodes.forEach((node, i) => {
      indexByName[node.id] = i;
    });

    const sortedMatrix: number[][] = Array(top6Nodes.length)
      .fill(0)
      .map(() => Array(top6Nodes.length).fill(0));

    filteredEdges.forEach(edge => {
      const sourceIndex = indexByName[edge.source];
      const targetIndex = indexByName[edge.target];
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        sortedMatrix[sourceIndex][targetIndex] = Math.max(1, edge.weight);
      }
    });

    const sortedTotalInteractions: number[] = [];
    const sortedOutgoingInteractions: number[] = [];
    const sortedIncomingInteractions: number[] = [];

    for (let i = 0; i < top6Nodes.length; i++) {
      let outgoing = 0;
      let incoming = 0;

      for (let j = 0; j < top6Nodes.length; j++) {
        outgoing += sortedMatrix[i][j];
      }

      for (let j = 0; j < top6Nodes.length; j++) {
        if (j !== i) {
          incoming += sortedMatrix[j][i];
        }
      }

      sortedOutgoingInteractions[i] = outgoing;
      sortedIncomingInteractions[i] = incoming;
      sortedTotalInteractions[i] = outgoing + incoming;
    }

    // matrix for arc sizes based on total interactions
    const arcSizeMatrix: number[][] = Array.from(
      { length: top6Nodes.length },
      () => Array(top6Nodes.length).fill(0)
    );

    // Fill the diagonal
    for (let i = 0; i < top6Nodes.length; i++) {
      arcSizeMatrix[i][i] = sortedTotalInteractions[i];
    }

    // chord layout for arc sizes
    const chord = d3
      .chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)
      .sortGroups(null); // Don't sort groups to preserve the ordering!!!

    const chords = chord(arcSizeMatrix);

    // arc and ribbon generators
    const arc = d3
      .arc<ArcChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'chord-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '10');

    const groups = svg.append('g').selectAll('g').data(chords.groups).join('g');

    groups
      .append('path')
      .attr('fill', d => colorScale(top6Nodes[d.index].id))
      .attr('stroke', 'white')
      .attr('d', d => {
        // Create an object that satisfies both the chord group and the arc requirements
        const arcData: ArcChordGroup = {
          ...d,
          innerRadius: innerRadius,
          outerRadius: outerRadius,
        };
        return arc(arcData);
      })
      .on('mouseover', (event, d) => {
        const nodeName = top6Nodes[d.index].id;

        tooltip.style('visibility', 'visible').html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${nodeName}</div>
            <div>Outgoing reviews: ${sortedOutgoingInteractions[d.index]}</div>
            <div>Incoming reviews: ${sortedIncomingInteractions[d.index]}</div>
            <div>Total interactions: ${sortedTotalInteractions[d.index]}</div>
          `);
      })
      .on('mousemove', event => {
        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    groups
      .append('text')
      .each(d => {
        // Add angle property to d
        const dWithAngle = d as ChordGroup;
        dWithAngle.angle = (dWithAngle.startAngle + dWithAngle.endAngle) / 2;
      })
      .attr('dy', '0.35em')
      .attr('transform', d => {
        const dWithAngle = d as ChordGroup;
        return `
          rotate(${((dWithAngle.angle || 0) * 180) / Math.PI - 90})
          translate(${outerRadius + 10})
          ${(dWithAngle.angle || 0) > Math.PI ? 'rotate(180)' : ''}
        `;
      })
      .attr('text-anchor', d => {
        const dWithAngle = d as ChordGroup;
        return (dWithAngle.angle || 0) > Math.PI ? 'end' : null;
      })
      .text(d => top6Nodes[d.index].id);

    const arcUsage: ArcUsage = {};
    top6Nodes.forEach((_, i) => {
      arcUsage[i] = {
        startAngle: chords.groups[i].startAngle,
        endAngle: chords.groups[i].endAngle,
        used: 0,
      };
    });

    // Create the ribbon generator
    const ribbonGenerator = d3.ribbon().radius(innerRadius);

    svg
      .append('g')
      .attr('fill-opacity', 0.7)
      .selectAll('path')
      .data(
        matrix.flatMap((row, i) =>
          row
            .map((value, j) => ({
              source: i,
              target: j,
              value: value,
            }))
            .filter(d => d.value > 0)
        )
      )
      .join('path')
      .attr('d', (d: { source: number; target: number; value: number }) => {
        // Get the arc info for source and target
        const sourceArc = chords.groups[d.source];
        const targetArc = chords.groups[d.target];

        // Calculate the proportion of total interactions this edge represents
        const sourceValue = d.value / totalInteractions[d.source];
        const targetValue = d.value / totalInteractions[d.target];

        // Calculate how much of the arc angle this ribbon should use
        const sourceArcLength = sourceArc.endAngle - sourceArc.startAngle;
        const targetArcLength = targetArc.endAngle - targetArc.startAngle;

        const sourcePadding = sourceArcLength * 0.001;
        const targetPadding = targetArcLength * 0.001;

        // Calculate the ribbon width in the arc (proportional to its value but with reasonable limits)
        const sourceWidth = Math.max(
          sourceArcLength * 0.1,
          sourceArcLength * sourceValue
        );
        const targetWidth = Math.max(
          targetArcLength * 0.1,
          targetArcLength * targetValue
        );

        // Position the ribbon connection point within the arc
        // Add random positioning to spread ribbons within the arc
        const sourcePosition =
          sourceArc.startAngle +
          sourcePadding +
          (sourceArcLength - 2 * sourcePadding - sourceWidth) * Math.random();
        const targetPosition =
          targetArc.startAngle +
          targetPadding +
          (targetArcLength - 2 * targetPadding - targetWidth) * Math.random();

        // Create ribbon data with proper typing
        const ribbonData = {
          source: {
            startAngle: sourcePosition,
            endAngle: sourcePosition + sourceWidth,
            radius: innerRadius,
            index: d.source,
          },
          target: {
            startAngle: targetPosition,
            endAngle: targetPosition + targetWidth,
            radius: innerRadius,
            index: d.target,
          },
        };

        // Using a direct return with a cast to make TypeScript happy
        const pathData = ribbonGenerator(ribbonData);
        return pathData as any;
      })
      .attr('fill', d => colorScale(top6Nodes[d.source].id))
      .attr('stroke', 'white')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        const sourceName = top6Nodes[d.source].id;
        const targetName = top6Nodes[d.target].id;

        tooltip.style('visibility', 'visible').html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${sourceName} → ${targetName}</div>
            <div>Reviews: ${d.value}</div>
          `);
      })
      .on('mousemove', event => {
        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    return () => {
      d3.select('.chord-tooltip').remove();
    };
  }, [graphData]);

  return (
    <Box
      mt={20}
      style={{
        width: '600px',
        height: '600px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <svg ref={svgRef} width="600" height="600" />
      </Box>
    </Box>
  );
};

export default PRChordDiagram;
