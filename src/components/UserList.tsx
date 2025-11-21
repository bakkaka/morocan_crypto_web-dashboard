import React, { useEffect, useState } from 'react';
import type { User } from '../types/User';
import { getUsers } from '../api/UserService';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();

        // Mapping pour correspondre au type TS
        const mappedUsers: User[] = data.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName || '',       // map fullName
          roles: u.roles || [],
          isVerified: u.isVerified ?? false,
          createdAt: u.createdAt || '',
          updatedAt: u.updatedAt || '',
          walletAddress: u.walletAddress,
          reputation: u.reputation,
        }));

        setUsers(mappedUsers);
      } catch (error) {
        console.error('Erreur lors du fetch des utilisateurs:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <h2>Liste des utilisateurs</h2>
      {users.length === 0 ? (
        <p>Aucun utilisateur trouvé</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.fullName} - {user.email} - Rôles: {user.roles.join(', ')} - {user.isVerified ? 'Vérifié' : 'Non vérifié'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;
