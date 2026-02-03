import { IconGitBranch } from '@tabler/icons-react';

// CRISP Logo
const CrispLogo: React.FC<{ size?: number }> = ({ size = 46 }) => (
  <div
    style={{
      width: size,
      height: size,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 9999,
      background: 'linear-gradient(135deg,#A855F7,#22D3EE)',
      boxShadow: '0 8px 32px rgba(168,85,247,.25)',
    }}
  >
    <div
      style={{
        background: '#0f172a',
        borderRadius: 9999,
        width: size - 8,
        height: size - 8,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <IconGitBranch size={size - 16} />
    </div>
  </div>
);

export default CrispLogo;
