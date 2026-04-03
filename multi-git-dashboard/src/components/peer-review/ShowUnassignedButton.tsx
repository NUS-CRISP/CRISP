import { Button } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

interface ShowUnassignedButtonProps {
  peerReviewId: string;
  courseId: string;
  onFilterChange: (showUnassignedOnly: boolean) => void;
}

const ShowUnassignedButton: React.FC<ShowUnassignedButtonProps> = ({
  peerReviewId,
  courseId,
  onFilterChange,
}) => {
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);

  useEffect(() => {
    fetchUnassignedCount();
  }, []);

  const fetchUnassignedCount = async () => {
    try {
      const response = await fetch(
        `/api/peer-review/${courseId}/${peerReviewId}/unassigned-reviewers`,
        { method: 'GET' }
      );
      if (response.ok) {
        const data = await response.json();
        setUnassignedCount(data.unassignedCount || 0);
      }
    } catch (err) {
      console.error('Error fetching unassigned count:', err);
    }
  };

  const handleToggleFilter = () => {
    const newValue = !showUnassignedOnly;
    setShowUnassignedOnly(newValue);
    onFilterChange(newValue);
  };

  return (
    <Button
      onClick={handleToggleFilter}
      variant={showUnassignedOnly ? 'filled' : 'light'}
      color={
        showUnassignedOnly ? 'yellow' : unassignedCount > 0 ? 'orange' : 'gray'
      }
      leftSection={
        showUnassignedOnly ? <IconEyeOff size={18} /> : <IconEye size={18} />
      }
    >
      {showUnassignedOnly ? 'Show All' : 'Show Unassigned'}
    </Button>
  );
};

export default ShowUnassignedButton;
