import ResultForm from '@/components/forms/ResultForm';
import { Button, Container, Modal, Tabs, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { User } from '@shared/types/User';
import { getSession, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import ResultCard from '../../../../components/cards/ResultCard';
import { hasFacultyPermission } from '@/lib/utils';

const AssessmentDetail: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };

  const assessmentsApiRoute = `/api/assessments/${assessmentId}`;
  const teachingTeamApiRoute = `/api/courses/${id}/teachingteam`;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [teachingTeam, setTeachingTeam] = useState<User[]>([]);
  const [isResultFormOpen, setIsResultFormOpen] = useState(false);

  const { data: session } = useSession();

  const fetchAssessment = useCallback(async () => {
    try {
      const session = await getSession();
      const accountId = session?.user?.id;
      const response = await fetch(assessmentsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${accountId}`,
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

  const toggleResultForm = () => {
    setIsResultFormOpen(o => !o);
  };

  const onUpdate = () => {
    fetchAssessment();
    fetchTeachingTeam();
    setIsResultFormOpen(o => !o);
  };

  useEffect(() => {
    if (assessmentId && id) {
      fetchAssessment();
    }
  }, [assessmentId, id, fetchAssessment]);

  useEffect(() => {
    if (id) {
      fetchTeachingTeam();
    }
  }, [id, fetchTeachingTeam]);

  return (
    <Container>
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="form">Google Form</Tabs.Tab>
          <Tabs.Tab value="results">Results</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Text>Assessment Type: {assessment?.assessmentType}</Text>
          <Text>Mark Type: {assessment?.markType}</Text>
          <Text>Frequency: {assessment?.frequency}</Text>
          <Text>Granularity: {assessment?.granularity}</Text>
          <Text>Form Link: {assessment?.formLink}</Text>
        </Tabs.Panel>

        <Tabs.Panel value="form">
          {assessment?.formLink ? (
            <iframe src={assessment.formLink} width="100%" height="600">
              Loading…
            </iframe>
          ) : (
            <Text>No form link provided</Text>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="results">
          {hasFacultyPermission(session) && (
            <Button
              onClick={toggleResultForm}
              style={{ marginTop: '16px', marginBottom: '16px' }}
            >
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
              onResultsUploaded={onUpdate}
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
