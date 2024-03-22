import {
  ActionIcon,
  Button,
  Card,
  Group,
  Select,
  Table,
  Text,
} from '@mantine/core';
import { JiraBoard } from '@shared/types/JiraData';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';
import { IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface TeamCardProps {
  teamId: string;
  number: number;
  members: User[];
  TA: User | null;
  teachingTeam: User[];
  teamData: TeamData | null;
  teamDataList: TeamData[];
  teamJiraBoard: JiraBoard | null;
  jiraBoardList: JiraBoard[];
  onUpdate: () => void;
  isEditing?: boolean;
}

const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  number,
  members,
  TA,
  teachingTeam,
  teamData,
  teamDataList,
  teamJiraBoard,
  jiraBoardList,
  onUpdate,
  isEditing,
}) => {
  const [selectedTA, setSelectedTA] = useState<string | null>(TA?._id || null);
  const [selectedTeamData, setSelectedTeamData] = useState<string | null>(null);
  const [selectedJiraBoard, setSelectedJiraBoard] = useState<string | null>(null);

  const apiRoute = `/api/teams/${teamId}`;

  useEffect(() => {
    setSelectedTA(TA?._id || null);
    setSelectedTeamData(teamData?._id || null);
    setSelectedJiraBoard(teamJiraBoard?._id || null);
  }, [TA]);

  const handleDeleteTeam = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Error deleting team:', response.statusText);
        return;
      }
      onUpdate();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const apiRouteRemoveMember = `${apiRoute}/members/${memberId}`;
      const response = await fetch(apiRouteRemoveMember, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Error removing member:', response.statusText);
        return;
      }
      onUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleTeamTAChange = async (TAId: string | null) => {
    try {
      const response = await fetch(apiRoute, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ TA: TAId }),
      });

      if (!response.ok) {
        console.error('Error updating team:', response.statusText);
        return;
      }
      setSelectedTA(TAId);
      onUpdate();
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleRepoNameChange = async (teamDataId: string | null) => {
    try {
      const response = await fetch(apiRoute, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamData: teamDataId }),
      });

      if (!response.ok) {
        console.error('Error updating team:', response.statusText);
        return;
      }
      setSelectedTeamData(teamDataId);
      onUpdate();
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleJiraProjectNameChange = async (jiraBoardId: string | null) => {
    try {
      const response = await fetch(apiRoute, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ board: jiraBoardId }),
      });

      if (!response.ok) {
        console.error('Error updating team:', response.statusText);
        return;
      }
      setSelectedJiraBoard(jiraBoardId);
      onUpdate();
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const taOptions = teachingTeam.map(user => ({
    value: user._id,
    label: user.name,
  }));

  const repoOptions = teamDataList.map(teamData => ({
    value: teamData._id,
    label: teamData.repoName,
  }));

  const jiraBoardOptions = jiraBoardList.map(jiraBoard => ({
    value: jiraBoard._id,
    label: jiraBoard.jiraLocation.name,
  }));

  const student_rows = members?.map(member => {
    return (
      <Table.Tr key={member._id}>
        <Table.Td style={{ textAlign: 'left' }}>{member.name}</Table.Td>
        <Table.Td style={{ textAlign: 'left' }}>{member.gitHandle}</Table.Td>
        {isEditing && (
          <Table.Td>
            <Button
              size="compact-xs"
              variant="light"
              color="red"
              onClick={() => handleRemoveMember(member._id)}
            >
              Remove
            </Button>
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
        }}
      >
        <Group mt="md" mb="xs">
          <Text> Team {number.toString()}</Text>
        </Group>
        {isEditing && (
          <ActionIcon
            variant="transparent"
            color="red"
            size="sm"
            onClick={handleDeleteTeam}
            title="Delete Team"
          >
            <IconX size={16} />
          </ActionIcon>
        )}
      </div>

      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        {isEditing ? (
          <Select
            data={taOptions}
            value={selectedTA}
            onChange={e => handleTeamTAChange(e)}
            placeholder="Assign TA"
          />
        ) : (
          <Text>{TA ? TA.name : 'None'}</Text>
        )}
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Repository:</Text>
        {isEditing ? (
          <Select
            data={repoOptions}
            value={selectedTeamData}
            onChange={e => handleRepoNameChange(e)}
            placeholder="Select Repository"
          />
        ) : (
          <Text>{teamData ? teamData.repoName : 'None'}</Text>
        )}
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Jira Project:</Text>
        {isEditing ? (
          <Select
            data={jiraBoardOptions}
            value={selectedJiraBoard}
            onChange={e => handleJiraProjectNameChange(e)}
            placeholder="Select Jira Project Name"
          />
        ) : (
          <Text>{teamJiraBoard ? teamJiraBoard.jiraLocation.name : 'None'}</Text>
        )}
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: 'left', width: '50%' }}>
              Name
            </Table.Th>
            <Table.Th style={{ textAlign: 'left', width: '30%' }}>
              Git Handle
            </Table.Th>
            <Table.Th style={{ textAlign: 'left', width: '20%' }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{student_rows}</Table.Tbody>
      </Table>
    </Card>
  );
};

export default TeamCard;
