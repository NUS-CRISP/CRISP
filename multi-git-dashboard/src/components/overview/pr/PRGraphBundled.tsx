// import React, { useEffect, useRef } from 'react';
// import * as d3 from 'd3';

// interface PRNodeBundled {
//   id: string;
//   group: string;
// }

// interface PREdge {
//   source: string;
//   target: string;
//   weight: number;
//   status: string;
// }

// interface PRGraphDataBundled {
//   nodes: PRNodeBundled[];
//   edges: PREdge[];
// }

// interface PRGraphBundledProps {
//   graphData: PRGraphDataBundled;
// }

// const PRGraphBundled: React.FC<PRGraphBundledProps> = ({ graphData }) => {
//   const svgRef = useRef<SVGSVGElement>(null);
//   const tooltipRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!graphData.nodes.length || !graphData.edges.length) return;

//     const width = 600;
//     const height = 600;
//     const margin = 50;
//     const radius = 200;

//     const svgElement = d3.select(svgRef.current);
//     svgElement.selectAll('*').remove();

//     const container = svgElement.attr('width', width).attr('height', height);

//     container
//       .append('text')
//       .attr('x', width / 2)
//       .attr('y', 30)
//       .attr('text-anchor', 'middle')
//       .attr('font-size', 16)
//       .attr('font-weight', 'bold')
//       .text('Hierarchical Bundling Diagram');

//     const svg = container
//       .append('g')
//       .attr('transform', `translate(${width / 2}, ${height / 2})`);

//     const tooltip = d3.select(tooltipRef.current).style('opacity', 0);

//     const groupMap = d3.group(graphData.nodes, d => d.group);
//     const rootData = {
//       name: 'root',
//       children: Array.from(groupMap, ([group, nodes]) => ({
//         name: group,
//         children: nodes,
//       })),
//     };

//     const root = d3.hierarchy(rootData);
//     const cluster = d3
//       .cluster<d3.HierarchyNode<any>>()
//       .size([2 * Math.PI, radius]);
//     cluster(root);

//     const line = d3
//       .lineRadial()
//       .curve(d3.curveBundle.beta(0.85))
//       .radius((d: any) => d.y)
//       .angle((d: any) => d.x);

//     const nodeById = new Map();
//     root.leaves().forEach(d => {
//       nodeById.set(d.data.id, d);
//     });

//     const adjacency = new Map<string, string[]>();
//     graphData.edges.forEach(edge => {
//       if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
//       adjacency.get(edge.source)!.push(edge.target);

//       if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
//       adjacency.get(edge.target)!.push(edge.source);
//     });

//     const groupNames = Array.from(groupMap.keys());
//     const groupColor = d3
//       .scaleOrdinal<string>()
//       .domain(groupNames)
//       .range(d3.schemeSet2);

//     const statusColorMap = {
//       approved: 'green',
//       changes_requested: 'red',
//       dismissed: 'gray',
//       commented: '#999',
//     };

//     // edges
//     const edgesSelection = svg
//       .append('g')
//       .attr('class', 'edges')
//       .selectAll('path')
//       .data(graphData.edges)
//       .enter()
//       .append('path')
//       .attr('class', 'link')
//       .attr('fill', 'none')
//       .attr(
//         'stroke',
//         d => statusColorMap[d.status as keyof typeof statusColorMap] || 'black'
//       )
//       .attr('stroke-width', d => Math.max(1, Math.min(d.weight * 2, 4)))
//       .attr('d', d => {
//         const source = nodeById.get(d.source);
//         const target = nodeById.get(d.target);
//         if (!source || !target) return '';

//         const sourceAncestors = source.ancestors().reverse();
//         const targetAncestors = target.ancestors().reverse();

