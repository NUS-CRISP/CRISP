import { BarChart } from '@mantine/charts';
import { Box, Text } from '@mantine/core';

interface PRStatusChartProps {
  graphData: {
    nodes: { id: string }[];
    edges: { source: string; target: string; weight: number; status: string }[];
  };
}

const PRStatusChart: React.FC<PRStatusChartProps> = ({ graphData }) => {
  console.log("Graph Data Edges:", graphData.edges);

  const statusCounts = new Map<string, number>();

  graphData.edges.forEach(({ status, weight }) => {
    const normalizedStatus = status.toLowerCase(); // Normalize case
    statusCounts.set(normalizedStatus, (statusCounts.get(normalizedStatus) || 0) + weight);
  });

  const data = [
    Object.fromEntries(
      Array.from(statusCounts.entries()).map(([status, count]) => [
        status.charAt(0).toUpperCase() + status.slice(1), 
        count,
      ])
    ),
  ];

  console.log("Chart Data:", data); 
  
  return (
    <Box mt={20}>
      <Text fw={500} size="lg">
        PR Review Status Distribution
      </Text>
      <BarChart
        h={300}
        data={data}
        dataKey="status"
        series={Object.keys(data[0]).map((status) => ({
          name: status,
          color: status === 'Approved' ? 'green.6' 
                : status === 'Dismissed' ? 'gray.6' 
                : status === 'Commented' ? 'blue.6' 
                : 'red.6',
        }))}
        tickLine="none"
      />
    </Box>
  );
};

export default PRStatusChart;
