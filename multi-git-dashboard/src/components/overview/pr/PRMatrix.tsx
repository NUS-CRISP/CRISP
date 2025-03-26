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

interface PRGraphProps {
  graphData: {
    nodes: PRNode[];
    edges: PREdge[];
  };
}

// Interface for data point structure
interface DataPoint {
  row: number;
  col: number;
  weight: number;
}

interface Centroid {
  row: number;
  col: number;
  weight: number;
}
interface StudentSubgroup {
  students: Set<number>;
  cells: DataPoint[];
}

const calculateDistance = (point1: DataPoint, point2: DataPoint): number => {
  return Math.sqrt(
    Math.pow(point1.row - point2.row, 2) +
    Math.pow(point1.col - point2.col, 2) +
    Math.pow((point1.weight - point2.weight) / 10, 2)
  );
};

const calculateWCSS = (
  data: DataPoint[],
  clusters: number[],
  centroids: Centroid[]
): number => {
  let wcss = 0;
  for (let i = 0; i < data.length; i++) {
    const centroidIndex = clusters[i];
    const centroid = centroids[centroidIndex];
    const dist = calculateDistance(data[i], centroid);
    wcss += dist * dist;
  }
  return wcss;
};

const calculateCentroids = (
  data: DataPoint[],
  clusters: number[],
  k: number
): Centroid[] => {
  const centroids = Array.from({ length: k }, () => ({
    row: 0,
    col: 0,
    weight: 0,
  }));
  const counts = new Array(k).fill(0);

  for (let i = 0; i < data.length; i++) {
    const cluster = clusters[i];
    counts[cluster]++;
    centroids[cluster].row += data[i].row;
    centroids[cluster].col += data[i].col;
    centroids[cluster].weight += data[i].weight;
  }

  for (let i = 0; i < k; i++) {
    if (counts[i] > 0) {
      centroids[i].row /= counts[i];
      centroids[i].col /= counts[i];
      centroids[i].weight /= counts[i];
    }
  }

  return centroids;
};

// Find optimal k using the elbow method
const findOptimalKElbow = (data: DataPoint[], maxK = 6): number => {
  if (data.length < 3) return 1;

  const wcssValues: number[] = [];
  maxK = Math.min(maxK, data.length - 1);

  for (let k = 1; k <= maxK; k++) {
    const clusters = kMeansClustering(data, k);
    const centroids = calculateCentroids(data, clusters, k);
    const wcss = calculateWCSS(data, clusters, centroids);
    wcssValues.push(wcss);
  }

  // Find the "elbow point" - where adding more clusters gives diminishing returns
  let maxCurvature = 0;
  let optimalK = 1;

  for (let k = 1; k < wcssValues.length - 1; k++) {
    const prev = wcssValues[k - 1];
    const curr = wcssValues[k];
    const next = wcssValues[k + 1];
    const curvature = Math.abs(curr - prev - (next - curr));

    if (curvature > maxCurvature) {
      maxCurvature = curvature;
      optimalK = k + 1;
    }
  }

  return optimalK;
};

// k-means clustering
const kMeansClustering = (
  data: DataPoint[],
  k: number,
  maxIterations: number = 500
): number[] => {
  if (data.length === 0 || k <= 0 || k > data.length) {
    return [];
  }

  const centroids: Centroid[] = [];
  const usedIndices = new Set<number>();

  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * data.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      centroids.push({ ...data[idx] });
    }
  }

  const clusters: number[] = new Array(data.length).fill(0);
  let iterations = 0;
  let changed = true;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let newCluster = 0;

      for (let j = 0; j < k; j++) {
        const dist = calculateDistance(data[i], centroids[j]);

        if (dist < minDist) {
          minDist = dist;
          newCluster = j;
        }
      }

      if (clusters[i] !== newCluster) {
        clusters[i] = newCluster;
        changed = true;
      }
    }

    const counts = new Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => ({
      row: 0,
      col: 0,
      weight: 0,
    }));

    for (let i = 0; i < data.length; i++) {
      const cluster = clusters[i];
      counts[cluster]++;
      newCentroids[cluster].row += data[i].row;
      newCentroids[cluster].col += data[i].col;
      newCentroids[cluster].weight += data[i].weight;
    }

    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        newCentroids[i].row /= counts[i];
        newCentroids[i].col /= counts[i];
        newCentroids[i].weight /= counts[i];
        centroids[i] = newCentroids[i];
      }
    }
  }

  return clusters;
};

