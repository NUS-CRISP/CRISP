import { OverviewProps } from '@/components/cards/OverviewCard';
import { getTutorialHighlightColor } from '@/lib/utils';
import { Box, Card, Group, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { forwardRef, useEffect, useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';
import PRNetwork from './PRNetwork';
import PRChordDiagram from './PRChordDiagram';
import PRMatrix from './PRMatrix';
import PRMatrixStatusColor from './PRMatrixStatusColor';
import PRHivePlot from './PRHivePlot';
import PRGraphBundled from './PRGraphBundled';
import PRDotMatrixChart from './PRDotMatrixChart';
import PRStatusChart from './PRStatusChart';
import PRArcDiagram from './PRArcDiagram';
import PRSunburstGraph from './PRSunburstGraph';

export interface Spacing {
  maxHeight: number;
  bottomSpace: number;
}

export interface PRProps {
  team?: OverviewProps['team'];
  teamData: OverviewProps['teamData'];
  selectedWeekRange: [number, number];
  dateUtils: OverviewProps['dateUtils'];
  profileGetter: OverviewProps['profileGetter'];
}

interface PRNode {
  id: string;
}

interface PRNodeBundled extends PRNode {
  group: string;
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

interface PRGraphDataBundled {
  nodes: PRNodeBundled[];
  edges: PREdge[];
}

// Process PR data to generate node-edge graph data
const processPRInteractions = (teamPRs: PRProps['teamData']['teamPRs']): PRGraphData => {
  const nodesSet = new Set<string>();
  const edgesMap: Map<string, PREdge> = new Map();

  teamPRs.forEach((pr) => {
    const prAuthor = pr.user;
    if (!prAuthor) return;

    nodesSet.add(prAuthor);

    pr.reviews.forEach((review) => {
      const reviewer = review.user;
      if (!reviewer || reviewer === prAuthor) return; // Ignore self-reviews

      nodesSet.add(reviewer);

      const edgeKey = `${reviewer}->${prAuthor}`;
      if (edgesMap.has(edgeKey)) {
        edgesMap.get(edgeKey)!.weight += 1;
        // Overwrite the status with the latest review state
        edgesMap.get(edgeKey)!.status = review.state.toLowerCase();
      } else {
        edgesMap.set(edgeKey, {
          source: reviewer,
          target: prAuthor,
          weight: 1,
          status: review.state.toLowerCase(), // Captures "approved", "changes_requested", "dismissed", "commented"
        });
      }
    });
  });

  return {
    nodes: Array.from(nodesSet).map((id) => ({ id })),
    edges: Array.from(edgesMap.values()),
  };
};

// New function for bundled graph that assigns a group to each node
// Here I assume a default group if no group info is available
const processPRInteractionsBundled = (
  teamPRs: PRProps['teamData']['teamPRs']
): PRGraphDataBundled => {
  const nodesMap = new Map<string, PRNodeBundled>();
  const edgesMap: Map<string, PREdge> = new Map();

  teamPRs.forEach((pr) => {
    const prAuthor = pr.user;
    if (!prAuthor) return;

    // Use actual group info if available; otherwise, assign "default"
    const authorGroup = pr.authorGroup || "default";
    nodesMap.set(prAuthor, { id: prAuthor, group: authorGroup });

    pr.reviews.forEach((review) => {
      const reviewer = review.user;
      if (!reviewer || reviewer === prAuthor) return;
      const reviewerGroup = review.reviewerGroup || "default";
      nodesMap.set(reviewer, { id: reviewer, group: reviewerGroup });

      const edgeKey = `${reviewer}->${prAuthor}`;
      if (edgesMap.has(edgeKey)) {
        const existingEdge = edgesMap.get(edgeKey)!;
        existingEdge.weight += 1;
        existingEdge.status = review.state.toLowerCase();
      } else {
        edgesMap.set(edgeKey, {
          source: reviewer,
          target: prAuthor,
          weight: 1,
          status: review.state.toLowerCase(),
        });
      }
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
};

// Test data
const testData = {
  nodes: [{ id: "Alice" }, { id: "Bob" }],
  edges: [
    { source: "Alice", target: "Bob", weight: 3, status: "approved" },
  ],
};

const PR = forwardRef<HTMLDivElement, PRProps>(
  ({ team, teamData, selectedWeekRange, dateUtils, profileGetter }, ref) => {
    const SPACING: Spacing = {
      maxHeight: 500,
      bottomSpace: 7,
    };

    const { weekToDate, getEndOfWeek } = dateUtils;

    const [selectedPR, setSelectedPR] = useState<number | null>(
      teamData.teamPRs[0]?.id ?? null
    );

    const getDisplayedPRs = () => {
      const startDate = weekToDate(selectedWeekRange[0]);
      const endDate = getEndOfWeek(weekToDate(selectedWeekRange[1]));

      return teamData.teamPRs.filter((pr) => {
        const prDate = dayjs(pr.createdAt);
        return prDate.isAfter(startDate) && prDate.isBefore(endDate);
      });
    };

    // graph data for node-edge graph
    const [graphData, setGraphData] = useState<PRGraphData>({ nodes: [], edges: [] });
    // graph data for bundled graph (with grouping)
    const [graphDataBundled, setGraphDataBundled] = useState<PRGraphDataBundled>({
      nodes: [],
      edges: [],
    });

    useEffect(() => {
      setGraphData(processPRInteractions(teamData.teamPRs));
      setGraphDataBundled(processPRInteractionsBundled(teamData.teamPRs));
    }, [teamData.teamPRs]);

    return (
      <Card ref={ref} bg={getTutorialHighlightColor(9)}>
        <Group grow align="start">
          <Box style={{ maxWidth: 200, marginRight: 15 }}>
            <PRList
              team={team}
              teamPRs={getDisplayedPRs()}
              selectedPR={selectedPR}
              onSelectPR={setSelectedPR}
              spacing={SPACING}
            />
          </Box>
          {selectedPR !== null && (
            <Box maw={700} mt={10} mr={10}>
              <PRDetails
                pr={teamData.teamPRs.find((pr) => pr.id === selectedPR)}
                spacing={SPACING}
                profileGetter={profileGetter}
              />
            </Box>
          )}
        </Group>

        {/* PR Visualization Graph */}
        <Box mt={20}>
          <Text fw={500} size="lg">
            PR Review Interaction Graph
          </Text>

          <PRArcDiagram graphData={graphData} />

          <PRChordDiagram graphData={graphData} />

          <PRDotMatrixChart graphData={graphData} />

          <PRGraphBundled graphData={graphDataBundled} />

          <PRMatrix graphData={graphData} />

          <PRMatrixStatusColor graphData={graphData} />

          <PRNetwork graphData={graphData} />

          <PRSunburstGraph graphData={graphDataBundled} />

          {/* <PRStatusChart graphData={graphData} /> */}



          Not for concern
          hive plot

          {/* <PRHivePlot graphData={graphData} /> */}





        </Box>
      </Card>
    );
  }
);

export default PR;
