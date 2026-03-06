import { createContext, useContext } from 'react';

// Provides { user, setUser, api } throughout the component tree
const UserContext = createContext(null);

export const useUser = () => useContext(UserContext);

export default UserContext;
