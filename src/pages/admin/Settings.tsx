import { useState } from 'react';
import { useSettings, SystemSetting } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AdminSettings() {
  const { settings, loading, error, updateSetting, createSetting, deleteSetting } = useSettings();
  const [newSetting, setNewSetting] = useState({ key: '', value: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSetting(
        newSetting.key,
        JSON.parse(newSetting.value),
        newSetting.description
      );
      setNewSetting({ key: '', value: '', description: '' });
    } catch (err) {
      console.error('Failed to create setting:', err);
    }
  };

  const handleUpdate = async (setting: SystemSetting) => {
    try {
      await updateSetting(setting.key, JSON.parse(editValue));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const handleDelete = async (key: string) => {
    if (window.confirm('Are you sure you want to delete this setting?')) {
      try {
        await deleteSetting(key);
      } catch (err) {
        console.error('Failed to delete setting:', err);
      }
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading settings: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Settings</h1>
      </div>

      {/* Create New Setting */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Setting</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={newSetting.key}
                onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                placeholder="setting.key"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value (JSON)</Label>
              <Input
                id="value"
                value={newSetting.value}
                onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                placeholder='{"value": true}'
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newSetting.description}
                onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                placeholder="Setting description"
              />
            </div>
          </div>
          <Button type="submit" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Setting
          </Button>
        </form>
      </Card>

      {/* Settings List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Current Settings</h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-medium">{setting.key}</TableCell>
                  <TableCell>
                    {editingId === setting.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-[200px]"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(setting)}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <code
                        className="px-2 py-1 bg-muted rounded cursor-pointer"
                        onClick={() => {
                          setEditingId(setting.id);
                          setEditValue(JSON.stringify(setting.value));
                        }}
                      >
                        {JSON.stringify(setting.value)}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>{setting.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(setting.updated_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(setting.key)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
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