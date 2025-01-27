import { useState } from 'react';
import { Notification } from '@mantine/core';
import CSVUpload from '../csv/CSVUpload';

interface UploadGoogleCSVProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
}

const UploadGoogleCSV: React.FC<UploadGoogleCSVProps> = ({
  courseId,
  onAssessmentCreated,
}) => {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <CSVUpload
        headers={[
          'assessmentType',
          'markType',
          'frequency',
          'teamSetName',
          'formLink',
          'sheetID',
          'sheetTab',
        ]}
        onProcessComplete={onAssessmentCreated}
        onError={setError}
        filename="google_assessment_template.csv"
        uploadButtonString="Upload Google Assessments"
        urlString={`/api/courses/${courseId}/assessments`}
      />
    </>
  );
};

export default UploadGoogleCSV;
