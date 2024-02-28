import ResultForm from '@/components/forms/ResultForm';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button, Container, Modal, Tabs, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { User } from '@shared/types/User';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import ResultCard from '../../../../components/cards/ResultCard';
import AssessmentOverview from '@/components/views/AssessmentOverview';
import { SheetData } from '@shared/types/SheetData';

const AssessmentDetail: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };

  const assessmentsApiRoute = `/api/assessments/${assessmentId}`;
  const teachingTeamApiRoute = `/api/courses/${id}/teachingteam`;
  const assessmentSheetApiRoute = `/api/assessments/${assessmentId}/googlesheets`;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [teachingTeam, setTeachingTeam] = useState<User[]>([]);
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);

  const [activeTab, setActiveTab] = useState<string>('Overview');

  const permission = hasFacultyPermission();

  const fetchAssessment = useCallback(async () => {
    try {
      const response = await fetch(assessmentsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching assessment:', response.statusText);
        return;
      }
      const data = await response.json();
      setAssessment(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  }, [assessmentId]);

  const fetchTeachingTeam = useCallback(async () => {
    try {
      const response = await fetch(teachingTeamApiRoute);
      if (!response.ok) {
        console.error('Error fetching Teaching Team:', response.statusText);
        return;
      }
      const data = await response.json();
      setTeachingTeam(data);
    } catch (error) {
      console.error('Error fetching Teaching Team:', error);
    }
  }, [id]);

  const getSheetData = async () => {
    try {
      const response = await fetch(assessmentSheetApiRoute);
      if (!response.ok) {
        throw new Error('Failed to fetch sheets data');
      }
      const data = await response.json();
      setSheetData(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleResultForm = () => {
    setIsResultFormOpen(o => !o);
  };

  const onResultsUploaded = () => {
    fetchAssessment();
    setIsResultFormOpen(o => !o);
  };

  const onUpdateAssessment = () => {
    fetchAssessment();
  };

  const onUpdateSheet = () => {
    getSheetData();
  };

  const setActiveTabAndSave = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem(`activeAssessmentTab_${assessmentId}`, tabName);
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(
      `activeAssessmentTab_${assessmentId}`
    );
    if (
      savedTab &&
      ['Overview', 'Form', 'Results'].some(label => label === savedTab)
    ) {
      setActiveTab(savedTab);
    }
  });

  useEffect(() => {
    if (router.isReady) {
      fetchAssessment();
      fetchTeachingTeam();
    }
  }, [router.isReady]);

  useEffect(() => {
    if (router.isReady) {
      getSheetData();
    }
  }, [router.isReady]);

  return (
    <Container>
      <Tabs value={activeTab}>
        <Tabs.List>
          <Tabs.Tab
            value="Overview"
            onClick={() => setActiveTabAndSave('Overview')}
          >
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="Form" onClick={() => setActiveTabAndSave('Form')}>
            Google Form
          </Tabs.Tab>
          <Tabs.Tab
            value="Results"
            onClick={() => setActiveTabAndSave('Results')}
          >
            Results
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="Overview">
          {id && (
            <AssessmentOverview
              courseId={id}
              assessment={assessment}
              sheetData={sheetData}
              hasFacultyPermission={permission}
              onUpdateSheetData={onUpdateSheet}
              onUpdateAssessment={onUpdateAssessment}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="Form">
          {assessment?.formLink ? (
            <iframe src={assessment.formLink} width="100%" height="1200">
              Loading…
            </iframe>
          ) : (
            <Text>No form link provided</Text>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="Results">
          {hasFacultyPermission() && (
            <Button onClick={toggleResultForm} my={16}>
              Upload Results
            </Button>
          )}
          <Modal
            opened={isResultFormOpen}
            onClose={toggleResultForm}
            title="Upload Results"
          >
            <ResultForm
              assessmentId={assessmentId}
              onResultsUploaded={onResultsUploaded}
            />
          </Modal>
          {assessment?.results.map(result => (
            <ResultCard
              key={result._id}
              result={result}
              teachingTeam={teachingTeam}
              assessmentId={assessmentId}
            />
          ))}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default AssessmentDetail;
