import { getTutorialHighlightColor } from '@/lib/utils';
import { Accordion, Tabs, Title } from '@mantine/core';
import { forwardRef, useState } from 'react';
import CodeAnalysisOverview from './CodeAnalysisOverview';
import CodeAnalysisTimeline from './CodeAnalysisTimeline';
import TutorialPopover from '../tutorial/TutorialPopover';
import { useTutorialContext } from '../tutorial/TutorialContext';

interface CodeAnalysisAccordionItemProps {
  codeData: {
    [executionDate: string]: {
      metrics: string[];
      values: string[];
      types: string[];
      domains: string[];
      metricStats: Map<string, { median: number; mean: number }>;
    };
  };

  teamNumber: number;

  aiInsights?: { text: string; date: Date };

  renderTutorialPopover?: boolean;
}

const CodeAnalysisAccordionItem = forwardRef<
  HTMLDivElement,
  CodeAnalysisAccordionItemProps
>(({ codeData, teamNumber, aiInsights, renderTutorialPopover = false }, ref) => {
  const { curTutorialStage, nextTutorialStage } = useTutorialContext();

  const [viewMode, setViewMode] = useState<'overview' | 'timeline'>('overview');

  const sortedDates = Object.keys(codeData)
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime());

  const latestExecutionDate = sortedDates[0];
  const latestData = codeData[latestExecutionDate.toISOString()];

  return (
    <Accordion.Item key={teamNumber} value={teamNumber.toString()} ref={ref}>
      <Accordion.Control bg={getTutorialHighlightColor(7)}>
        <Title size="h3">{`Team ${teamNumber}`}</Title>
      </Accordion.Control>
      <Accordion.Panel bg={getTutorialHighlightColor(7)}>
        <Tabs
          value={viewMode}
          onChange={value => setViewMode(value as 'overview' | 'timeline')}
        >
          <Tabs.List>
            <Tabs.Tab value="overview" style={{ fontSize: '16px' }}>
              Overview
            </Tabs.Tab>
            {renderTutorialPopover ? (
              <TutorialPopover stage={18} position="right" hideButton={true} >
                <Tabs.Tab value="timeline" style={{ fontSize: '16px' }} onClick={() => {curTutorialStage === 18 ? nextTutorialStage() : null} }>
                  Timeline
                </Tabs.Tab>
              </TutorialPopover>
            ) : (
              <Tabs.Tab value="timeline" style={{ fontSize: '16px' }}>
                Timeline
              </Tabs.Tab>
            )}
          </Tabs.List>
          <Tabs.Panel value="overview" pt="xs">
            <CodeAnalysisOverview
              latestData={latestData}
              executedDate={latestExecutionDate}
              aiInsights={aiInsights}
              renderTutorialPopover={renderTutorialPopover && viewMode === 'overview'}
            />
          </Tabs.Panel>
          <Tabs.Panel value="timeline" pt="xs">
            <CodeAnalysisTimeline
              codeData={codeData}
              renderTutorialPopover={renderTutorialPopover && viewMode === 'timeline'}
            />
          </Tabs.Panel>
        </Tabs>
      </Accordion.Panel>
    </Accordion.Item>
  );
});

export default CodeAnalysisAccordionItem;
