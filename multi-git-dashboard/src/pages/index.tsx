import Link from "next/link";

function Home() {
  return (
    <>
      <h1>Welcome to CRISP</h1>
      <p>This is the index page.</p>

      <nav>
        <ul>
          <li>
            <Link href="/courses">
              View Courses
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default Home;
