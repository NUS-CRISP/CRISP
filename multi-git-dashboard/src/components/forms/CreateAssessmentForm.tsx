import { Box, Tabs } from '@mantine/core';
import CreateGoogleForm from './CreateGoogleAssessmentForm';
import CreateInternalForm from './CreateInternalAssessmentForm';
import UploadGoogleCSV from './UploadGoogleAssessmentFormCsv';
import UploadInternalCSV from './UploadInternalAssessmentFormCsv';
import { User } from '@shared/types/User';

interface CreateAssessmentFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSetNames: string[];
  teachingTeam: User[];
}

const CreateAssessmentForm: React.FC<CreateAssessmentFormProps> = ({
  courseId,
  onAssessmentCreated,
  teamSetNames,
  teachingTeam,
}) => {
  return (
    <Box mx="auto">
      <Tabs defaultValue="internal">
        <Tabs.List>
          <Tabs.Tab value="internal">Internal Form</Tabs.Tab>
          <Tabs.Tab value="internalCsv">Internal CSV Upload</Tabs.Tab>
          <Tabs.Tab value="googleForms">Google Forms</Tabs.Tab>
          <Tabs.Tab value="googleCsv">Google Forms CSV Upload</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="internal" pt="xs">
          <CreateInternalForm
            courseId={courseId}
            teamSetNames={teamSetNames}
            teachingTeam={teachingTeam}
            onAssessmentCreated={onAssessmentCreated}
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
            teamSetNames={teamSetNames}
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
