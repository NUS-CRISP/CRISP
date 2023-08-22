import React from 'react';
import Link from 'next/link';
import styles from '../styles/Sidebar.module.css';

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
    </div>
  );
};

export default Sidebar;
