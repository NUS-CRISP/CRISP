import { Box, ScrollArea } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/table-of-contents.module.css';
import cx from 'clsx';

interface PRListProps {
  teamPRs: TeamData['teamPRs'];
  selectedPR: number | null;
  onSelectPR: (prId: number) => void;
  maxHeight: number;
}

const PRList: React.FC<PRListProps> = ({
  teamPRs,
  selectedPR,
  onSelectPR,
  maxHeight,
}) => {
  return (
    <ScrollArea.Autosize mah={maxHeight} scrollbars="y">
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
    </ScrollArea.Autosize>
  );
};

export default PRList;
