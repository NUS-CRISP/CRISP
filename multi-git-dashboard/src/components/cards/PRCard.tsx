import { DateUtils } from '@/lib/utils';
import { RangeSlider, Stack, Modal, TextInput, Button, Box, Group, Space } from '@mantine/core';
import { useState } from 'react';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import TutorialPopover from '../tutorial/TutorialPopover';
import { ProfileGetter, Team } from '../views/TeamReview';
import { TeamData } from '@shared/types/TeamData';
import DailyRangeSlider from './DailyRangeSlider';
import dayjs from 'dayjs';

export interface OverviewProps {
    index: number;
    team: Team;
    teamData: TeamData;
    teamDatas: TeamData[];
    dateUtils: DateUtils;
    profileGetter: ProfileGetter;
}

export const PRCard: React.FC<OverviewProps> = ({
    index,
    team,
    teamData,
    teamDatas,
    dateUtils,
    profileGetter,
}) => {
    const totalWeeks = 15;
    const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([
        0,
        totalWeeks - 1,
    ]);

    // New state for daily date range
    const [selectedDailyRange, setSelectedDailyRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [useDailyRange, setUseDailyRange] = useState(false);

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

    const handleDailyRangeChange = (range: [dayjs.Dayjs, dayjs.Dayjs]) => {
        setSelectedDailyRange(range);
    };

    const handleUseDailyRangeChange = (useDaily: boolean) => {
        setUseDailyRange(useDaily);
    };

    return (
        <Stack>
            <Box px={20}>
                <Group position="apart" mb={10}>
                    <Box>
                        <strong>Time Period:</strong> Weeks {selectedWeekRange[0] + 1} - {selectedWeekRange[1] + 1}
                    </Box>
                    <Box>
                        <strong>Span:</strong> {selectedWeekRange[1] - selectedWeekRange[0] + 1} week(s)
                    </Box>
                </Group>
                <RangeSlider
                    value={selectedWeekRange}
                    max={totalWeeks - 1}
                    minRange={1}
                    onChange={setSelectedWeekRange}
                    label={value => weekAliases[value] || `Week ${value + 1}`}
                    marks={marks}
                    mb={30}
                    onDoubleClick={handleSliderDoubleClick}
                    disabled={useDailyRange}
                />
            </Box>
            
            <DailyRangeSlider 
                teamData={teamData}
                onRangeChange={handleDailyRangeChange}
                onUseDailyRangeChange={handleUseDailyRangeChange}
            />

            <TutorialPopover stage={9} position="top" disabled={index !== 0}>
                <PR
                    team={team}
                    teamData={teamData}
                    selectedWeekRange={selectedWeekRange}
                    dateUtils={dateUtils}
                    profileGetter={profileGetter}
                    dailyDateRange={selectedDailyRange}
                    useDailyRange={useDailyRange}
                />
            </TutorialPopover>

            <Modal
                opened={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Set alias for Week ${editingWeek !== null ? editingWeek + 1 : ''}`}
            >
                <TextInput
                    label="Week Alias"
                    placeholder="e.g. Spring Break"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                />
                <Group position="right" mt="md">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={saveAlias}>Save</Button>
                </Group>
            </Modal>
        </Stack>
    );
};

export default PRCard;