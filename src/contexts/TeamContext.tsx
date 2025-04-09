import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

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
  pending?: boolean;
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
  checkUserExists: (email: string) => Promise<boolean>;
  acceptTeamInvitation: (teamMemberId: string) => Promise<void>;
  pendingInvitations: TeamMember[];
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
  const [pendingInvitations, setPendingInvitations] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!currentUser) {
        setTeams([]);
        setCurrentTeam(null);
        setTeamMembers([]);
        setPendingInvitations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get team memberships for current user by userId
        const membershipByIdQuery = query(
          collection(db, 'team_members'),
          where('userId', '==', currentUser.uid)
        );
        
        // Get team memberships for current user by email
        const membershipByEmailQuery = query(
          collection(db, 'team_members'),
          where('email', '==', currentUser.email?.toLowerCase())
        );
        
        const [membershipByIdSnapshot, membershipByEmailSnapshot] = await Promise.all([
          getDocs(membershipByIdQuery),
          getDocs(membershipByEmailQuery)
        ]);
        
        // Combine results and remove duplicates
        const membershipDocs = [...membershipByIdSnapshot.docs, ...membershipByEmailSnapshot.docs];
        const uniqueTeamIds = Array.from(new Set(membershipDocs.map(doc => doc.data().teamId)));
        
        // Process pending invitations
        const pendingInvites = membershipByEmailSnapshot.docs
          .filter(doc => doc.data().pending === true)
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TeamMember[];
        
        setPendingInvitations(pendingInvites);
        
        if (uniqueTeamIds.length === 0) {
          setTeams([]);
          setCurrentTeam(null);
          setTeamMembers([]);
          setLoading(false);
          return;
        }
        
        // Get team details
        const teamsQuery = query(
          collection(db, 'teams'),
          where('__name__', 'in', uniqueTeamIds)
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

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      // First try to find the user in the users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase())
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        return true;
      }
      
      // If not found in users collection, check team_members collection
      // This handles cases where the user might have been invited before
      const membersQuery = query(
        collection(db, 'team_members'),
        where('email', '==', email.toLowerCase())
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      
      if (!membersSnapshot.empty) {
        return true;
      }
      
      // As a fallback, try Firebase Auth methods (though this may have limitations)
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          return true;
        }
      } catch (authError) {
        console.log('Auth check failed, continuing with other checks:', authError);
      }
      
      // If we're in development mode, allow all emails for testing
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Development mode: allowing all emails for testing');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      // In case of error, we'll allow the operation to proceed
      // This prevents blocking legitimate users due to technical issues
      return true;
    }
  };

  const addTeamMember = async (teamId: string, email: string, role: 'admin' | 'member'): Promise<void> => {
    try {
      // Check if the user is already a member of this team
      const memberQuery = query(
        collection(db, 'team_members'),
        where('teamId', '==', teamId),
        where('email', '==', email.toLowerCase())
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        throw new Error('This user is already a member of this team.');
      }
      
      // Get user ID from email (if possible)
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase())
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      let userId = '';
      
      if (!usersSnapshot.empty) {
        userId = usersSnapshot.docs[0].id;
      }
      
      // Add the team member
      await addDoc(collection(db, 'team_members'), {
        teamId,
        email: email.toLowerCase(),
        userId,
        role,
        createdAt: new Date(),
        pending: userId === '' // Mark as pending if we couldn't find the user ID
      });
      
      // Reload team members
      await loadTeamMembers(teamId);
    } catch (error: any) {
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

  const acceptTeamInvitation = async (teamMemberId: string): Promise<void> => {
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
      const memberRef = doc(db, 'team_members', teamMemberId);
      await updateDoc(memberRef, { 
        userId: currentUser.uid,
        pending: false
      });
      
      // Update pending invitations list
      setPendingInvitations(prev => prev.filter(invite => invite.id !== teamMemberId));
      
      // Reload teams to include the newly accepted team
      const memberDoc = await getDoc(memberRef);
      if (memberDoc.exists()) {
        const teamId = memberDoc.data().teamId;
        
        // Get team details
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
          
          // Add to teams list if not already there
          setTeams(prev => {
            if (prev.some(t => t.id === teamId)) return prev;
            return [...prev, teamData];
          });
        }
      }
    } catch (error) {
      console.error('Error accepting team invitation:', error);
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
    updateTeamMemberRole,
    checkUserExists,
    acceptTeamInvitation,
    pendingInvitations
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};
