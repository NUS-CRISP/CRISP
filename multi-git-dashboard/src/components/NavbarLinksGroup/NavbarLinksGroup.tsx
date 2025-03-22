// import { useState } from 'react';
// import { IconCalendarStats, IconChevronRight } from '@tabler/icons-react';
// import { Box, Collapse, Group, Text, UnstyledButton } from '@mantine/core';
// import classes from './NavbarLinksGroup.module.css';

// interface LinksGroupProps {
//   label: string;
//   initiallyOpened?: boolean;
//   links?: { label: string; link: string; disabled?: boolean }[];
//   renderLink?: (link: {
//     label: string;
//     link: string;
//     disabled?: boolean;
//   }) => React.ReactNode;
// }

// export function LinksGroup({
//   label,
//   initiallyOpened,
//   links,
//   renderLink,
// }: LinksGroupProps) {
//   const hasLinks = Array.isArray(links);
//   const [opened, setOpened] = useState(initiallyOpened || false);

//   const items = (hasLinks ? links : []).map(link =>
//     renderLink ? ( // ✅ Use `renderLink` if provided
//       renderLink(link)
//     ) : (
//       <Text<'a'>
//         component="a"
//         className={classes.link}
//         href={link.link}
//         key={link.label}
//         onClick={event => event.preventDefault()}
//       >
//         {link.label}
//       </Text>
//     )
//   );

//   return (
//     <>
//       <UnstyledButton
//         onClick={() => setOpened(o => !o)}
//         className={classes.control}
//       >
//         <Group justify="space-between" gap={0}>
//           {/* <ThemeIcon variant="light" size={30}>
//                 <Icon size={18} />
//               </ThemeIcon> */}
//           <Box ml="md">{label}</Box>

//           {hasLinks && (
//             <IconChevronRight
//               className={classes.chevron}
//               stroke={1.5}
//               size={16}
//               style={{ transform: opened ? 'rotate(-90deg)' : 'none' }}
//             />
//           )}
//         </Group>
//       </UnstyledButton>
//       {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
//     </>
//   );
// }

// const mockdata = {
//   label: 'Releases',
//   icon: IconCalendarStats,
//   links: [
//     { label: 'Upcoming releases', link: '/' },
//     { label: 'Previous releases', link: '/' },
//     { label: 'Releases schedule', link: '/' },
//   ],
// };

// export function NavbarLinksGroup() {
//   return (
//     <Box mih={220} p="md">
//       <LinksGroup {...mockdata} />
//     </Box>
//   );
// }
