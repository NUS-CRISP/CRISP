import { Box, Button, Group, Text, Title } from '@mantine/core';
import Role from '@shared/types/auth/Role';
import classes from '@styles/Home.module.css';
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

const Hero: React.FC = () => {
  const router = useRouter();
  return (
    <Box style={{
      // backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8&auto=format&fit=crop&w=1080&q=80')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      textAlign: 'center',
      height: '500px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px 20px',
    }}>
      <div className={classes.content}>
        <Title style={{paddingLeft:'150px'}}>
        <Text className={classes.title} style={{ fontWeight: 700, color: 'white', fontFamily: 'Verdana', marginTop:'100px'}}>Better Code</Text>
          <br /> 
          <Text className={classes.title} style={{ fontWeight: 700, color: 'white', fontFamily: 'Verdana'}}>Smarter Reviews</Text> 
          <br />
          <Text className={classes.title} style={{ fontWeight: 700, color: 'white', fontFamily: 'Verdana'}}>     Stronger Teams</Text>
      
        </Title>

        <Group className={classes.controls}  mt="xl">
          <Button
            size="xl"
            style={{ backgroundColor: '#3B82F6', color: 'white', fontWeight: 'bold', padding: '12px 24px', borderRadius: '8px', marginLeft: '270px' }}
            onClick={() => router.push('/auth/register')}
            rightSection={<IconArrowRight size={20} className={classes.arrow} />}
          >
            Get Started
          </Button>
        </Group>
      </div>
    </Box>
  );
};

export default Hero;
