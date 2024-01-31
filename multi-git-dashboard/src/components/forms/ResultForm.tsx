import apiBaseUrl from '@/lib/api-config';
import { Box, Notification } from '@mantine/core';
import React, { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface ResultFormProps {
  assessmentId: string;
  onResultsUploaded: () => void;
}

const ResultForm: React.FC<ResultFormProps> = ({
  assessmentId,
  onResultsUploaded,
}) => {
  const [error, setError] = useState<string | null>(null);
  const apiUrl = apiBaseUrl + `/assessments/${assessmentId}/results`;
  const csvTemplateHeaders = ['teamNumber', 'studentId', 'mark'];

  return (
    <Box>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onResultsUploaded}
        onError={setError}
        filename="results_template.csv"
        uploadButtonString="Upload Results"
        urlString={apiUrl}
      />
    </Box>
  );
};

export default ResultForm;
