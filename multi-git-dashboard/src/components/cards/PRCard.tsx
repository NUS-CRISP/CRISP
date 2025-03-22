import { DateUtils } from '@/lib/utils';
import {
  RangeSlider,
  Stack,
  Modal,
  TextInput,
  Button,
  Box,
  Group,
  Text,
} from '@mantine/core';
import { useState, useRef } from 'react';
import PR from '../overview/pr/PR';
import TutorialPopover from '../tutorial/TutorialPopover';
import { ProfileGetter, Team } from '../views/Overview';
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
  dateUtils,
  profileGetter,
}) => {
  const totalWeeks = 15;
  const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([
    0,
    totalWeeks - 1,
  ]);

  // New state for daily date range
  const [selectedDailyRange, setSelectedDailyRange] = useState<
    [dayjs.Dayjs, dayjs.Dayjs] | null
  >(null);
  const [useDailyRange, setUseDailyRange] = useState(false);

  const [weekAliases, setWeekAliases] = useState<string[]>(
    Array(totalWeeks).fill('')
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  // Export functionality
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportRange, setCurrentExportRange] = useState('');
  const prRef = useRef<HTMLDivElement>(null);

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

  // Export SVG as PNG
  const exportSVGAsPNG = async (
    weekRange: [number, number],
    filename: string
  ) => {
    setSelectedWeekRange(weekRange);

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (prRef.current) {
      const svg = prRef.current.querySelector('svg');
      if (svg) {
        // Get SVG data
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], {
          type: 'image/svg+xml;charset=utf-8',
        });
        const URL = window.URL || window.webkitURL || window;
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create canvas to render the SVG
        const canvas = document.createElement('canvas');
        const bbox = svg.getBoundingClientRect();
        canvas.width = bbox.width;
        canvas.height = bbox.height;
        const ctx = canvas.getContext('2d');

        // Fill with white background
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const img = new Image();

          await new Promise((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0);

              // Convert to PNG and trigger download
              const pngUrl = canvas.toDataURL('image/png');
              const downloadLink = document.createElement('a');
              downloadLink.href = pngUrl;
              downloadLink.download = filename;
              downloadLink.click();

              URL.revokeObjectURL(svgUrl);
              resolve(null);
            };
            img.onerror = reject;
            img.src = svgUrl;
          });
        }

        return true;
      }
    }

    return false;
  };

  // Batch export all week ranges
  const exportAllWeekRanges = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Create all week ranges to export: 1-2, 1-3, ..., 1-15
    const weekRangesToExport: [number, number][] = [];
    for (let i = 1; i < totalWeeks; i++) {
      weekRangesToExport.push([0, i]);
    }

    let successCount = 0;

    // Export each range
    for (let i = 0; i < weekRangesToExport.length; i++) {
      const range = weekRangesToExport[i];
      const rangeLabel = `Week ${range[0] + 1}-${range[1] + 1}`;
      setCurrentExportRange(rangeLabel);

      const success = await exportSVGAsPNG(
        range,
        `diagram_week_${range[0] + 1}_to_${range[1] + 1}.png`
      );

      if (success) successCount++;

      // Update progress
      setExportProgress(((i + 1) / weekRangesToExport.length) * 100);
    }

    setIsExporting(false);

    setSelectedWeekRange([0, totalWeeks - 1]);

    alert(
      `Export complete. ${successCount} of ${weekRangesToExport.length} files were exported.`
    );
  };

  return (
    <Stack>
      <Box px={20}>
        <Group mb={10}>
          <Box>
            <strong>Time Period:</strong> Weeks {selectedWeekRange[0] + 1} -{' '}
            {selectedWeekRange[1] + 1}
          </Box>
          <Box>
            <strong>Span:</strong>{' '}
            {selectedWeekRange[1] - selectedWeekRange[0] + 1} week(s)
          </Box>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setShowExportOptions(!showExportOptions)}
          >
            {showExportOptions ? 'Hide Export Options' : 'Show Export Options'}
          </Button>
        </Group>
        <RangeSlider
          value={selectedWeekRange}
          max={totalWeeks - 1}
          minRange={1}
          onChange={setSelectedWeekRange}
          label={value => weekAliases[value] || `Week ${value + 1}`}
          marks={marks}
          mb={10}
          onDoubleClick={handleSliderDoubleClick}
          disabled={useDailyRange || isExporting}
        />
      </Box>

      {showExportOptions && (
        <Box px={20} py={10}>
          <Text mb={10}>Export Options</Text>
          <Group>
            <Button
              onClick={() =>
                exportSVGAsPNG(
                  selectedWeekRange,
                  `pr_arc_diagram_week_${selectedWeekRange[0] + 1}_to_${selectedWeekRange[1] + 1}.png`
                )
              }
              disabled={isExporting}
              color="blue"
              size="sm"
            >
              Export Current View
            </Button>
            <Button
              onClick={exportAllWeekRanges}
              disabled={isExporting}
              color="green"
              size="sm"
            >
              Export All Week Ranges (1-2 to 1-15)
            </Button>
          </Group>

          {isExporting && (
            <Box mt={10}>
              <Text size="sm">Exporting {currentExportRange}...</Text>
              <Group align="center">
                <Box>
                  <RangeSlider
                    value={[0, exportProgress]}
                    disabled
                    max={100}
                    min={0}
                    label={null}
                  />
                </Box>
                <Text size="xs">{Math.round(exportProgress)}%</Text>
              </Group>
            </Box>
          )}
        </Box>
      )}

      <DailyRangeSlider
        teamData={teamData}
        onRangeChange={handleDailyRangeChange}
        onUseDailyRangeChange={handleUseDailyRangeChange}
      />

      <TutorialPopover stage={9} position="top" disabled={index !== 0}>
        <div ref={prRef}>
          <PR
            team={team}
            teamData={teamData}
            selectedWeekRange={selectedWeekRange}
            dateUtils={dateUtils}
            profileGetter={profileGetter}
            dailyDateRange={selectedDailyRange}
            useDailyRange={useDailyRange}
          />
        </div>
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
          onChange={e => setAliasInput(e.target.value)}
        />
        <Group mt="md">
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
