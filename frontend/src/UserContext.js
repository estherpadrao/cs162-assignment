import { createContext, useContext } from 'react';

/**
 * React context that makes { user, setUser, api } available to any component
 * in the tree without having to pass props manually.
 *
 * Provided by App.js and consumed via the useUser hook below.
 */
const UserContext = createContext(null);

/**
 * Convenience hook for consuming UserContext.
 *
 * Must be called inside a component that is a descendant of the
 * UserContext.Provider in App.js.
 *
 * @param {void}
 * @returns {{ user: object|null, setUser: function, api: ApiClient }}
 */
export const useUser = () => useContext(UserContext);

export default UserContext;
