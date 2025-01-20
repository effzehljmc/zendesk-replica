import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserDetails = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
  roles: { id: string; name: string }[];
  ticket_count: number;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user details
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select(`
            id,
            auth_user_id,
            full_name,
            email,
            created_at,
            updated_at,
            user_roles (
              roles (
                id,
                name
              )
            )
          `)
          .eq('id', id)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('User not found');

        // Fetch ticket count
        const { count: ticketCount, error: ticketError } = await supabase
          .from('tickets')
          .select('*', { count: 'exact' })
          .eq('created_by', id);

        if (ticketError) throw ticketError;

        // Fetch available roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*');

        if (rolesError) throw rolesError;

        setUser({
          ...userData,
          roles: userData.user_roles.map((ur: any) => ur.roles),
          ticket_count: ticketCount || 0,
        });
        setRoles(rolesData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user details'));
        console.error('Error fetching user details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleRoleChange = async (roleId: string) => {
    try {
      setIsUpdating(true);

      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: id, role_id: roleId });

      if (insertError) throw insertError;

      // Update local state
      const newRole = roles.find(r => r.id === roleId);
      if (user && newRole) {
        setUser({
          ...user,
          roles: [{ id: newRole.id, name: newRole.name }]
        });
      }

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
    } finally {
      setIsUpdating(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
          <h1 className="text-3xl font-bold">User Details</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/admin/users/${id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit User
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : user ? (
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="grid gap-4">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Name</h2>
                <p className="text-lg">{user.full_name || 'N/A'}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Email</h2>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Role</h2>
                <div className="flex items-center gap-4 mt-1">
                  <Select
                    value={user.roles[0]?.id || ''}
                    onValueChange={handleRoleChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-[200px]">
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
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Information</h2>
            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Current Role</h3>
                <Badge variant="secondary" className="mt-1">
                  {user.roles[0]?.name || 'No Role'}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tickets Created</h3>
                <p>{user.ticket_count}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Account Created</h3>
                <p>{new Date(user.created_at).toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                <p>{new Date(user.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
} 