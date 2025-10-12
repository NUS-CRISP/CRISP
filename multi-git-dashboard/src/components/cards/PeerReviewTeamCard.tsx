// import {
//   ActionIcon,
//   Button,
//   Card,
//   Group,
//   Select,
//   Table,
//   Text,
// } from '@mantine/core';
// import { JiraBoard } from '@shared/types/JiraData';
// import { TeamData } from '@shared/types/TeamData';
// import { User } from '@shared/types/User';

// interface PeerReviewTeamCardProps {
//   members: User[];
//   TA: User | null;
//   onUpdate: () => void;
// }

// const PeerReviewTeamCard: React.FC<PeerReviewTeamCardProps> = ({
//   members,
//   TA,
// }) => {
//   const assignedPeerReviewApiRoute = `/api/peerreviews/assignedreviews`;

//   const getAssignedPeerReviews = (member_id: string) => {
//     // TODO: Implement logic to fetch assigned peer reviews for the member
//   };

//   const student_rows = members?.map(member => {
//     // Fetch assigned peer reviews for the member
//     const assignedPeerReviews = getAssignedPeerReviews(member._id);

//     return (
//       <Table.Tr key={member._id}>
//         <Table.Td style={{ textAlign: 'left' }}>{member.name}</Table.Td>
//         <Table.Td style={{ textAlign: 'left' }}>{member.gitHandle}</Table.Td>
//         <Table.Td style={{ textAlign: 'left' }}>
//           {/* Display assigned peer reviews here */}
//           {/* Example: {getAssignedPeerReviews(member._id).join(', ')} */}
//         </Table.Td>
//       </Table.Tr>
//     );
//   });

//   return (
//     <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
//       <Group
//         style={{
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'flex-start',
//           gap: '2px',
//           marginBottom: '16px',
//           borderBottom: '1px solid #c0c0c0',
//           paddingBottom: '12px',
//         }}
//       >
//         <Text>
//           Teaching Assistant: <strong>{TA ? TA.name : 'None'}</strong>
//         </Text>
//       </Group>
//       <Table>
//         <Table.Thead>
//           <Table.Tr>
//             <Table.Th style={{ textAlign: 'left', width: '30%' }}>
//               Name
//             </Table.Th>
//             <Table.Th style={{ textAlign: 'left', width: '30%' }}>
//               Git Handle
//             </Table.Th>
//             <Table.Th style={{ textAlign: 'left', width: '30%' }}>
//               Assigned Peer Reviews
//             </Table.Th>
//           </Table.Tr>
//         </Table.Thead>
//         <Table.Tbody>{student_rows}</Table.Tbody>
//       </Table>
//     </Card>
//   );
// };

// export default PeerReviewTeamCard;