//         let i = 0;
//         while (
//           i < sourceAncestors.length &&
//           i < targetAncestors.length &&
//           sourceAncestors[i] === targetAncestors[i]
//         ) {
//           i++;
//         }
//         const pathNodes = sourceAncestors.concat(
//           targetAncestors.slice(i).reverse()
//         );
//         return line(pathNodes) || '';
//       })
//       .on('mouseover', function (event, d) {
//         d3.select(this).attr('stroke-width', 4);
//         tooltip
//           .style('opacity', 1)
//           .html(
//             `<strong>${d.source} → ${d.target}</strong><br/>
//              ${d.weight} reviews (${d.status})`
//           )
//           .style('left', `${event.offsetX + 10}px`)
//           .style('top', `${event.offsetY + 10}px`);
//       })
//       .on('mousemove', function (event) {
//         tooltip
//           .style('left', `${event.offsetX + 10}px`)
//           .style('top', `${event.offsetY + 10}px`);
//       })
//       .on('mouseout', function () {
//         d3.select(this).attr('stroke-width', d =>
//           Math.max(1, Math.min(d.weight * 2, 4))
//         );
//         tooltip.style('opacity', 0);
//       });

//     // leaf nodes
//     const leaves = root.leaves();
//     svg
//       .append('g')
//       .attr('class', 'nodes')
//       .selectAll('circle')
//       .data(leaves)
//       .enter()
//       .append('circle')
//       .attr(
//         'transform',
//         d => `
//         rotate(${(d.x * 180) / Math.PI - 90})
//         translate(${d.y},0)
//       `
//       )
//       .attr('r', 5)
//       .attr('fill', d => groupColor(d.data.group))
//       .on('mouseover', function (event, d) {
//         const thisId = d.data.id;
//         edgesSelection.attr('stroke', edgeData => {
//           if (edgeData.source === thisId || edgeData.target === thisId) {
//             return 'orange';
//           }
//           return (
//             statusColorMap[edgeData.status as keyof typeof statusColorMap] ||
//             'black'
//           );
//         });

//         tooltip
//           .style('opacity', 1)
//           .html(`<strong>${thisId}</strong> (group: ${d.data.group})`)
//           .style('left', `${event.offsetX + 10}px`)
//           .style('top', `${event.offsetY + 10}px`);
//       })
//       .on('mousemove', function (event) {
//         tooltip
//           .style('left', `${event.offsetX + 10}px`)
//           .style('top', `${event.offsetY + 10}px`);
//       })
//       .on('mouseout', function () {
//         edgesSelection.attr('stroke', edgeData => {
//           return (
//             statusColorMap[edgeData.status as keyof typeof statusColorMap] ||
//             'black'
//           );
//         });
//         tooltip.style('opacity', 0);
//       });

//     // Add labels
//     svg
//       .append('g')
//       .attr('class', 'labels')
//       .selectAll('text')
//       .data(leaves)
//       .enter()
//       .append('text')
//       .attr(
//         'transform',
//         d => `
//         rotate(${(d.x * 180) / Math.PI - 90})
//         translate(${d.y},0)
//         rotate(${d.x >= Math.PI ? 180 : 0})
//       `
//       )
//       .attr('dy', '0.31em')
//       .attr('font-size', 10)
//       .attr('text-anchor', d => (d.x < Math.PI ? 'start' : 'end'))
//       .text(d => d.data.id);

//     // legend
//     const statuses = [
//       'approved',
//       'changes_requested',
//       'dismissed',
//       'commented',
//     ];
//     const legend = svg
//       .append('g')
//       .attr('class', 'legend')
//       .attr('transform', `translate(${-width / 2 + 20}, ${-height / 2 + 60})`);

//     legend
//       .selectAll('rect')
//       .data(statuses)
//       .enter()
//       .append('rect')
//       .attr('x', 0)
//       .attr('y', (_, i) => i * 20)
//       .attr('width', 10)
//       .attr('height', 10)
//       .attr(
//         'fill',
//         d => statusColorMap[d as keyof typeof statusColorMap] || 'black'
//       );

//     legend
//       .selectAll('text')
//       .data(statuses)
//       .enter()
//       .append('text')
//       .attr('x', 15)
//       .attr('y', (_, i) => i * 20 + 9)
//       .attr('font-size', 12)
//       .text(d => d);
//   }, [graphData]);

//   return (
//     <svg
//       ref={svgRef}
//       width="600"
//       height="600"
//       style={{ border: '1px solid #ccc', borderRadius: '8px' }}
//     ></svg>
//   );
// };

// export default PRGraphBundled;
