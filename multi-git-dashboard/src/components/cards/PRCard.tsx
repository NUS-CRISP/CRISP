import { DateUtils } from '@/lib/utils';
import { RangeSlider, Stack, Modal, TextInput, Button } from '@mantine/core';
import { useState } from 'react';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import TutorialPopover from '../tutorial/TutorialPopover';
import { ProfileGetter, Team } from '../views/TeamReview';
import { TeamData } from '@shared/types/TeamData';

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

            <TutorialPopover stage={9} position="top" disabled={index !== 0}>
                <PR
                    team={team}
                    teamData={teamData}
                    selectedWeekRange={selectedWeekRange}
                    dateUtils={dateUtils}
                    profileGetter={profileGetter}
                />
            </TutorialPopover>


        </Stack>
    );
};

export default PRCard;
