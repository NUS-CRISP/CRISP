import {
  Accordion,
  Center,
  Container,
  Loader,
  ScrollArea,
  Tabs,
  Group,
  Button,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Profile } from '@shared/types/Profile';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import PeerReviewAccordionItem from '../peer-review/PeerReviewAccordianItem';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import PeerReviewSettingsForm from '../forms/PeerReviewSettingsForm';

interface PeerReviewInfoProps {
  courseId: string;
  teamSets: TeamSet[];
  peerReview: PeerReview;
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string; // TeamData not populated
}

export type ProfileGetter = (gitHandle: string) => Promise<Profile>;

const PeerReviewInfo: React.FC<PeerReviewInfoProps> = ({
  courseId,
  teamSets,
  peerReview,
  hasFacultyPermission,
  onUpdate,
}) => {
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [openedSettingsForm, { open: openSettingsForm, close: closeSettingsForm }] = useDisclosure(false);
  const [openedDeleteModal, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});

  const [activeTab, setActiveTab] = useState<string | null>(
    teamSets ? teamSets[0]?.name : null
  );
  
  const deleteApiRoute = `/api/peer-review/${courseId}/${peerReview._id}`;

  const getTeams = async () => {
    const res = await fetch(`/api/teams/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch teams');
    const teams: Team[] = await res.json();
    return teams;
  };

  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  const setActiveTabAndSave = (tabName: string) => {
    onUpdate();
    setActiveTab(tabName);
    localStorage.setItem(`activeTeamSetTab_${courseId}`, tabName);
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(`activeTeamSetTab_${courseId}`);
    if (savedTab && teamSets.some(teamSet => teamSet.name === savedTab)) {
      setActiveTab(savedTab);
    }
  }, [teamSets]);

  const data = teamDatas.map(teamData => {
    const team = teams.find(team => team.teamData === teamData._id);
    return { team, teamData };
  });

  useEffect(() => {
    const fetchData = async () => {
      setStatus(Status.Loading);
      try {
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams);
        const fetchedTeamDatas = await getTeamDatas();
        setTeamDatas(fetchedTeamDatas);
        if (teamDatas.length > 0) setActiveTabAndSave(teamSets[0].name);
        setStatus(Status.Idle);
      } catch (error) {
        setStatus(Status.Error);
        console.error(error);
      }
    };
    fetchData();
  }, [courseId]);
  
  const handleDelete = async () => {
    try {
      const response = await fetch(deleteApiRoute, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Error deleting peer review:', response.statusText);
      }
      onUpdate();
    } catch (error) {
      console.error('Error deleting peer review:', error);
    }
  };    

  if (status === Status.Loading)
    return (
      <Center>
        <Container mt={40}>
          <Loader />
        </Container>
      </Center>
    );

  if (!teams.length)
    return <Center>No teams found.</Center>;

  const renderOverviewAccordion = () => {
    return (
      <Accordion
        defaultValue={teamDatas.length > 0 ? [teamDatas[0]._id] : []}
        multiple
        variant="separated"
      >
        {data.map(({ team, teamData }, idx) => (
          <PeerReviewAccordionItem
            key={teamData._id}
            team={team}
            teamData={teamData}
          />
        ))}
      </Accordion>
    )
  };

  return (
    <ScrollArea.Autosize mah={750} scrollbarSize={8}>
      <Tabs value={activeTab} style={{ paddingBottom: '20px' }}>
        {hasFacultyPermission && (
          <>
            <Group mb={16} mt={8} style={{ display: 'flex', flex: '1', justifyContent: 'flex-end' }} >
              <Button 
                onClick={openSettingsForm}
                color="blue"
                variant="outline"
                disabled={peerReview.status === "Completed"}
              >
                Update Peer Review Settings
              </Button>
              <Button 
                color='red'
                variant="outline"
                onClick={openDeleteModal}
                disabled={peerReview.status === "Completed"}
              >
                Delete Peer Review
              </Button>
            </Group>
            <Modal
              opened={openedSettingsForm}
              onClose={closeSettingsForm}
              title="Update Peer Review Settings"
            >
              <PeerReviewSettingsForm
                courseId={courseId} 
                peerReview={peerReview}
                onSetUpConfirmed={() => {
                  onUpdate();
                  closeSettingsForm();
                }}
              />
            </Modal>
          </>
        )}
        {hasFacultyPermission ? (
          <DeleteConfirmationModal
            opened={openedDeleteModal}
            onClose={closeDeleteModal}
            onCancel={closeDeleteModal}
            onConfirm={() => {
              handleDelete();
              onUpdate();
              closeDeleteModal();
            }}
            title="Delete Peer Review?"
            message={`Are you sure you want to delete this ${peerReview.status} Peer Review?`}
          />
        ) : null}
        {teamSets.map(teamSet => (
          <Tabs.Panel key={teamSet._id} value={teamSet.name}>
            {renderOverviewAccordion()}
          </Tabs.Panel>
        ))}
      </Tabs>
    </ScrollArea.Autosize>
  );
};

export default PeerReviewInfo;
