import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'admin' | 'member';
  email?: string;
}

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  loading: boolean;
  createTeam: (name: string, description?: string) => Promise<Team>;
  updateTeam: (teamId: string, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  selectTeam: (teamId: string) => void;
  addTeamMember: (teamId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  removeTeamMember: (teamMemberId: string) => Promise<void>;
  updateTeamMemberRole: (teamMemberId: string, role: 'admin' | 'member') => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!currentUser) {
        setTeams([]);
        setCurrentTeam(null);
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get team memberships for current user
        const membershipQuery = query(
          collection(db, 'team_members'),
          where('userId', '==', currentUser.uid)
        );
        
        const membershipSnapshot = await getDocs(membershipQuery);
        const teamIds = membershipSnapshot.docs.map(doc => doc.data().teamId);
        
        if (teamIds.length === 0) {
          setTeams([]);
          setCurrentTeam(null);
          setTeamMembers([]);
          setLoading(false);
          return;
        }
        
        // Get team details
        const teamsQuery = query(
          collection(db, 'teams'),
          where('__name__', 'in', teamIds)
        );
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Team[];
        
        setTeams(teamsData);
        
        // Set current team (either from localStorage or first team)
        const storedTeamId = localStorage.getItem('currentTeamId');
        const teamToSelect = storedTeamId 
          ? teamsData.find(team => team.id === storedTeamId) || teamsData[0]
          : teamsData[0];
          
        if (teamToSelect) {
          setCurrentTeam(teamToSelect);
          localStorage.setItem('currentTeamId', teamToSelect.id);
          
          // Load team members for current team
          await loadTeamMembers(teamToSelect.id);
        }
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [currentUser]);

  const loadTeamMembers = async (teamId: string) => {
    try {
      const membersQuery = query(
        collection(db, 'team_members'),
        where('teamId', '==', teamId)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamMember[];
      
      setTeamMembers(membersData);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const createTeam = async (name: string, description?: string): Promise<Team> => {
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
      // Create the team
      const teamRef = await addDoc(collection(db, 'teams'), {
        name,
        description,
        createdAt: new Date()
      });
      
      // Add current user as admin
      await addDoc(collection(db, 'team_members'), {
        teamId: teamRef.id,
        userId: currentUser.uid,
        role: 'admin',
        email: currentUser.email,
        createdAt: new Date()
      });
      
      const newTeam = { id: teamRef.id, name, description };
      
      // Update state
      setTeams(prevTeams => [...prevTeams, newTeam]);
      setCurrentTeam(newTeam);
      localStorage.setItem('currentTeamId', newTeam.id);
      
      // Load team members
      await loadTeamMembers(newTeam.id);
      
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  };

  const updateTeam = async (teamId: string, name: string, description?: string): Promise<void> => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, { name, description });
      
      // Update state
      setTeams(prevTeams => 
        prevTeams.map(team => 
          team.id === teamId ? { ...team, name, description } : team
        )
      );
      
      if (currentTeam?.id === teamId) {
        setCurrentTeam(prev => prev ? { ...prev, name, description } : null);
      }
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  };

  const deleteTeam = async (teamId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      
      // Update state
      setTeams(prevTeams => prevTeams.filter(team => team.id !== teamId));
      
      if (currentTeam?.id === teamId) {
        const newCurrentTeam = teams.find(team => team.id !== teamId) || null;
        setCurrentTeam(newCurrentTeam);
        
        if (newCurrentTeam) {
          localStorage.setItem('currentTeamId', newCurrentTeam.id);
          await loadTeamMembers(newCurrentTeam.id);
        } else {
          localStorage.removeItem('currentTeamId');
          setTeamMembers([]);
        }
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  };

  const selectTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      localStorage.setItem('currentTeamId', team.id);
      await loadTeamMembers(team.id);
    }
  };

  const addTeamMember = async (teamId: string, email: string, role: 'admin' | 'member'): Promise<void> => {
    try {
      // In a real application, you would:
      // 1. Check if the user exists in your system
      // 2. Get their userId
      // 3. Add them to the team
      
      // For this example, we'll just create a placeholder
      // In a real app, you would implement an invitation system
      await addDoc(collection(db, 'team_members'), {
        teamId,
        email,
        role,
        createdAt: new Date(),
        pending: true
      });
      
      // Reload team members
      await loadTeamMembers(teamId);
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  };

  const removeTeamMember = async (teamMemberId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'team_members', teamMemberId));
      
      // Update state
      setTeamMembers(prevMembers => 
        prevMembers.filter(member => member.id !== teamMemberId)
      );
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  };

  const updateTeamMemberRole = async (teamMemberId: string, role: 'admin' | 'member'): Promise<void> => {
    try {
      const memberRef = doc(db, 'team_members', teamMemberId);
      await updateDoc(memberRef, { role });
      
      // Update state
      setTeamMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === teamMemberId ? { ...member, role } : member
        )
      );
    } catch (error) {
      console.error('Error updating team member role:', error);
      throw error;
    }
  };

  const value = {
    teams,
    currentTeam,
    teamMembers,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberRole
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};