// identify student subgroups from cell clusters
const identifyStudentSubgroups = (
  cells: DataPoint[],
  clusters: number[],
  numClusters: number
): StudentSubgroup[] => {
 
  const cellsByCluster: DataPoint[][] = Array.from({ length: numClusters }, () => []);
  
  cells.forEach((cell, i) => {
    if (i < clusters.length) {
      cellsByCluster[clusters[i]].push(cell);
    }
  });

  // For each cluster, identify the distinct students involved
  const subgroups: StudentSubgroup[] = cellsByCluster.map(clusterCells => {
    const students = new Set<number>();
    
    clusterCells.forEach(cell => {
      students.add(cell.row); // reviewer
      students.add(cell.col); // author
    });
    
    return {
      students,
      cells: clusterCells
    };
  });

  return subgroups.filter(subgroup => 
    subgroup.students.size >= 2 && subgroup.students.size <= 5
  );
};

const cellBelongsToSubgroup = (
  cell: DataPoint,
  subgroup: StudentSubgroup
): boolean => {
  return subgroup.students.has(cell.row) && subgroup.students.has(cell.col);
};

const PRMatrix: React.FC<PRGraphProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    const userInteractions = new Map<string, number>();

    graphData.nodes.forEach(node => {
      userInteractions.set(node.id, 0);
    });

    graphData.edges.forEach(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;

      userInteractions.set(
        sourceId,
        (userInteractions.get(sourceId) || 0) + edge.weight
      );

      userInteractions.set(
        targetId,
        (userInteractions.get(targetId) || 0) + edge.weight
      );
    });

    const topUsers = [...userInteractions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);

    const filteredNodes = graphData.nodes.filter(node =>
      topUsers.includes(node.id)
    );

    const filteredEdges = graphData.edges.filter(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;

      return topUsers.includes(sourceId) && topUsers.includes(targetId);
    });

    const margin = { top: 90, right: 100, bottom: 150, left: 170 },
      width = 600 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const rootSvg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    rootSvg
      .append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Heatmap with K-means Clustering');

    const svg = rootSvg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);

    const n = filteredNodes.length;

    // Create a mapping of users to indices
    const userToIndexMap = new Map<string, number>();
    topUsers.forEach((userId, index) => {
      userToIndexMap.set(userId, index);
    });

    // Map node IDs to their indices in the sorted order
    const indexById = new Map<string, number>();
    filteredNodes.forEach(node => {
      indexById.set(node.id, userToIndexMap.get(node.id) || 0);
    });

    // Create matrix based on the sorted order
    const matrix: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0)
    );

    filteredEdges.forEach(edge => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;

      // Get indices based on sorted order
      const sourceIndex = indexById.get(sourceId);
      const targetIndex = indexById.get(targetId);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        // In this matrix, row = reviewer (source), column = author (target)
        matrix[sourceIndex][targetIndex] += edge.weight;
      }
    });

    // Extract non-zero cells
    const cells: DataPoint[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] > 0) {
          cells.push({ row: i, col: j, weight: matrix[i][j] });
        }
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
      .range([height, 0])
      .padding(0.05);

    const maxWeight = d3.max(cells, d => d.weight) || 1;
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxWeight]);

    svg
      .selectAll('rect.cell')
      .data(cells)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(String(d.row))!) // Use row (reviewer) for x-axis
      .attr('y', d => yScale(String(d.col))!) // Use col (author) for y-axis
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => (d.weight > 0 ? colorScale(d.weight) : '#eee'))
      .attr('stroke', '#fff')
      .on('mouseover', (event, d) => {
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${topUsers[d.row]} → ${topUsers[d.col]}</strong><br/>Weight: ${d.weight}`
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

    // X-axis labels (Reviewer)
    svg
      .selectAll('.colLabel')
      .data(topUsers)
      .enter()
      .append('text')
      .attr('class', 'colLabel')
      .attr('x', (_, i) => (xScale(String(i)) || 0) + xScale.bandwidth() / 2)
      .attr('y', height + 20)
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .attr('transform', (_, i) => {
        const x = (xScale(String(i)) || 0) + xScale.bandwidth() / 2;
        const y = height + 20;
        return `rotate(-45, ${x}, ${y})`;
      })
      .text(d => d);

    // Y-axis labels (PR Author)
    svg
      .selectAll('.rowLabel')
      .data(topUsers)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', (_, i) => (yScale(String(i)) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .text(d => d);

    svg
      .append('text')
      .attr('transform', `translate(${width / 2}, ${height + 140})`)
      .style('text-anchor', 'middle')
      .text('PR Reviewer');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -150)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .text('PR Author');

    if (cells.length >= 3) {
      const numClusters = findOptimalKElbow(cells);
      const clusters = kMeansClustering(cells, numClusters);
      
      const studentSubgroups = identifyStudentSubgroups(cells, clusters, numClusters);
      
      const subgroupColors = d3.scaleOrdinal(["red", "orange", ...d3.schemeCategory10.slice(2)]).domain(studentSubgroups.map((_, i) => String(i)));
      
      studentSubgroups.forEach((subgroup, subgroupIndex) => {
        if (subgroup.cells.length < 2) return;
        
        const color = subgroupColors(String(subgroupIndex));
        

        svg.selectAll('rect.cell')
          .filter((d: any) => cellBelongsToSubgroup(d, subgroup))
          .attr('stroke', color)
          .attr('stroke-width', 2);
        
        const students = Array.from(subgroup.students);
        
        const hullPoints: [number, number][] = [];
        
        students.forEach(student => {
          const x = (xScale(String(student)) || 0) + xScale.bandwidth() / 2;
          const yTop = height + 50; 
          hullPoints.push([x, yTop]);
          
          const y = (yScale(String(student)) || 0) + yScale.bandwidth() / 2;
          const xLeft = -50; 

          hullPoints.push([xLeft, y]);

        });
        
        const studentsLabel = Array.from(subgroup.students)
          .map(idx => topUsers[idx])
          .sort()
          .join(", ");
        
        const cellPositions = subgroup.cells.map(cell => ({
          x: (xScale(String(cell.row)) || 0) + xScale.bandwidth() / 2,
          y: (yScale(String(cell.col)) || 0) + yScale.bandwidth() / 2
        }));
        
        const centerX = d3.mean(cellPositions, d => d.x) || 0;
        const centerY = d3.mean(cellPositions, d => d.y) || 0;
        
        const maxDistanceX = Math.max(
          ...cellPositions.map(pos => Math.abs(pos.x - centerX))
        );
        const maxDistanceY = Math.max(
          ...cellPositions.map(pos => Math.abs(pos.y - centerY))
        );
        
        const rxPadding = xScale.bandwidth() * 0.6;
        const ryPadding = yScale.bandwidth() * 0.6;
        
        svg
          .append('ellipse')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('rx', maxDistanceX + rxPadding)
          .attr('ry', maxDistanceY + ryPadding)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-width', 2);
        
        // group label
        svg
          .append('text')
          .attr('x', centerX)
          .attr('y', centerY - maxDistanceY - ryPadding - 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', color)
          .text(`Group ${subgroupIndex + 1}: ${studentsLabel}`);

      });
    }
  }, [graphData]);

  return (
    <div>
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
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          fontSize: '12px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          transition: 'opacity 0.2s'
        }}
      ></div>
    </div>
  );
};

export default PRMatrix;