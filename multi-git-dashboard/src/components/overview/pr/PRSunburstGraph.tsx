// import { useEffect, useRef } from 'react';
// import * as d3 from 'd3';

// interface PRNode {
//   id: string;
//   group: string;
//   value?: number;
// }

// interface PREdge {
//   source: string | PRNode;
//   target: string | PRNode;
//   weight: number;
//   status: string;
// }

// interface PRSunburstGraphProps {
//   graphData: {
//     nodes: PRNode[];
//     edges: PREdge[];
//   };
// }

// const PRSunburstGraph: React.FC<PRSunburstGraphProps> = ({ graphData }) => {
//   const svgRef = useRef<SVGSVGElement>(null);
//   const tooltipRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!graphData.nodes.length || !graphData.edges.length) return;

//     const width = 700;
//     const height = 600;
//     const radius = 50000;

//     const svg = d3.select(svgRef.current);
//     svg.selectAll('*').remove();

//     svg
//       .append('text')
//       .attr('x', width / 2)
//       .attr('y', 30)
//       .attr('text-anchor', 'middle')
//       .attr('font-size', '18px')
//       .attr('font-weight', 'bold')
//       .text('Force-Directed Sunburst Diagram');

//     const tooltip = d3.select(tooltipRef.current);
//     const g = svg
//       .append('g')
//       .attr('transform', `translate(${width / 2},${height / 2})`);

//     const colorMap = {
//       approved: '#4caf50',
//       changes_requested: '#f44336',
//       dismissed: '#9e9e9e',
//       commented: '#2196f3',
//     };

//     const personCounts = new Map();
//     graphData.edges.forEach(edge => {
//       const sourceId =
//         typeof edge.source === 'string' ? edge.source : edge.source.id;
//       personCounts.set(
//         sourceId,
//         (personCounts.get(sourceId) || 0) + edge.weight
//       );
//     });

//     const nodesWithValues = graphData.nodes.map(node => ({
//       ...node,
//       value: personCounts.get(node.id) || 1,
//     }));

//     const groupedNodes = d3.group(nodesWithValues, d => d.group);

//     const hierarchicalData = {
//       name: 'root',
//       children: Array.from(groupedNodes, ([key, value]) => ({
//         name: key,
//         children: value.map(node => ({
//           name: node.id,
//           value: node.value,
//           node: node,
//         })),
//       })),
//     };

//     const partition = d3.partition().size([2 * Math.PI, radius]);

//     const root = d3
//       .hierarchy(hierarchicalData)
//       .sum(d => d.value || 0)
//       .sort((a, b) => b.value! - a.value!);

//     partition(root);

//     // arc
//     const arc = d3
//       .arc<d3.HierarchyRectangularNode<any>>()
//       .startAngle(d => d.x0)
//       .endAngle(d => d.x1)
//       .innerRadius(d => Math.sqrt(d.y0))
//       .outerRadius(d => Math.sqrt(d.y1));

//     // Add arcs
//     const paths = g
//       .selectAll('path')
//       .data(root.descendants().slice(1)) // Skip root node
//       .join('path')
//       .attr('fill', d => {
//         if (d.depth === 1)
//           return d3.schemeCategory10[d.data.name.charCodeAt(0) % 10];
//         return d3.interpolateRdYlBu(d.value! / 20); // Use a color scale based on value
//       })
//       .attr('d', arc as any)
//       .attr('opacity', 0.8)
//       .on('mouseover', function (event, d) {
//         d3.select(this).attr('opacity', 1);

//         const name = d.data.name;
//         const value = d.data.value || 0;
//         const groupName = d.depth === 1 ? name : d.parent?.data.name;

//         tooltip
//           .style('opacity', 1)
//           .html(
//             `
//             <strong>${name}</strong><br/>
//             ${d.depth === 1 ? `Group: ${name}` : `Group: ${groupName}<br/>Reviews: ${value}`}
//           `
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
//         d3.select(this).attr('opacity', 0.8);
//         tooltip.style('opacity', 0);
//       });

//     // Add labels
//     g.selectAll('text')
//       .data(
//         root
//           .descendants()
//           .filter(d => ((d.y0 + d.y1) / 2) * Math.PI < 4 && d.depth > 0)
//       )
//       .join('text')
//       .attr('transform', d => {
//         const x = (d.x0 + d.x1) / 2;
//         const y = Math.sqrt((d.y0 + d.y1) / 2);
//         const rotate =
//           x < Math.PI ? (x * 180) / Math.PI - 90 : (x * 180) / Math.PI + 90;
//         return `rotate(${rotate}) translate(${y},0) ${x < Math.PI ? '' : 'rotate(180)'}`;
//       })
//       .attr('dy', '0.35em')
//       .attr('text-anchor', d => ((d.x0 + d.x1) / 2 < Math.PI ? 'start' : 'end'))
//       .attr('font-size', d => (d.depth === 1 ? '12px' : '10px'))
//       .text(d => d.data.name)
//       .attr('pointer-events', 'none');

//     // Create a map to store node positions for connections
//     const nodePositions = new Map();

//     // Calculate positions for each leaf node
//     root.leaves().forEach(node => {
//       if (node.data.name) {
//         const angle = (node.x0 + node.x1) / 2;
//         const radius = Math.sqrt((node.y0 + node.y1) / 2);
//         const x = radius * Math.sin(angle);
//         const y = -radius * Math.cos(angle);
//         nodePositions.set(node.data.name, { x, y });
//       }
//     });

