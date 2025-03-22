import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { IconGitBranch } from '@tabler/icons-react';
import classes from '@styles/Home.module.css';
import { Button, useMantineTheme } from '@mantine/core';

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
            <IconGitBranch
              size={36}
              className={classes.headerIcon}
              stroke={2}
              color="white"
            />

            <Typography
              variant="h5"
              component="a"
              href="#"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                ml: 1.5,
                textDecoration: 'none',
                letterSpacing: '0.5px',
                fontSize: '1.5rem',
              }}
            >
              CRISP
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
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
