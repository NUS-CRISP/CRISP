import Sidebar from "./Sidebar";
import styles from "../styles/root-layout.module.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.rootLayout}>
      <Sidebar />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
