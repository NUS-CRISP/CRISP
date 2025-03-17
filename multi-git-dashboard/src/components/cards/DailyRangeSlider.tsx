import { RangeSlider, Stack, Modal, TextInput, Button, Box, Group, Switch } from '@mantine/core';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

export interface DailyRangeSliderProps {
  teamData: any;
  onRangeChange: (range: [dayjs.Dayjs, dayjs.Dayjs]) => void;
  onUseDailyRangeChange: (useDailyRange: boolean) => void;
}

const DailyRangeSlider: React.FC<DailyRangeSliderProps> = ({
  teamData,
  onRangeChange,
  onUseDailyRangeChange,
}) => {
  const [earliestDate, setEarliestDate] = useState<dayjs.Dayjs | null>(null);
  const [latestDate, setLatestDate] = useState<dayjs.Dayjs | null>(null);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [selectedDayRange, setSelectedDayRange] = useState<[number, number]>([0, 0]);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (!teamData || !teamData.teamPRs || teamData.teamPRs.length === 0) return;

    const dates = teamData.teamPRs.map(pr => dayjs(pr.createdAt));

    let earliest = dates[0];
    for (const date of dates) {
      if (date.isBefore(earliest)) {
        earliest = date;
      }
    }

    earliest = earliest.subtract(21, 'days');

    let latest = dates[0];
    for (const date of dates) {
      if (date.isAfter(latest)) {
        latest = date;
      }
    }

    setEarliestDate(earliest);
    setLatestDate(latest);

    const days = latest.diff(earliest, 'day');
    setTotalDays(days);

    setSelectedDayRange([0, days]);
  }, [teamData]);


  const generateMarks = () => {
    if (!earliestDate || totalDays === 0) return [];

    const marks = [];
    const markInterval = Math.max(Math.floor(totalDays / 10), 1);

    for (let i = 0; i <= totalDays; i += markInterval) {
      marks.push({
        value: i,
        label: earliestDate.add(i, 'day').format('MMM D'),
      });
    }

    return marks;
  };

  const handleSliderChange = (range: [number, number]) => {
    setSelectedDayRange(range);

    if (earliestDate) {
      const startDate = earliestDate.add(range[0], 'day');
      const endDate = earliestDate.add(range[1], 'day');
      onRangeChange([startDate, endDate]);
    }
  };

  const handleToggleChange = (checked: boolean) => {
    setIsEnabled(checked);
    onUseDailyRangeChange(checked);

    if (checked && earliestDate) {
      const startDate = earliestDate.add(selectedDayRange[0], 'day');
      const endDate = earliestDate.add(selectedDayRange[1], 'day');
      onRangeChange([startDate, endDate]);
    }
  };

  const getSelectedDateRange = () => {
    if (!earliestDate) return 'Loading...';

    const startDate = earliestDate.add(selectedDayRange[0], 'day');
    const endDate = earliestDate.add(selectedDayRange[1], 'day');

    return `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`;
  };

  const getDayCount = () => {
    return selectedDayRange[1] - selectedDayRange[0] + 1;
  };

  return (
    <Stack>
      <Box px={20}>
        <Group position="apart" mb={10}>
          <Switch
            label="Filter by date range"
            checked={isEnabled}
            onChange={(event) => handleToggleChange(event.currentTarget.checked)}
          />
        </Group>

        {isEnabled && (
          <>
            <Group position="apart" mb={10}>
              <Box>
                <strong>Date Range:</strong> {getSelectedDateRange()}
              </Box>
              <Box>
                <strong>Span:</strong> {getDayCount()} day(s)
              </Box>
            </Group>

            <RangeSlider
              value={selectedDayRange}
              onChange={handleSliderChange}
              max={totalDays}
              min={0}
              minRange={1}
              label={(value) => {
                if (!earliestDate) return '';
                return earliestDate.add(value, 'day').format('MMM D');
              }}
              marks={generateMarks()}
              mb={30}
              disabled={!isEnabled}
            />
          </>
        )}
      </Box>
    </Stack>
  );
};

export default DailyRangeSlider;