import { hasFacultyPermission } from '@/lib/auth/utils';
import {
  Button,
  Center,
  Container,
  Group,
  Modal,
  Text,
  Tabs,
} from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AssessmentCard from '../cards/AssessmentCard';
import CreateAssessmentForm from '../forms/CreateAssessmentForm';
import InternalAssessmentCard from '../cards/InternalAssessmentCard';
import TutorialPopover from '../tutorial/TutorialPopover';
import { TeamSet } from '@shared/types/TeamSet';
import { useRouter } from 'next/router';

type CreateAssessmentTabValue =
  | 'internal'
  | 'peerReview'
  | 'internalCsv'
  | 'googleForms'
  | 'googleCsv';

interface AssessmentInfoProps {
  courseId: string;
  assessments: Assessment[];
  internalAssessments: InternalAssessment[];
  teamSets: TeamSet[];
  onUpdate: () => void;
}

const AssessmentInfo: React.FC<AssessmentInfoProps> = ({
  courseId,
  assessments,
  internalAssessments,
  teamSets,
  onUpdate,
}) => {
  const router = useRouter();
  const isFaculty = hasFacultyPermission();
  console.log(internalAssessments);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [createAssessmentTab, setCreateAssessmentTab] =
    useState<CreateAssessmentTabValue>('internal');

  const openCreateAssessmentModal = (
    tab: CreateAssessmentTabValue = 'internal'
  ) => {
    setCreateAssessmentTab(tab);
    setIsCreatingAssessment(true);
  };

  const closeCreateAssessmentModal = () => {
    setIsCreatingAssessment(false);
  };

  useEffect(() => {
    if (!router.isReady) return;
    if (!isFaculty) return;

    const openCreateAssessment = router.query.openCreateAssessment;
    const requestedTab = router.query.createAssessmentTab;

    const shouldOpen =
      openCreateAssessment === '1' || openCreateAssessment === 'true';

    if (!shouldOpen) return;

    const validTabs: CreateAssessmentTabValue[] = [
      'internal',
      'peerReview',
      'internalCsv',
      'googleForms',
      'googleCsv',
    ];

    const requestedTabValue =
      typeof requestedTab === 'string' &&
      validTabs.includes(requestedTab as CreateAssessmentTabValue)
        ? (requestedTab as CreateAssessmentTabValue)
        : 'internal';

    openCreateAssessmentModal(requestedTabValue);

    const cleanedQuery = { ...router.query };
    delete cleanedQuery.openCreateAssessment;
    delete cleanedQuery.createAssessmentTab;

    router.replace(
      { pathname: router.pathname, query: cleanedQuery },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, router.query, isFaculty]);

  const handleAssessmentCreated = () => {
    setIsCreatingAssessment(false);
    onUpdate();
  };

  const assessmentCards = !(assessments === undefined || assessments === null)
    ? assessments.map(assessment => (
        <Link
          key={assessment._id}
          style={{ textDecoration: 'none' }}
          href={`/courses/${courseId}/assessments/${assessment._id}`}
          passHref
        >
          <AssessmentCard
            key={assessment._id}
            assessmentType={assessment.assessmentType}
            markType={assessment.markType}
            teamSetName={assessment.teamSet ? assessment.teamSet.name : null}
          />
        </Link>
      ))
    : [];

  const internalAssessmentCards = !(
    internalAssessments === undefined || internalAssessments === null
  )
    ? internalAssessments.map(assessment => (
        <Link
          key={assessment._id}
          style={{ textDecoration: 'none' }}
          href={`/courses/${courseId}/internal-assessments/${assessment._id}`}
          passHref
        >
          <InternalAssessmentCard
            key={assessment._id}
            assessmentName={assessment.assessmentName}
            startDate={assessment.startDate}
            endDate={assessment.endDate}
            description={assessment.description}
            granularity={assessment.granularity}
          />
        </Link>
      ))
    : [];

  return (
    <Container>
      {isFaculty && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={() => openCreateAssessmentModal('internal')}>
            Create Assessment
          </Button>
        </Group>
      )}
      <Modal
        opened={isCreatingAssessment}
        onClose={closeCreateAssessmentModal}
        title="Create Assessment"
        size="xl"
      >
        <CreateAssessmentForm
          teamSets={teamSets}
          courseId={courseId}
          onAssessmentCreated={handleAssessmentCreated}
          initialTab={createAssessmentTab}
        />
      </Modal>

      <Tabs defaultValue="internalAssessments">
        <Tabs.List>
          <Tabs.Tab value="assessments">Assessments</Tabs.Tab>
          <Tabs.Tab value="internalAssessments">Internal Assessments</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="assessments" pt="xs">
          {assessmentCards.length > 0 ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {assessmentCards}
            </div>
          ) : (
            <Center>
              <Text>No Assessments</Text>
            </Center>
          )}
        </Tabs.Panel>

        {/* Tab Panel for Internal Assessments */}
        <Tabs.Panel value="internalAssessments" pt="xs">
          <TutorialPopover stage={24} position="bottom">
            {internalAssessmentCards.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {internalAssessmentCards}
              </div>
            ) : (
              <Center>
                <Text>No Internal Assessments</Text>
              </Center>
            )}
          </TutorialPopover>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default AssessmentInfo;
