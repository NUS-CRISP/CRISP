import React from 'react';
import Link from 'next/link';
import styles from "../styles/sidebar.module.css";

const Sidebar: React.FC = () => {
  return (
    <div className={styles.sidebar}>
      <nav>
        <ul>
          <li>
            <Link href="/">
              Home
            </Link>
          </li>
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
    </div>
  );
};

export default Sidebar;
