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
  totalWeight: number; // Added for subgroup evaluation
  significance: number; // Significance score (totalWeight / number of students)
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

// Find optimal k using the elbow method, but strictly limit to maxClusters
const findOptimalKElbow = (
  data: DataPoint[],
  maxK = 8,
  maxClusters = 3
): number => {
  if (data.length < 3) return 1;

  // Strict enforcement: Never return more than maxClusters
  maxK = Math.min(maxK, data.length - 1, maxClusters);

  const wcssValues: number[] = [];

  for (let k = 1; k <= maxK; k++) {
    const clusters = kMeansClustering(data, k);
    const centroids = calculateCentroids(data, clusters, k);
    const wcss = calculateWCSS(data, clusters, centroids);
    wcssValues.push(wcss);
  }

  // Find the "elbow point"
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

  // Force a minimum of at least 2 clusters if data points warrant it
  if (optimalK === 1 && data.length >= 4) {
    // Check if there are meaningful patterns to detect
    const density = data.length / (maxK * 2);
    if (density >= 1) {
      optimalK = Math.min(Math.ceil(data.length / 4), maxClusters);
    }
  }

  // Final check to ensure we never exceed maxClusters
  return Math.min(optimalK, maxClusters);
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

// Identify student subgroups from cell clusters, strictly limited to MAX_SUBGROUPS
const identifyStudentSubgroups = (
  cells: DataPoint[],
  clusters: number[],
  numClusters: number,
  MAX_SUBGROUPS: number = 3
): StudentSubgroup[] => {
  // Group cells by their assigned cluster
  const cellsByCluster: DataPoint[][] = Array.from(
    { length: numClusters },
    () => []
  );

  cells.forEach((cell, i) => {
    if (i < clusters.length) {
      cellsByCluster[clusters[i]].push(cell);
    }
  });

  // For each cluster, identify the distinct students involved
  let subgroups: StudentSubgroup[] = cellsByCluster.map(clusterCells => {
    const students = new Set<number>();
    let totalWeight = 0;

    clusterCells.forEach(cell => {
      students.add(cell.row); // reviewer
      students.add(cell.col); // author
      totalWeight += cell.weight;
    });

    return {
      students,
      cells: clusterCells,
      totalWeight,
      significance: totalWeight / students.size,
    };
  });

  // Filter to keep only reasonable sized groups (2-5 students)
  subgroups = subgroups.filter(
    subgroup => subgroup.students.size >= 2 && subgroup.students.size <= 5
  );

  // Add an additional analysis to catch pairs with significant interaction
  const allPairs = new Map<
    string,
    { weight: number; cells: DataPoint[]; students: Set<number> }
  >();

  cells.forEach(cell => {
    // Only consider cases where the interaction is between different students
    if (cell.row !== cell.col) {
      const pairKey = [
        Math.min(cell.row, cell.col),
        Math.max(cell.row, cell.col),
      ].join('-');

      if (!allPairs.has(pairKey)) {
        allPairs.set(pairKey, {
          weight: 0,
          cells: [],
          students: new Set([cell.row, cell.col]),
        });
      }

      const pair = allPairs.get(pairKey)!;
      pair.weight += cell.weight;
      pair.cells.push(cell);
    }
  });

  // Find pairs with significant interaction weight
  // Convert to array and sort by weight
  const significantPairs = Array.from(allPairs.values())
    .filter(pair => pair.weight >= 3) // Threshold for significant interaction
    .sort((a, b) => b.weight - a.weight);

  // Add these significant pairs to subgroups if they're not already captured
  significantPairs.forEach(pair => {
    // Check if this pair is already covered in an existing subgroup
    const alreadyCovered = subgroups.some(subgroup => {
      // Check if all students in the pair are in this subgroup
      return Array.from(pair.students).every(student =>
        subgroup.students.has(student)
      );
    });

    if (!alreadyCovered) {
      subgroups.push({
        students: pair.students,
        cells: pair.cells,
        totalWeight: pair.weight,
        significance: pair.weight / pair.students.size,
      });
    }
  });

  // STRICT ENFORCEMENT: Sort by significance and only keep top MAX_SUBGROUPS
  subgroups.sort((a, b) => b.significance - a.significance);

  // Strictly limit to MAX_SUBGROUPS
  return subgroups.slice(0, MAX_SUBGROUPS);
};

const PRMatrix: React.FC<PRGraphProps> = ({ graphData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const MAX_SUBGROUPS = 3; // Maximum number of subgroups to display

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
      .text('Heatmap with K-means Clustering (Max 3 Subgroups)');

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
      .attr('x', d => xScale(String(d.col))!)
      .attr('y', d => yScale(String(d.row))!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => (d.weight > 0 ? colorScale(d.weight) : '#eee'))
      .attr('stroke', '#fff')
      .on('mouseover', (event, d) => {
        // Calculate position relative to the heatmap
        const rectX = parseFloat(d3.select(event.currentTarget).attr('x'));
        const rectY = parseFloat(d3.select(event.currentTarget).attr('y'));
        const rectWidth = parseFloat(
          d3.select(event.currentTarget).attr('width')
        );

        // Position tooltip near the cell
        const tooltipX = margin.left + rectX + rectWidth + 5;
        const tooltipY = margin.top + rectY + 10;

        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${topUsers[d.row]} → ${topUsers[d.col]}</strong><br/>Weight: ${d.weight}`
          )
          .style('left', `${tooltipX}px`)
          .style('top', `${tooltipY}px`);
      })
      .on('mousemove', () => {
        // Keep tooltip fixed relative to cell rather than following mouse
        // This prevents the tooltip from moving far to the right
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // X-axis labels (Author)
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

    // Y-axis labels (Reviewer)
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
      .text('PR Author');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -150)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .text('PR Reviewer');

    if (cells.length >= 3) {
      // First identify subgroups using k-means clustering with a strict limit of MAX_SUBGROUPS
      const numClusters = findOptimalKElbow(cells, 8, MAX_SUBGROUPS);
      const clusters = kMeansClustering(cells, numClusters);

      // This function is now strictly limited to MAX_SUBGROUPS
      const studentSubgroups = identifyStudentSubgroups(
        cells,
        clusters,
        numClusters,
        MAX_SUBGROUPS
      );

      // We can use only 3 colors since we're limited to 3 subgroups
      const subgroupColors = d3
        .scaleOrdinal(['red', 'orange', 'green'])
        .domain(['0', '1', '2']);

      // Draw cluster boundaries as squares for each subgroup
      studentSubgroups.forEach((subgroup, subgroupIndex) => {
        if (subgroup.cells.length < 2) return;

        const color = subgroupColors(String(subgroupIndex));
        const students = Array.from(subgroup.students).sort((a, b) => a - b);

        // First, highlight all cells that belong to this subgroup
        svg
          .selectAll('rect.cell')
          .filter(function (this: any, d: any) {
            return subgroup.students.has(d.row) && subgroup.students.has(d.col);
          })
          .attr('stroke', color)
          .attr('stroke-width', 4);

        // Create a label for the group
        const studentsLabel = students.map(idx => topUsers[idx]).join(', ');

        // Find the min and max indices for the square boundary
        const minIndex = Math.min(...students);
        const maxIndex = Math.max(...students);

        // Calculate the positions for the square
        const squareStartX = xScale(String(minIndex)) || 0;
        const squareStartY = yScale(String(maxIndex)) || 0; // Remember, y-scale is inverted
        const squareWidth =
          (xScale(String(maxIndex)) || 0) + xScale.bandwidth() - squareStartX;
        const squareHeight =
          (yScale(String(minIndex)) || 0) + yScale.bandwidth() - squareStartY;

        // Draw the square boundary (as a rectangle)
        svg
          .append('rect')
          .attr('x', squareStartX)
          .attr('y', squareStartY)
          .attr('width', squareWidth)
          .attr('height', squareHeight)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-width', 3);

        // Add group label above the square
        svg
          .append('text')
          .attr('x', squareStartX + squareWidth / 2)
          .attr('y', squareStartY - 10)
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
          transition: 'opacity 0.2s',
        }}
      ></div>
    </div>
  );
};

export default PRMatrix;
