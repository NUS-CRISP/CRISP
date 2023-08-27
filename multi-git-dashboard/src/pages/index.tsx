import Link from 'next/link';

function Home() {
  return (
    <>
      <h1>Welcome to CRISP</h1>
      <p>This is the index page.</p>
      
      <nav>
        <ul>
          <li>
            <Link href="/view-courses">
              View Courses
            </Link>
          </li>
          <li>
            <Link href="/create-course">
              Create Course
            </Link>
          </li>
          <li>
            <Link href="/repo-stats">
              Get GitHub Stats
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default Home;