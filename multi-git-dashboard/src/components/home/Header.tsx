import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { IconChevronDown, IconGitBranch } from '@tabler/icons-react';
import classes from '@styles/Home.module.css';


const Header: React.FC = () => {
  const router = useRouter();

  return (
    <AppBar position="fixed" sx={{ backgroundColor: 'black', padding: '10px 0' }}>
      <Container maxWidth="lg">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconGitBranch size={40} className={classes.headerIcon} />
            <Typography variant="h6" component="a" href="#" sx={{ color: 'white', fontWeight: 'bold', ml: 2, textDecoration: 'none' }}>
              CRISP
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Button color="inherit" sx={{ fontWeight: 'bold' }} href="#">
              About
            </Button>
            <Button color="inherit" sx={{ fontWeight: 'bold' }} href="#">
              Features
            </Button>
          </Box>

          {/* Login Button */}
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#4B7048',
              color: 'white',
              borderRadius: '8px',
              padding: '8px 16px',
              '&:hover': { backgroundColor: '#3a5c38' },
            }}
            onClick={() => router.push('/auth/signin')}
          >
            Login
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
