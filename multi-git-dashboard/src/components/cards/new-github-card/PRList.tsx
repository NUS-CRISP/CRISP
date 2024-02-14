import { Box, ScrollArea } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/table-of-contents.module.css';
import cx from 'clsx';

interface PRListProps {
  teamPRs: TeamData['teamPRs'];
  selectedPR: number | null;
  onSelectPR: (prId: number) => void;
}

const PRList: React.FC<PRListProps> = ({ teamPRs, selectedPR, onSelectPR }) => {
  return (
    <ScrollArea h={400} scrollbars="y">
      {teamPRs.map(pr => (
        <Box<'a'>
          component="a"
          onClick={() => onSelectPR(pr.id)}
          key={pr.id}
          className={cx(classes.link, {
            [classes.linkActive]: pr.id === selectedPR,
          })}
          mr={3}
        >
          {pr.title}
        </Box>
      ))}
    </ScrollArea>
  );
};

export default PRList;
