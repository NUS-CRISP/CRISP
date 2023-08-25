import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import styles from "../styles/root-layout.module.css"

interface RootLayoutProps {
  children: ReactNode;
}

class RootLayout extends React.Component<RootLayoutProps> {
  render() {
    const { children } = this.props;

    return (
      <div className={styles.rootLayout}>
        <Sidebar />
        <div className={styles.content}>{children}</div>
      </div>
    );
  }
}

export default RootLayout;
