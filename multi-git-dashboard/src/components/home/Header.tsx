import { AppBar, Toolbar, Container, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { Button, useMantineTheme } from '@mantine/core';
import CrispLogo from '../shared/CrispLogo';

const Header: React.FC = () => {
  const router = useRouter();
  const theme = useMantineTheme();

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: 'black',
        boxShadow: 'none',
        padding: '20px 0',
        height: '100px',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            minHeight: '60px',
            padding: '0 16px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CrispLogo />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              key="user-guide"
              onClick={() => router.push('/user-guide')}
              color={theme.colors.green[9]}
              size="md"
              autoContrast
            >
              User Guide
            </Button>
            <Button
              key="dev-guide"
              onClick={() => router.push('/dev-guide')}
              color={theme.colors.green[9]}
              size="md"
              autoContrast
            >
              Dev Guide
            </Button>
            <Button
              key="signin"
              onClick={() => router.push('/auth/signin')}
              color={theme.colors.blue[9]}
              size="md"
              autoContrast
            >
              Sign in
            </Button>

            <Button
              key="getstarted"
              onClick={() => router.push('/auth/register')}
              color={theme.colors.blue[9]}
              size="md"
              autoContrast
            >
              Sign up
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
