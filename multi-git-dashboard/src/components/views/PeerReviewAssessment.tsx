import { Container, Tabs } from '@mantine/core';
import { useEffect, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import PeerReviewSubmissions from './PeerReviewSubmissions';
import { useRouter } from 'next/router';
import PeerReviewAssessmentOverview from './PeerReviewAssessmentOverview';
import PeerReviewResults from './PeerReviewResults';

interface PeerReviewAssessmentProps {
  assessment: InternalAssessment | null;
  fetchAssessment: () => void;
  isFaculty: boolean;
  isTA: boolean;
}

const PeerReviewAssessment: React.FC<PeerReviewAssessmentProps> = ({
  assessment,
  fetchAssessment,
  isFaculty,
  isTA,
}) => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };

  const [activeTab, setActiveTab] = useState<string>('Overview');
  const setActiveTabAndSave = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem(
      `activePeerReviewAssessmentTab_${assessmentId}`,
      tabName
    );
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(
      `activePeerReviewAssessmentTab_${assessmentId}`
    );
    if (
      savedTab &&
      ['Overview', 'Submissions', 'Internal Results'].includes(savedTab)
    ) {
      setActiveTab(savedTab);
    }
  }, [assessmentId]);

  return (
    <Container pt="md">
      <Tabs value={activeTab}>
        <Tabs.List>
          <Tabs.Tab
            value="Overview"
            onClick={() => setActiveTabAndSave('Overview')}
          >
            Overview
          </Tabs.Tab>

          {(isFaculty || isTA) && (
            <Tabs.Tab
              value="Submissions"
              onClick={() => setActiveTabAndSave('Submissions')}
            >
              Submissions
            </Tabs.Tab>
          )}

          {isFaculty && (
            <Tabs.Tab
              value="Results"
              onClick={() => setActiveTabAndSave('Results')}
            >
              Results
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="Overview">
          <PeerReviewAssessmentOverview
            courseId={id}
            assessment={assessment}
            isFaculty={isFaculty}
            onUpdated={fetchAssessment}
            onDeleted={() => {
              // parent decides how to navigate away after delete
              router.push(`/courses/${id}/assessments`);
            }}
          />
        </Tabs.Panel>

        {(isFaculty || isTA) && (
          <Tabs.Panel value="Submissions">
            <PeerReviewSubmissions
              courseId={id}
              assessmentId={assessmentId}
              isFaculty={isFaculty}
            />
          </Tabs.Panel>
        )}

        {(isFaculty || isTA) && (
          <Tabs.Panel value="Results">
            <PeerReviewResults courseId={id} assessmentId={assessmentId} />
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  );
};

export default PeerReviewAssessment;
