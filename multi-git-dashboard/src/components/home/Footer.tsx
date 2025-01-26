import { IconBrandInstagram, IconBrandTwitter, IconBrandYoutube } from '@tabler/icons-react';
import { ActionIcon, Container, Group } from '@mantine/core';
import { IconChevronDown, IconGitBranch } from '@tabler/icons-react';
import classes from '@styles/Footer.module.css';
import { Text } from '@mantine/core';

const Footer: React.FC = () => {
    return (
        <div className={classes.footer}>
            <Container className={classes.inner}>
                <Group>
                    <IconGitBranch size={50} className={classes.headerIcon} />
                    <Text style={{ color: 'black' }}>CRISP</Text>
                </Group>

                <Group gap={0} className={classes.links} justify="flex-end" wrap="nowrap">
                    <ActionIcon size="lg" color="gray" variant="subtle">
                        <IconBrandTwitter size={18} stroke={1.5} />
                    </ActionIcon>
                    <ActionIcon size="lg" color="gray" variant="subtle">
                        <IconBrandYoutube size={18} stroke={1.5} />
                    </ActionIcon>
                    <ActionIcon size="lg" color="gray" variant="subtle">
                        <IconBrandInstagram size={18} stroke={1.5} />
                    </ActionIcon>
                </Group>
            </Container>
        </div>
    );
}

export default Footer;