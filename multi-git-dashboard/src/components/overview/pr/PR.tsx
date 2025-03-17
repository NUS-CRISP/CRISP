import { OverviewProps } from '@/components/cards/OverviewCard';
import { getTutorialHighlightColor } from '@/lib/utils';
import { Box, Card, Group, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { forwardRef, useEffect, useState, useCallback } from 'react';
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
  dailyDateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  useDailyRange?: boolean;
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

const processPRInteractions = (teamPRs: PRProps['teamData']['teamPRs']): PRGraphData => {
  const nodesSet = new Set<string>();
  const edgesMap: Map<string, PREdge> = new Map();

  teamPRs.forEach((pr) => {
    const prAuthor = pr.user;
    if (!prAuthor) return;

    nodesSet.add(prAuthor);

    pr.reviews.forEach((review) => {
      const reviewer = review.user;
      if (!reviewer || reviewer === prAuthor) return;

      nodesSet.add(reviewer);

      const edgeKey = `${reviewer}->${prAuthor}`;
      if (edgesMap.has(edgeKey)) {
        edgesMap.get(edgeKey)!.weight += 1;
        edgesMap.get(edgeKey)!.status = review.state.toLowerCase();
      } else {
        edgesMap.set(edgeKey, {
          source: reviewer,
          target: prAuthor,
          weight: 1,
          status: review.state.toLowerCase(), // captures "approved", "changes_requested", "dismissed", "commented"
        });
      }
    });
  });

  return {
    nodes: Array.from(nodesSet).map((id) => ({ id })),
    edges: Array.from(edgesMap.values()),
  };
};

const processPRInteractionsDot = (teamPRs: PRProps['teamData']['teamPRs']): PRGraphData => {
  const nodesSet = new Set<string>();
  const edgesArray: PREdge[] = [];

  teamPRs.forEach((pr) => {
    const prAuthor = pr.user;
    if (!prAuthor) return;

    nodesSet.add(prAuthor);
    const reviewsByUser = new Map<string, Map<string, number>>();

    pr.reviews.forEach((review) => {
      const reviewer = review.user;
      if (!reviewer || reviewer === prAuthor) return;

      nodesSet.add(reviewer);

      if (!reviewsByUser.has(reviewer)) {
        reviewsByUser.set(reviewer, new Map<string, number>());
      }

      const statusCounts = reviewsByUser.get(reviewer)!;
      const status = review.state.toLowerCase();

      if (statusCounts.has(status)) {
        statusCounts.set(status, statusCounts.get(status)! + 1);
      } else {
        statusCounts.set(status, 1);
      }
    });

    reviewsByUser.forEach((statusCounts, reviewer) => {
      statusCounts.forEach((count, status) => {
        edgesArray.push({
          source: reviewer,
          target: prAuthor,
          weight: count,
          status: status
        });
      });
    });
  });

  return {
    nodes: Array.from(nodesSet).map((id) => ({ id })),
    edges: edgesArray
  };
};

function filterAndRenameTop6(graphData: PRGraphData): PRGraphData {
  const { nodes, edges } = graphData;
  
  if (nodes.length === 0 || edges.length === 0) {
    return { nodes: [], edges: [] };
  }

  const interactionCountMap: Record<string, number> = {};

  edges.forEach((edge) => {
    interactionCountMap[edge.source] =
      (interactionCountMap[edge.source] || 0) + edge.weight;
    interactionCountMap[edge.target] =
      (interactionCountMap[edge.target] || 0) + edge.weight;
  });

  const sortedNodes = [...nodes].sort((a, b) => {
    const aCount = interactionCountMap[a.id] || 0;
    const bCount = interactionCountMap[b.id] || 0;
    return bCount - aCount; // descending
  });

  const top6 = sortedNodes.slice(0, 6);
  const top6Ids = new Set(top6.map((n) => n.id));

  const filteredEdges = edges.filter(
    (edge) => top6Ids.has(edge.source) && top6Ids.has(edge.target)
  );

  const renameMap: Record<string, string> = {};
  top6.forEach((node, i) => {
    renameMap[node.id] = `Student ${i + 1}`;
  });

  const renamedNodes = top6.map((node) => ({
    id: renameMap[node.id],
  }));

  const renamedEdges = filteredEdges.map((edge) => ({
    ...edge,
    source: renameMap[edge.source],
    target: renameMap[edge.target],
  }));

  return {
    nodes: sortedNodes, // renamedNodes, for anoynmized version
    edges: filteredEdges, // renamedEdges, for
  };
}

const PR = forwardRef<HTMLDivElement, PRProps>(
  ({ team, teamData, selectedWeekRange, dateUtils, profileGetter, dailyDateRange, useDailyRange = false }, ref) => {
    const SPACING: Spacing = {
      maxHeight: 500,
      bottomSpace: 7,
    };

    const { weekToDate, getEndOfWeek } = dateUtils;

    const [selectedPR, setSelectedPR] = useState<number | null>(
      teamData.teamPRs[0]?.id ?? null
    );

    // graph data for node-edge graph
    const [graphData, setGraphData] = useState<PRGraphData>({ nodes: [], edges: [] });
    // graph data for dot matrix chart
    const [graphDataDot, setGraphDataDot] = useState<PRGraphData>({ nodes: [], edges: [] });
  
    const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);

    const getDisplayedPRs = useCallback(() => {
      let startDate, endDate;
      
      if (useDailyRange && dailyDateRange) {
        // Use the daily date range 
        startDate = dailyDateRange[0];
        endDate = dailyDateRange[1];
      } else {
        // Fall back to weekly date range
        startDate = weekToDate(selectedWeekRange[0]);
        endDate = getEndOfWeek(weekToDate(selectedWeekRange[1]));
      }

      return teamData.teamPRs.filter((pr) => {
        const prDate = dayjs(pr.createdAt);
        return prDate.isAfter(startDate) && prDate.isBefore(endDate);
      });
    }, [teamData.teamPRs, selectedWeekRange, dailyDateRange, useDailyRange, weekToDate, getEndOfWeek]);

    const getTimeRangeLabel = useCallback(() => {
      if (useDailyRange && dailyDateRange) {
        return `${dailyDateRange[0].format('MMM D')} - ${dailyDateRange[1].format('MMM D, YYYY')}`;
      } else {
        return `Weeks ${selectedWeekRange[0] + 1} - ${selectedWeekRange[1] + 1}`;
      }
    }, [selectedWeekRange, dailyDateRange, useDailyRange]);

    useEffect(() => {
      console.log("Date range changed, refreshing data");

      const filteredPRs = getDisplayedPRs();

      const rawGraphData = processPRInteractions(filteredPRs);
      const rawGraphDataDot = processPRInteractionsDot(filteredPRs);

      const top6GraphData = filterAndRenameTop6(rawGraphData);
      const top6GraphDataDot = filterAndRenameTop6(rawGraphDataDot);

      setGraphData(top6GraphData);
      setGraphDataDot(top6GraphDataDot);
      
      
      setDataRefreshKey(prev => prev + 1);
    }, [teamData.teamPRs, selectedWeekRange, dailyDateRange, useDailyRange, getDisplayedPRs]);

    return (
      <Card ref={ref} bg={getTutorialHighlightColor(9)}>
        {/* <Group grow align="start">
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
        </Group> */}

        {/* PR Visualization Graph */}
        <Box mt={20}>
          <Text fw={500} size="lg">
            PR Review Interaction Graph ({getTimeRangeLabel()})
          </Text>

          {/* <PRArcDiagram key={`arc-${dataRefreshKey}`} graphData={graphData} /> */}

          {/* <PRChordDiagram key={`chord-${dataRefreshKey}`} graphData={graphData} /> */}

          {/* <PRDotMatrixChart key={`dot-${dataRefreshKey}`} graphData={graphDataDot} /> */}

          {/* <PRMatrix key={`matrix-${dataRefreshKey}`} graphData={graphData} /> */}

          <PRNetwork key={`network-${dataRefreshKey}`} graphData={graphData} />

          {/* <PRStatusChart key={`status-${dataRefreshKey}`} graphData={graphData} /> */}



          
          {/* Graph that don't work */}
          {/* 
          <PRHivePlot graphData={graphData} />
          <PRGraphBundled graphData={graphDataBundled} />
          <PRSunburstGraph graphData={graphDataBundled} /> 
          <PRMatrixStatusColor graphData={graphData} />
          */}
        </Box>
      </Card>
    );
  }
);

export default PR;