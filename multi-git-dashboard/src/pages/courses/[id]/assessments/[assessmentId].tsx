import { Container, Tabs } from '@mantine/core';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AssessmentGoogleOverview from '@/components/views/AssessmentGoogleOverview';
import AssessmentGoogleResults from '@/components/views/AssessmentGoogleResults';
import { Assessment } from '@shared/types/Assessment';
import { User } from '@shared/types/User';
import { SheetData } from '@shared/types/SheetData';
import { hasFacultyPermission } from '@/lib/auth/utils';

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
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const permission = hasFacultyPermission();

  const fetchAssessment = useCallback(async () => {
    try {
      const response = await fetch(assessmentsApiRoute);
      if (!response.ok) {
        console.error('Error fetching assessment:', response.statusText);
        return;
      }
      const data: Assessment = await response.json();
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
      const data: User[] = await response.json();
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
      const data: SheetData = await response.json();
      setSheetData(data);
    } catch (error) {
      console.error('Error:', error);
    }
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
      ['Overview', 'Preview Form', 'Results'].includes(savedTab)
    ) {
      setActiveTab(savedTab);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (router.isReady) {
      fetchAssessment();
      fetchTeachingTeam();
      getSheetData();
    }
  }, [router.isReady, fetchAssessment, fetchTeachingTeam]);

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

          {assessment?.formLink && (
            <Tabs.Tab
              value="Preview Form"
              onClick={() => setActiveTabAndSave('Preview Form')}
            >
              Preview Form
            </Tabs.Tab>
          )}

          {assessment?.formLink && permission && (
            <Tabs.Tab
              value="Results"
              onClick={() => setActiveTabAndSave('Results')}
            >
              Google Form Results
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="Overview">
          {id && assessment?.formLink && (
            <AssessmentGoogleOverview
              courseId={id}
              assessment={assessment}
              sheetData={sheetData}
              hasFacultyPermission={permission}
              onUpdateSheetData={getSheetData}
              onUpdateAssessment={fetchAssessment}
            />
          )}
        </Tabs.Panel>

        {assessment?.formLink && (
          <Tabs.Panel value="Preview Form">
            <iframe src={assessment.formLink} width="100%" height="1200">
              Loading…
            </iframe>
          </Tabs.Panel>
        )}

        {assessment?.formLink && permission && (
          <Tabs.Panel value="Results">
            <AssessmentGoogleResults
              assessmentId={assessmentId}
              teachingTeam={teachingTeam}
              results={assessment?.results || []}
              onResultsUploaded={fetchAssessment}
            />
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  );
};

export default AssessmentDetail;
