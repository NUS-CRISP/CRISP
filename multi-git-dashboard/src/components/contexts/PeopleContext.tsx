import React, { createContext, useContext, useState } from 'react';

interface PeopleContextType {
  reload: boolean;
  setReload: (People: boolean) => void;
}

const PeopleContext = createContext<PeopleContextType>({
  reload: false,
  setReload: () => {},
});

export const usePeopleContext = () => useContext(PeopleContext);

export const PeopleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [reload, setReload] = useState(false);

  return (
    <PeopleContext.Provider value={{ reload, setReload }}>
      {children}
    </PeopleContext.Provider>
  );
};