//     const connections = svg
//       .append('g')
//       .attr('transform', `translate(${width / 2},${height / 2})`);

//     const defs = svg.append('defs');

//     defs
//       .selectAll('marker')
//       .data(['approved', 'changes_requested', 'dismissed', 'commented'])
//       .enter()
//       .append('marker')
//       .attr('id', d => `arrow-${d}`)
//       .attr('viewBox', '0 -5 10 10')
//       .attr('refX', 5)
//       .attr('refY', 0)
//       .attr('markerWidth', 4)
//       .attr('markerHeight', 4)
//       .attr('orient', 'auto')
//       .append('path')
//       .attr('d', 'M0,-5L10,0L0,5')
//       .attr('fill', d => colorMap[d as keyof typeof colorMap]);

//     // Create curved connection lines
//     graphData.edges.forEach(edge => {
//       const sourceId =
//         typeof edge.source === 'string' ? edge.source : edge.source.id;
//       const targetId =
//         typeof edge.target === 'string' ? edge.target : edge.target.id;

//       const sourcePos = nodePositions.get(sourceId);
//       const targetPos = nodePositions.get(targetId);

//       if (sourcePos && targetPos) {
//         const dx = targetPos.x - sourcePos.x;
//         const dy = targetPos.y - sourcePos.y;
//         const distance = Math.sqrt(dx * dx + dy * dy);

//         // Only draw lines if there's some distance between nodes
//         if (distance > 10) {
//           const midX = (sourcePos.x + targetPos.x) / 2;
//           const midY = (sourcePos.y + targetPos.y) / 2;

//           const offsetMagnitude = Math.min(30, 10 + edge.weight * 3);
//           const perpX = (-dy / distance) * offsetMagnitude;
//           const perpY = (dx / distance) * offsetMagnitude;

//           const curveX = midX + (edge.status === 'approved' ? perpX : -perpX);
//           const curveY = midY + (edge.status === 'approved' ? perpY : -perpY);

//           connections
//             .append('path')
//             .attr(
//               'd',
//               `M${sourcePos.x},${sourcePos.y} Q${curveX},${curveY} ${targetPos.x},${targetPos.y}`
//             )
//             .attr('fill', 'none')
//             .attr(
//               'stroke',
//               colorMap[edge.status as keyof typeof colorMap] || '#999'
//             )
//             .attr('stroke-width', Math.max(1, Math.min(edge.weight * 0.5, 3)))
//             .attr('opacity', 0.7)
//             .attr('marker-end', `url(#arrow-${edge.status})`)
//             .on('mouseover', function (event) {
//               d3.select(this)
//                 .attr('opacity', 1)
//                 .attr(
//                   'stroke-width',
//                   Math.max(2, Math.min(edge.weight * 0.8, 4))
//                 );

//               tooltip
//                 .style('opacity', 1)
//                 .html(
//                   `
//                   <strong>${sourceId} → ${targetId}</strong><br/>
//                   ${edge.weight} reviews (${edge.status})
//                 `
//                 )
//                 .style('left', `${event.offsetX + 10}px`)
//                 .style('top', `${event.offsetY + 10}px`);
//             })
//             .on('mousemove', function (event) {
//               tooltip
//                 .style('left', `${event.offsetX + 10}px`)
//                 .style('top', `${event.offsetY + 10}px`);
//             })
//             .on('mouseout', function () {
//               d3.select(this)
//                 .attr('opacity', 0.7)
//                 .attr(
//                   'stroke-width',
//                   Math.max(1, Math.min(edge.weight * 0.5, 3))
//                 );
//               tooltip.style('opacity', 0);
//             });
//         }
//       }
//     });

//     // leg
//     const legend = svg
//       .append('g')
//       .attr('transform', `translate(${width - 180}, 70)`);

//     const statuses = [
//       'approved',
//       'changes_requested',
//       'dismissed',
//       'commented',
//     ];

//     statuses.forEach((status, i) => {
//       legend
//         .append('line')
//         .attr('x1', 0)
//         .attr('y1', i * 25)
//         .attr('x2', 30)
//         .attr('y2', i * 25)
//         .attr('stroke', colorMap[status as keyof typeof colorMap])
//         .attr('stroke-width', 3)
//         .attr('marker-end', `url(#arrow-${status})`);

//       legend
//         .append('text')
//         .attr('x', 40)
//         .attr('y', i * 25 + 5)
//         .text(status.replace('_', ' '))
//         .attr('font-size', '12px');
//     });
//   }, [graphData]);

//   return (
//     <div style={{ position: 'relative', width: '700px', height: '600px' }}>
//       <div
//         ref={tooltipRef}
//         style={{
//           position: 'absolute',
//           padding: '8px 12px',
//           backgroundColor: 'rgba(0,0,0,0.75)',
//           color: 'white',
//           fontSize: '12px',
//           borderRadius: '5px',
//           opacity: 0,
//           pointerEvents: 'none',
//           transition: 'opacity 0.3s ease',
//           zIndex: 10,
//         }}
//       ></div>
//       <svg
//         ref={svgRef}
//         width="700"
//         height="600"
//         style={{ border: '1px solid #ccc', borderRadius: '8px' }}
//       ></svg>
//     </div>
//   );
// };

// export default PRSunburstGraph;
