import { Box, Tabs } from '@mantine/core';
import CreateGoogleForm from './CreateGoogleAssessmentForm';
import CreateInternalForm from './CreateInternalAssessmentForm';
import UploadGoogleCSV from './UploadGoogleAssessmentFormCsv';
import UploadInternalCSV from './UploadInternalAssessmentFormCsv';
import { TeamSet } from '@shared/types/TeamSet';
import CreatePeerReviewForm from './CreatePeerReviewForm';
import { useEffect, useState } from 'react';

type CreateAssessmentTabValue =
  | 'internal'
  | 'peerReview'
  | 'internalCsv'
  | 'googleForms'
  | 'googleCsv';

interface CreateAssessmentFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSets: TeamSet[];
  initialTab?: CreateAssessmentTabValue;
}

const CreateAssessmentForm: React.FC<CreateAssessmentFormProps> = ({
  courseId,
  onAssessmentCreated,
  teamSets,
  initialTab = 'internal',
}) => {
  const [activeTab, setActiveTab] =
    useState<CreateAssessmentTabValue>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <Box mx="auto">
      <Tabs
        value={activeTab}
        onChange={value =>
          setActiveTab((value as CreateAssessmentTabValue) || 'internal')
        }
        variant="outline"
      >
        <Tabs.List justify="center">
          <Tabs.Tab value="internal">Internal Form</Tabs.Tab>
          <Tabs.Tab value="peerReview">Peer Review</Tabs.Tab>
          <Tabs.Tab value="internalCsv">Internal CSV Upload</Tabs.Tab>
          <Tabs.Tab value="googleForms">Google Forms</Tabs.Tab>
          <Tabs.Tab value="googleCsv">Google Forms CSV Upload</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="internal" pt="xs">
          <CreateInternalForm
            courseId={courseId}
            teamSetNames={teamSets.map(ts => ts.name)}
            onAssessmentCreated={onAssessmentCreated}
          />
        </Tabs.Panel>

        <Tabs.Panel value="peerReview" pt="xs">
          <CreatePeerReviewForm
            courseId={courseId}
            teamSets={teamSets}
            onCreated={onAssessmentCreated}
          />
        </Tabs.Panel>

        <Tabs.Panel value="internalCsv" pt="xs">
          <UploadInternalCSV
            courseId={courseId}
            onAssessmentCreated={onAssessmentCreated}
          />
        </Tabs.Panel>

        <Tabs.Panel value="googleForms" pt="xs">
          <CreateGoogleForm
            courseId={courseId}
            teamSetNames={teamSets.map(teamSet => teamSet.name)}
            onAssessmentCreated={onAssessmentCreated}
          />
        </Tabs.Panel>

        <Tabs.Panel value="googleCsv" pt="xs">
          <UploadGoogleCSV
            courseId={courseId}
            onAssessmentCreated={onAssessmentCreated}
          />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
};

export default CreateAssessmentForm;
