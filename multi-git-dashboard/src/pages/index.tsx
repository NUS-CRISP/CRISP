import Link from 'next/link';
import RootLayout from '../components/RootLayout';

function Home() {
  return (
    <RootLayout>
      <h1>Welcome to CRISP</h1>
      <p>This is the index page.</p>
      
      <nav>
        <ul>
          <li>
            <Link href="/CreateCourse">
              Create Course
            </Link>
          </li>
          <li>
            <Link href="/GetGitHubStats">
              Get GitHub Stats
            </Link>
          </li>
        </ul>
      </nav>
    </RootLayout>
  );
}

export default Home;