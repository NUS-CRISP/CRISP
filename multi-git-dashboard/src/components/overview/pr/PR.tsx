import { OverviewProps } from '@/components/cards/OverviewCard';
import { getTutorialHighlightColor } from '@/lib/utils';
import { Box, Card, Group } from '@mantine/core';
import dayjs from 'dayjs';
import { forwardRef, useState } from 'react';
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

      return teamData.teamPRs.filter(pr => {
        const prDate = dayjs(pr.createdAt);
        return prDate.isAfter(startDate) && prDate.isBefore(endDate);
      });
    };

    // const processPRInteractions = (teamPRs) => {
    //   const nodes = new Set();
    //   const edges = [];

    //   teamPRs.forEach((pr) => {
    //     pr.reviews.forEach((review) => {
    //       if (review.user && pr.user) {
    //         nodes.add(review.user);
    //         nodes.add(pr.user);

    //         edges.push({
    //           source: review.user,
    //           target: pr.user,
    //           weight: 1, // Start with weight 1, increase if multiple reviews exist
    //         });
    //       }
    //     });
    //   });

    //   return { nodes: Array.from(nodes), edges };
    // };

    // State to store graph data
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });

    // useEffect(() => {
    //   setGraphData(processPRInteractions(teamData.teamPRs));
    // }, [teamData.teamPRs])

    return (
      <Card mah={SPACING.maxHeight} ref={ref} bg={getTutorialHighlightColor(9)}>
        <Group grow align="start">
          <Box
            style={{
              maxWidth: 200,
              marginRight: 15,
            }}
          >
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
                pr={teamData.teamPRs.find(pr => pr.id === selectedPR)}
                spacing={SPACING}
                profileGetter={profileGetter}
              />
            </Box>
          )}
        </Group>

        {/* <Box mt={20}>
          <Text fw={500} size="lg">PR Review Interaction Graph</Text>
          <PRGraph graphData={graphData} />
        </Box> */}

      </Card>
    );
  }
);

export default PR;
