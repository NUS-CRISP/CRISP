import { Chip, Group, Box } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';

interface PRNode {
  id: string;
}

interface PREdge {
  source: string;
  target: string;
  status: string; // "approved" or "dismissed"
}

interface PRGraphProps {
  graphData: {
    nodes: PRNode[];
    edges: PREdge[];
  };
}

const PRGraph: React.FC<PRGraphProps> = ({ graphData }) => {
  const colorMap: { [key: string]: string } = {
    approved: 'green',
    dismissed: 'gray',
  };

  return (
    <Box mt="lg" style={{ textAlign: 'center' }}>
      {/* Render Unique Chips */}
      <Group>
        {graphData.nodes.map((node) => (
          <Chip key={node.id} variant="filled">
            {node.id}
          </Chip>
        ))}
      </Group>

      {/* Arrows for Interactions */}
      <Box mt="sm">
        {graphData.edges.map((edge, index) => (
          <Group key={index} >
            <Chip variant="filled" color="blue">
              {edge.source}
            </Chip>
            <IconArrowRight size={24} color={colorMap[edge.status]} />
            <Chip variant="filled" color="blue">
              {edge.target}
            </Chip>
          </Group>
        ))}
      </Box>
    </Box>
  );
};

export default PRGraph;
