import { OverviewProps } from '@/components/cards/OverviewCard';
import { getTutorialHighlightColor } from '@/lib/utils';
import { Box, Card, Group, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { forwardRef, useEffect, useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';
import PRGraph from './PRGraph';
import PRChordDiagram from './PRChordDiagram';
import PRMatrix from './PRMatrix';
import PRManGraph from './PRMantineGraph';
import PRStatusChart from './PRStatusChart'; 

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
  weight: number;
  status: string;
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
            edgesMap.get(edgeKey)!.weight += 1; // Increase weight if reviewed multiple times
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
    

    // graph data 
    const [graphData, setGraphData] = useState<PRGraphData>({ nodes: [], edges: [] });

    useEffect(() => {
      setGraphData(processPRInteractions(teamData.teamPRs));
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
        <Box mt={20} >
          <Text fw={500} size="lg">
            PR Review Interaction Graph
          </Text>
          <PRGraph graphData={graphData} />

          <PRChordDiagram graphData={graphData} />
          
          {/* <PRStatusChart graphData={graphData} /> */}

          {/* <PRManGraph graphData={graphData} /> */}
        </Box>
      </Card>
    );
  }
);

export default PR;
