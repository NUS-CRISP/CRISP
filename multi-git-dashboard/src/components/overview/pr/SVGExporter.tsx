import React, { useState } from 'react';
import {
  Button,
  Box,
  Stack,
  Text,
  Progress,
  Modal,
  Tabs,
  Switch,
  Select,
} from '@mantine/core';

// Component types we want to export
const EXPORT_TYPES = {
  ARC_DIAGRAM: 'arc',
  NETWORK_DIAGRAM: 'network',
};

const SVGExporter = ({
  onExportStart,
  onExportProgress,
  onExportComplete,
}) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRange, setCurrentRange] = useState('');
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);
  const [exportType, setExportType] = useState(EXPORT_TYPES.ARC_DIAGRAM);
  const [exportAllTypes, setExportAllTypes] = useState(false);
  const [outputDirectory, setOutputDirectory] = useState('pr-diagrams');

  const totalWeeks = 15;

  const weekRangesToExport = Array.from({ length: totalWeeks - 1 }, (_, i) => {
    return [0, i + 1]; // 0-indexed, so [0,1] is weeks 1-2
  });

  const exportSVGsAsPNGs = async () => {
    setExporting(true);
    setProgress(0);
    setExportedCount(0);
    setExportComplete(false);

    if (onExportStart) {
      onExportStart();
    }

    const typesToExport = exportAllTypes
      ? Object.values(EXPORT_TYPES)
      : [exportType];

    const totalExports = weekRangesToExport.length * typesToExport.length;
    let completedExports = 0;

    for (const type of typesToExport) {
      for (let i = 0; i < weekRangesToExport.length; i++) {
        const range = weekRangesToExport[i];
        const rangeLabel = `Week ${range[0] + 1}-${range[1] + 1}`;
        setCurrentRange(`${type.toUpperCase()} - ${rangeLabel}`);

        if (window.setSelectedWeekRange) {
          window.setSelectedWeekRange(range);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        let svgElement;

        if (type === EXPORT_TYPES.ARC_DIAGRAM) {
          svgElement = document.querySelector('.arc-diagram svg');
        } else if (type === EXPORT_TYPES.NETWORK_DIAGRAM) {
          svgElement = document.querySelector('.network-diagram svg');
        }

        if (svgElement) {
          const filename = `${type}_diagram_week_${range[0] + 1}_to_${range[1] + 1}`;
          await exportSVGAsPNG(svgElement, filename, outputDirectory);
          setExportedCount(prev => prev + 1);
        } else {
          console.error(
            `SVG element not found for ${type} diagram, week range ${rangeLabel}`
          );
        }

        // Update progress
        completedExports++;
        const progressValue = (completedExports / totalExports) * 100;
        setProgress(progressValue);

        if (onExportProgress) {
          onExportProgress(progressValue);
        }
      }
    }

    setExporting(false);
    setExportComplete(true);

    if (onExportComplete) {
      onExportComplete(setExportedCount);
    }
  };

  const exportSVGAsPNG = async (svgElement, filename, directory = '') => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgRect = svgElement.getBoundingClientRect();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    const viewBox = svgElement.getAttribute('viewBox');
    let width, height;

    if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
      width = vbWidth || svgRect.width;
      height = vbHeight || svgRect.height;
    } else {
      width = svgRect.width;
      height = svgRect.height;
    }

    const scale = 2; // Increase for higher resolution
    canvas.width = width * scale;
    canvas.height = height * scale;

    const svgBlob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const URL = window.URL || window.webkitURL || window;
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.scale(scale, scale);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to PNG and trigger download
        try {
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;

          let fullPath = filename;
          if (directory) {
            fullPath = `${directory}/${filename}`;

            try {
              if (window.showDirectoryPicker) {
                console.log('Directory support available');
              }
            } catch (err) {
              console.log('Directory creation not supported in this browser');
            }
          }

          downloadLink.download = `${fullPath}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(svgUrl);
          resolve();
        } catch (error) {
          console.error('Error exporting PNG:', error);
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = svgUrl;
    });
  };

  return (
    <Stack spacing="md">
      <Box>
        <Text size="xl" weight={700}>
          SVG Diagram Exporter
        </Text>
        <Text size="sm" color="dimmed">
          Export week-by-week PR diagrams as PNG files
        </Text>
      </Box>

      <Tabs defaultValue="settings">
        <Tabs.List>
          <Tabs.Tab value="settings">Export Settings</Tabs.Tab>
          <Tabs.Tab value="preview">Preview Ranges</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="settings" pt="md">
          <Stack>
            <Select
              label="Export Diagram Type"
              value={exportType}
              onChange={setExportType}
              data={[
                { value: EXPORT_TYPES.ARC_DIAGRAM, label: 'Arc Diagram' },
                {
                  value: EXPORT_TYPES.NETWORK_DIAGRAM,
                  label: 'Network Diagram',
                },
              ]}
              disabled={exporting || exportAllTypes}
            />

            <Switch
              label="Export all diagram types"
              checked={exportAllTypes}
              onChange={event => setExportAllTypes(event.currentTarget.checked)}
              disabled={exporting}
            />

            <TextInput
              label="Output Directory (for script usage only)"
              placeholder="pr-diagrams"
              value={outputDirectory}
              onChange={e => setOutputDirectory(e.target.value)}
              disabled={exporting}
            />

            <Button
              color="blue"
              onClick={exportSVGsAsPNGs}
              disabled={exporting}
              fullWidth
            >
              {exporting
                ? 'Exporting...'
                : 'Export Diagrams for All Week Ranges'}
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="preview" pt="md">
          <Box>
            <Text weight={500} mb={10}>
              Week Ranges to Export:
            </Text>
            <Stack spacing={0}>
              {weekRangesToExport.map((range, index) => (
                <Text key={index} size="sm">
                  Weeks {range[0] + 1}-{range[1] + 1}
                </Text>
              ))}
            </Stack>
          </Box>
        </Tabs.Panel>
      </Tabs>

      {exporting && (
        <Box>
          <Text size="sm" mb={5}>
            Exporting {currentRange}... ({exportedCount}/
            {weekRangesToExport.length *
              (exportAllTypes ? Object.keys(EXPORT_TYPES).length : 1)}
            )
          </Text>
          <Progress value={progress} animate />
        </Box>
      )}

      <Modal
        opened={exportComplete}
        onClose={() => setExportComplete(false)}
        title="Export Complete"
        centered
      >
        <Text>Successfully exported {exportedCount} PNG files.</Text>
        <Button fullWidth mt="md" onClick={() => setExportComplete(false)}>
          Close
        </Button>
      </Modal>
    </Stack>
  );
};

const TextInput = ({ label, placeholder, value, onChange, disabled }) => (
  <Box>
    <Text size="sm" weight={500} mb={5}>
      {label}
    </Text>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        fontSize: '14px',
      }}
    />
  </Box>
);

export default SVGExporter;
