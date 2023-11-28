import React, { useState } from 'react';
import { Box, Notification } from '@mantine/core';
import CSVUpload from './CSVUpload';

const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 3001;

interface ResultFormProps {
  assessmentId: string;
  onResultsUploaded: () => void;
}

const ResultForm: React.FC<ResultFormProps> = ({
  assessmentId,
  onResultsUploaded,
}) => {
  const [error, setError] = useState<string | null>(null);
  const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/assessments/${assessmentId}/results`;
  const csvTemplateHeaders = 'teamNumber,studentId,mark';

  return (
    <Box>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <CSVUpload
        templateHeaders={csvTemplateHeaders}
        onProcessComplete={onResultsUploaded}
        onError={setError}
        downloadFilename="results_template.csv"
        uploadButtonString="Upload Results"
        urlString={apiUrl}
      />
    </Box>
  );
};

export default ResultForm;
