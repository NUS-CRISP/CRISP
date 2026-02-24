import {
  Container,
  Tabs,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import PeerReviewSubmissions from './PeerReviewSubmissions';
import { useRouter } from 'next/router';
import { hasCoursePermission, hasFacultyPermission } from '@/lib/auth/utils';
import PeerReviewAssessmentOverview from './PeerReviewAssessmentOverview';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { useSession } from 'next-auth/react';
import PeerReviewResults from './PeerReviewResults';

interface PeerReviewAssessmentProps {
  assessment: InternalAssessment | null;
  fetchAssessment: () => void;
}

const PeerReviewAssessment: React.FC<PeerReviewAssessmentProps> = ({
  assessment,
  fetchAssessment,
}) => {
  const router = useRouter();
  const { id, assessmentId } = router.query as { id: string; assessmentId: string };
  const isFaculty = hasFacultyPermission();
  const isTAOrFaculty = hasCoursePermission(
    id,
    [COURSE_ROLE.Faculty, COURSE_ROLE.TA]
  );
  const { data: session } = useSession();
  const userCourseRole = session?.user.courseRoles.find(
    cr => cr.course.toString() === id
  )?.courseRole;
  
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const setActiveTabAndSave = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem(`activePeerReviewAssessmentTab_${assessmentId}`, tabName);
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

          {true && (
            <Tabs.Tab
              value="Submissions"
              onClick={() => setActiveTabAndSave('Submissions')}
            >
              Submissions
            </Tabs.Tab>
          )}

          {true && (
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
            hasFacultyPermission={isFaculty}
            onUpdated={fetchAssessment}
            onDeleted={() => {
              // parent decides how to navigate away after delete
              router.push(`/courses/${id}/assessments`);
            }}
          />
        </Tabs.Panel>

        {true &&
          <Tabs.Panel value="Submissions">
            <PeerReviewSubmissions
              courseId={id}
              assessmentId={assessmentId}
              hasFacultyPermission={isFaculty}
            />
          </Tabs.Panel>
        }

        {true &&
          <Tabs.Panel value="Results">
            <PeerReviewResults
              courseId={id}
              assessmentId={assessmentId}
            />
          </Tabs.Panel>
        }
      </Tabs>
    </Container>
  )
}

export default PeerReviewAssessment;
