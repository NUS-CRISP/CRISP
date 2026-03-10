import React, { useState } from 'react';
import { Group, Button, Menu, Text } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';

interface AddManualAssignmentBoxProps {
  assignedCount: number;
  dropdownOptions: { value: string; label: string }[];
  maxReviewsPerReviewer: number;
  reviewerId: string;
  addManualAssignment: (revieweeId: string, reviewerId: string) => void;
}

const AddManualAssignmentBox: React.FC<AddManualAssignmentBoxProps> = ({
  assignedCount,
  dropdownOptions,
  maxReviewsPerReviewer,
  reviewerId,
  addManualAssignment,
}) => {
  const [opened, setOpened] = useState(false);
  const isMaxReached = assignedCount >= maxReviewsPerReviewer;

  return (
    <Group>
      <Menu
        withinPortal
        position="bottom-end"
        opened={opened}
        onChange={setOpened}
      >
        <Menu.Target>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconUserPlus size={14} />}
            disabled={isMaxReached}
          >
            {isMaxReached ? 'Max reviews reached' : 'Assign'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {dropdownOptions.length === 0 ? (
            <Menu.Item disabled>
              <Text fz="sm" c="dimmed">
                No teams available
              </Text>
            </Menu.Item>
          ) : (
            dropdownOptions.map(option => (
              <Menu.Item
                key={option.value}
                onClick={() => {
                  addManualAssignment(option.value, reviewerId);
                  setOpened(false);
                }}
              >
                {option.label}
              </Menu.Item>
            ))
          )}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};

export default AddManualAssignmentBox;
