import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabase';

type User = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  roles: { id: string; name: string }[];
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type NewUser = {
  email: string;
  full_name: string;
  role_id: string;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    full_name: '',
    role_id: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch users
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            created_at,
            user_roles:user_roles (
              roles (
                id,
                name
              )
            )
          `);

        if (userError) throw userError;

        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Transform the data to match our User type
        const transformedUsers = userData?.map(user => ({
          ...user,
          roles: user.user_roles?.map((ur: any) => ur.roles) || []
        })) || [];

        setUsers(transformedUsers);
        setRoles(rolesData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch users'));
        console.error('Error fetching users:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role_id: roleId });

      if (insertError) throw insertError;

      // Update local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          const newRole = roles.find(r => r.id === roleId);
          return {
            ...user,
            roles: newRole ? [{ id: newRole.id, name: newRole.name }] : []
          };
        }
        return user;
      }));

      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.full_name || !newUser.role_id) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingUser(true);

      // Create auth user with email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: Math.random().toString(36).slice(-12), // Random password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role_id: newUser.role_id,
        });

      if (roleError) throw roleError;

      // Add to local state
      const newRole = roles.find(r => r.id === newUser.role_id);
      setUsers([...users, {
        ...profile,
        roles: newRole ? [{ id: newRole.id, name: newRole.name }] : []
      }]);

      toast({
        title: "Success",
        description: "User created successfully. They will receive an email to set their password.",
      });

      setIsAddUserOpen(false);
      setNewUser({ email: '', full_name: '', role_id: '' });
    } catch (err) {
      console.error('Error creating user:', err);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.roles.some(role => role.name.toLowerCase().includes(searchLower))
    );
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading users: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage users and their roles
          </p>
        </div>
        <Button 
          variant="default" 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddUserOpen(true)}
        >
          + Add User
        </Button>
      </div>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. The user will receive an email to set their password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role_id}
                onValueChange={(value) => setNewUser({ ...newUser, role_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingUser}
              >
                {isAddingUser ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border rounded-lg">
        <div className="p-4 border-b">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Name</TableHead>
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="font-medium">Role</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Created</TableHead>
                <TableHead className="font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow 
                  key={user.id}
                  className="hover:bg-muted/50"
                >
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.roles[0]?.id || ''}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span>Active</span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric'
                    }).replace(/\//g, '.')}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-auto p-0 text-blue-600 hover:text-blue-700 hover:bg-transparent"
                      onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
} 