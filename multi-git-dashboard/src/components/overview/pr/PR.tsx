import { OverviewProps } from '@/components/cards/OverviewCard';
import { getTutorialHighlightColor } from '@/lib/utils';
import { Box, Card, Group, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { forwardRef, useEffect, useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';
import PRGraph from './PRGraph';

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
  id: string; // Reviewer or PR author
}

interface PREdge {
  source: string;
  target: string;
  weight: number; // Represents number of interactions
}

interface PRGraphData {
  nodes: PRNode[];
  edges: PREdge[];
}

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

    /** Process PR interactions into nodes and edges for visualization */
    const processPRInteractions = (teamPRs: PRProps['teamData']['teamPRs']): PRGraphData => {
      const nodesSet = new Set<string>();
      const edgesMap: Map<string, PREdge> = new Map();

      teamPRs.forEach((pr) => {
        pr.reviews.forEach((review) => {
          if (review.user && pr.user) {
            nodesSet.add(review.user);
            nodesSet.add(pr.user);

            const edgeKey = `${review.user}->${pr.user}`;
            if (edgesMap.has(edgeKey)) {
              edgesMap.get(edgeKey)!.weight += 1;
            } else {
              edgesMap.set(edgeKey, { source: review.user, target: pr.user, weight: 1 });
            }
          }
        });
      });

      return {
        nodes: Array.from(nodesSet).map((id) => ({ id })),
        edges: Array.from(edgesMap.values()),
      };
    };

    // State to store graph data
    const [graphData, setGraphData] = useState<PRGraphData>({ nodes: [], edges: [] });

    useEffect(() => {
      setGraphData(processPRInteractions(teamData.teamPRs));
    }, [teamData.teamPRs]);

    return (
      <Card mah={SPACING.maxHeight} ref={ref} bg={getTutorialHighlightColor(9)}>
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
          <PRGraph graphData={graphData} />
        </Box>
      </Card>
    );
  }
);

export default PR;
