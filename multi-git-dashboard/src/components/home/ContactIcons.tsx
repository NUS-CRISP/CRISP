import { Box, Stack, Text, rem } from '@mantine/core';
import classes from '@styles/ContactIcons.module.css';
import { IconAt, IconMapPin, IconSun } from '@tabler/icons-react';

interface ContactIconProps
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  icon: typeof IconSun;
  title: React.ReactNode;
  description: React.ReactNode;
}

function ContactIcon({
  icon: Icon,
  title,
  description,
  ...others
}: ContactIconProps) {
  return (
    <div className={classes.wrapper} {...others}>
      <Box mr="md">
        <Icon style={{ width: rem(24), height: rem(24) }} />
      </Box>

      <div>
        <Text size="sm" className={classes.title}>
          {title}
        </Text>
        <Text className={classes.description}>{description}</Text>
      </div>
    </div>
  );
}

const data = [
  {
    title: 'Where to reach us',
    description: 'crisp.nus.2024@gmail.com',
    icon: IconAt,
  },
  {
    title: "Where we're based",
    description: 'NUS School of Computing',
    icon: IconMapPin,
  },
  {
    title: "When we're available",
    description: '9 a.m. – 5 p.m.',
    icon: IconSun,
  },
];

const ContactIcons: React.FC = () => {
  const items = data.map((item, index) => (
    <ContactIcon key={index} {...item} />
  ));
  return <Stack>{items}</Stack>;
};

export default ContactIcons;
