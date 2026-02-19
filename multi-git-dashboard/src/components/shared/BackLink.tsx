import { Anchor } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import pageLayout from '@/styles/root-layout.module.css';

interface BackLinkProps {
  href: string;
  label: string;
}

export default function BackLink({ href, label }: BackLinkProps) {
  return (
    <Anchor component={Link} href={href} className={pageLayout.backLink}>
      <IconArrowLeft size={14} style={{ flexShrink: 0 }} />
      Back to {label}
    </Anchor>
  );
}
