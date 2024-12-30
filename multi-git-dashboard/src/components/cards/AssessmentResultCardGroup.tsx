// file: AssessmentResultCardGroup.tsx

import React, { useMemo, useState, useCallback } from 'react';
import {
  Accordion,
  Group,
  Text,
  ThemeIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import AssessmentResultCard from '../cards/AssessmentResultCard';
import { StudentResult } from '../views/AssessmentInternalResults';

interface AssessmentResultCardGroupProps {
  teamId: string;
  label: string;
  students: StudentResult[];
  maxScore?: number;
  assessmentReleaseNumber: number;
}

const AssessmentResultCardGroup: React.FC<AssessmentResultCardGroupProps> = ({
  teamId,
  label,
  students,
  maxScore,
  assessmentReleaseNumber,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const { hasOutdatedSubmissions, allSubmissionsPresent } = useMemo(() => {
    let hasOutdated = false;
    let allPresent = true;

    students.forEach(sr => {
      if (sr.result) {
        if (sr.result.marks.some(mark => !mark.submission)) {
          allPresent = false;
        }
        if (
          sr.result.marks
            .filter(mark => mark.submission)
            .some(
              mark =>
                mark.submission!.submissionReleaseNumber !==
                assessmentReleaseNumber
            )
        ) {
          hasOutdated = true;
        }
      } else {
        allPresent = false;
      }
    });

    return {
      hasOutdatedSubmissions: hasOutdated,
      allSubmissionsPresent: allPresent && !hasOutdated,
    };
  }, [students, assessmentReleaseNumber]);

  return (
    <>
      <Accordion
        variant="separated"
        radius="md"
        chevronPosition="right"
        multiple={false}
      >
        <Accordion.Item value={teamId}>
          <Accordion.Control onClick={toggleOpen}>
            <Group justify="space-between">
              <Text fw={700}>{label}</Text>
              <Group gap="xs">
                {hasOutdatedSubmissions && (
                  <Tooltip
                    label="Submissions may be outdated"
                    withArrow
                    position="top"
                  >
                    <ThemeIcon
                      color="yellow"
                      variant="light"
                      radius="xl"
                      size="lg"
                      style={{ cursor: 'pointer' }}
                    >
                      <IconAlertCircle size={16} />
                    </ThemeIcon>
                  </Tooltip>
                )}
                {allSubmissionsPresent ? (
                  <Tooltip
                    label="All submissions are present"
                    withArrow
                    position="top"
                  >
                    <ThemeIcon
                      color="green"
                      variant="light"
                      radius="xl"
                      size="lg"
                      style={{ cursor: 'pointer' }}
                    >
                      <IconCheck size={16} />
                    </ThemeIcon>
                  </Tooltip>
                ) : (
                  <Tooltip
                    label="Some submissions are missing"
                    withArrow
                    position="top"
                  >
                    <ThemeIcon
                      color="red"
                      variant="light"
                      radius="xl"
                      size="lg"
                      style={{ cursor: 'pointer' }}
                    >
                      <IconAlertCircle size={16} />
                    </ThemeIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>
          </Accordion.Control>
          {isOpen && (
            <Accordion.Panel>
              {students.map(sr => (
                <AssessmentResultCard
                  key={sr.student._id}
                  studentResult={sr}
                  maxScore={maxScore}
                  assessmentReleaseNumber={assessmentReleaseNumber}
                />
              ))}
            </Accordion.Panel>
          )}
        </Accordion.Item>
      </Accordion>
      <Divider my="sm" />
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(AssessmentResultCardGroup);
