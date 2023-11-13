import { Container, Tabs, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import ResultCard from '../../../../components/cards/ResultCard';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/assessments/`;

const AssessmentDetail: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  const fetchAssessment = useCallback(async () => {
    console.error(id);
    console.error(assessmentId);
    try {
      const response = await fetch(`${apiUrl}${assessmentId}`);
      if (response.ok) {
        const data = await response.json();
        console.error(data);
        setAssessment(data);
      } else {
        console.error('Error fetching assessment:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  }, [assessmentId, id]);

  useEffect(() => {
    if (assessmentId && id) {
      fetchAssessment();
    }
  }, [assessmentId, id, fetchAssessment]);

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
          {assessment?.results.map(result => (
            <ResultCard key={result._id} result={result} />
          ))}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default AssessmentDetail;
