import { DateUtils } from '@/lib/utils';
import { RangeSlider, Stack, Modal, TextInput, Button } from '@mantine/core';
import { useState } from 'react';
import Analytics from '../overview/analytics/Analytics';
import TutorialPopover from '../tutorial/TutorialPopover';
import { ProfileGetter, Team } from '../views/Overview';
import { TeamData } from '@shared/types/TeamData';

export interface OverviewProps {
  index: number;
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  dateUtils: DateUtils;
  profileGetter: ProfileGetter;
}

export const OverviewCard: React.FC<OverviewProps> = ({
  index,
  team,
  teamData,
  teamDatas,
  dateUtils,
}) => {
  const totalWeeks = 15;
  const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([
    0,
    totalWeeks - 1,
  ]);

  const [weekAliases, setWeekAliases] = useState<string[]>(
    Array(totalWeeks).fill('')
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const marks = Array.from({ length: totalWeeks }, (_, i) => ({
    value: i,
    label: weekAliases[i] || `W${i + 1}`,
  }));

  const openAliasModal = (weekIndex: number) => {
    setEditingWeek(weekIndex);
    setAliasInput(weekAliases[weekIndex] || '');
    setIsModalOpen(true);
  };

  const saveAlias = () => {
    if (editingWeek !== null) {
      setWeekAliases(prev => {
        const newAliases = [...prev];
        newAliases[editingWeek] = aliasInput;
        return newAliases;
      });
      setIsModalOpen(false);
      setEditingWeek(null);
      setAliasInput('');
    }
  };

  const handleSliderDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const slider = event.currentTarget.getBoundingClientRect();
    const clickPosition = event.clientX - slider.left;
    const weekValue = Math.round(
      (clickPosition / slider.width) * (totalWeeks - 1)
    );
    openAliasModal(weekValue);
  };

  return (
    <Stack>
      <TutorialPopover stage={9} position='top' offset={30} disabled={index !== 0}>
        <RangeSlider
          value={selectedWeekRange}
          max={totalWeeks - 1}
          minRange={1}
          onChange={setSelectedWeekRange}
          label={value => weekAliases[value] || `Week ${value + 1}`}
          marks={marks}
          mx={20}
          mb={30}
          onDoubleClick={handleSliderDoubleClick} // Use function to handle double-click
        />
      </TutorialPopover>
      <TutorialPopover stage={8} position="left" disabled={index !== 0}>
        <Analytics
          team={team}
          teamData={teamData}
          teamDatas={teamDatas}
          selectedWeekRange={selectedWeekRange}
          dateUtils={dateUtils}
        />
      </TutorialPopover>

      {/* Modal for alias input */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Set alias name for ${editingWeek !== null ? `Week ${editingWeek + 1}` : ''}`}
      >
        <TextInput
          value={aliasInput}
          onChange={e => setAliasInput(e.currentTarget.value)}
          placeholder="Enter week alias"
        />
        <Button onClick={saveAlias} mt="md">
          Save
        </Button>
      </Modal>
    </Stack>
  );
};

export default OverviewCard;
