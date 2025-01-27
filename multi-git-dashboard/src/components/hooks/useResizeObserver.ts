import { useEffect, useState, RefObject } from 'react';

const useResizeObserver = <T extends HTMLElement>(
  ref: RefObject<T>
): number | undefined => {
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return height;
};

export default useResizeObserver;
