import { capitalize } from '@/lib/utils';
import { Box, Group, MultiSelect, ScrollArea, Text } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/table-of-contents.module.css';
import cx from 'clsx';
import { useState } from 'react';
import { PRProps, Spacing } from './PR';

interface PRListProps {
  team?: PRProps['team'];
  teamPRs: TeamData['teamPRs'];
  selectedPR: number | null;
  onSelectPR: (prId: number) => void;
  spacing: Spacing;
}

interface PRListSelectOptions {
  members: string[];
  status: string[];
}

const PRList: React.FC<PRListProps> = ({
  team,
  teamPRs,
  selectedPR,
  onSelectPR,
  spacing,
}) => {
  const maxHeight = spacing.maxHeight;
  const bottomSpace = spacing.bottomSpace - 2; // -2 to account for padding

  const [selected, setSelected] = useState<PRListSelectOptions>({
    members: [],
    status: [],
  });

  const teamMemberHandles =
    team?.members.map(member => member.gitHandle || member.name) ?? [];

  const options: PRListSelectOptions = {
    members: teamMemberHandles,
    status: ['Open', 'Closed'],
  };

  const isNoneSelected = () =>
    Object.values(selected).every(value => value.length === 0);

  let prsByTeamMembers = teamPRs;
  // Filter only if gitHandles are populated
  if (team?.members.every(member => member.gitHandle !== '')) {
    prsByTeamMembers = teamPRs.filter(pr =>
      teamMemberHandles.includes(pr.user)
    );
  }

  const displayedPRs = prsByTeamMembers.filter(
    pr =>
      isNoneSelected() ||
      selected.members.includes(pr.user) ||
      selected.status.includes(pr.state)
  );

  return (
    <div>
      {team && (
        <Group mb="md">
          <MultiSelect
            checkIconPosition="right"
            placeholder="Filter pull requests"
            clearable
            searchable
            data={Object.entries(options).map(([key, value]) => ({
              group: capitalize(key),
              items: value,
            }))}
            value={[...selected.members, ...selected.status]}
            onChange={value =>
              setSelected({
                members: value.filter(v => options.members.includes(v)),
                status: value.filter(v => options.status.includes(v)),
              })
            }
            style={{ maxWidth: 200 }}
          />
        </Group>
      )}
      <ScrollArea.Autosize
        mih={300}
        mah={`calc(${maxHeight}px - ${bottomSpace - 2}rem)`}
        scrollbars="y"
      >
        {displayedPRs.map(pr => (
          <Box
            component="a"
            onClick={() => onSelectPR(pr.id)}
            key={pr.id}
            className={cx(classes.link, {
              [classes.linkActive]: pr.id === selectedPR,
            })}
            mr={3}
          >
            <Text size="sm">
              <Text span fw={700} color={'green'} inherit>
                {pr.user}
              </Text>{' '}
              - {pr.title}
            </Text>
          </Box>
        ))}
      </ScrollArea.Autosize>
    </div>
  );
};

export default PRList;
