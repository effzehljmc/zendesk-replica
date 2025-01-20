import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';

type UserDetails = {
  id: string;
  full_name: string;
  email: string;
  roles: { id: string; name: string }[];
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

export default function UserEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
            full_name,
            email,
            user_roles!inner (
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

        // Fetch all available roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*');

        if (rolesError) throw rolesError;

        setUser({
          ...userData,
          roles: userData.user_roles.map((ur: any) => ur.roles)
        });
        setRoles(rolesData);
        setSelectedRoles(userData.user_roles.map((ur: any) => ur.roles.id));

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user details'));
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSaving(true);
      setError(null);

      // Update profile information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: user.full_name,
          email: user.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update roles
      // First, delete all existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Then insert new roles
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(
          selectedRoles.map(roleId => ({
            user_id: user.id,
            role_id: roleId,
          }))
        );

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      navigate(`/admin/users/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update user'));
      console.error('Error updating user:', err);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
            onClick={() => navigate(`/admin/users/${id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to User Details
          </Button>
          <h1 className="text-3xl font-bold">Edit User</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : user ? (
        <form onSubmit={handleSubmit}>
          <Card className="p-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={user.full_name}
                  onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Roles</Label>
                <Select
                  value={selectedRoles[0]}
                  onValueChange={(value) => setSelectedRoles([value])}
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="flex items-center gap-2"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      ) : null}
    </div>
  );
} 