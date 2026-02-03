import React from 'react';
import { Badge } from '@mantine/core';

export type SaveState = 'Idle' | 'Saving' | 'Saved' | 'Error';

type SaveStateBadgeProps = {
  canEdit: boolean;
  saveState: SaveState;
};

const SaveStateBadge: React.FC<SaveStateBadgeProps> = ({ canEdit, saveState }) => {
  if (!canEdit) return null;
  
  if (saveState === 'Saving') {
    return (
      <Badge
        variant="light"
        radius="md"
        size="lg"
        color="gray"
      >
        Saving...
      </Badge>
    )
  }
  
  if (saveState === 'Saved') {
    return (
      <Badge
        variant="light"
        radius="md"
        size="lg"
        color="teal"
      >
        All Changes Saved
      </Badge>
    )
  }
  
  if (saveState === 'Error') {
    return (
      <Badge
        variant="light"
        radius="md"
        size="lg"
        color="red"
      >
        Error Saving Changes
      </Badge>
    )
  }
  
  return null;
};

export default SaveStateBadge;
