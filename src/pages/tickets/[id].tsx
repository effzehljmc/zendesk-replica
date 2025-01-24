import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTicket } from '@/hooks/useTicket';
import { useAgents } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { TagSelector } from '@/components/ui/tag-selector';
import { TicketNotes } from '@/components/ticket/TicketNotes';
import { TicketRating } from '@/components/ticket/TicketRating';
import { TicketMessages } from '@/components/ticket/TicketMessages';
import { Tag } from '@/types/ticket';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ticket, isLoading, error, updateTicket } = useTicket(id!);
  const { agents, isLoading: agentsLoading } = useAgents();
  const { profile } = useAuth();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="p-6">Loading ticket...</div>;
  }

  if (error || !ticket) {
    return <div className="p-6">Error loading ticket: {error?.message || 'Ticket not found'}</div>;
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTicket({ status: newStatus as 'new' | 'open' | 'pending' | 'resolved' });
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await updateTicket({ priority: newPriority as 'low' | 'medium' | 'high' });
      toast({
        title: 'Success',
        description: 'Priority updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive',
      });
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    try {
      await updateTicket({ assigned_to_id: newAssigneeId === 'unassigned' ? null : newAssigneeId });
      toast({
        title: 'Success',
        description: 'Assignee updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update assignee',
        variant: 'destructive',
      });
    }
  };

  const handleTagsChange = async (newTags: Tag[]) => {
    try {
      await updateTicket({ tags: newTags.map(t => t.id) });
      toast({
        title: 'Success',
        description: 'Tags updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update tags',
        variant: 'destructive',
      });
    }
  };

  const isAdmin = profile?.roles?.some(r => r.name === 'admin');
  const isAgent = profile?.roles?.some(r => r.name === 'agent');
  const canManageTicket = isAdmin || isAgent;

  return (
    <div className="p-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/tickets")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tickets
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Ticket Details</h1>
        <h2 className="text-xl">{ticket.title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Status</div>
          {canManageTicket ? (
            <Select
              value={ticket.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge>{ticket.status}</Badge>
          )}
        </div>

        {canManageTicket && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Priority</div>
            <Select
              value={ticket.priority}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Assigned Agent</div>
          {canManageTicket ? (
            <Select
              value={ticket.assigned_to_id || 'unassigned'}
              onValueChange={handleAssigneeChange}
              disabled={agentsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div>{ticket.assigned_to?.full_name || 'Unassigned'}</div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {canManageTicket && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Tags</div>
            <TagSelector
              selectedTags={ticket.tags || []}
              onTagsChange={handleTagsChange}
              maxTags={3}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Customer</div>
          <div>{ticket.customer?.full_name} ({ticket.customer?.email})</div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Description</div>
          <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {ticket.status === 'resolved' && !isAdmin && !isAgent && (
          <div className="space-y-2">
            <TicketRating
              ticketId={ticket.id}
              currentRating={ticket.satisfaction_rating}
              onRatingSubmit={(rating) => {
                // Optimistically update the local ticket state
                updateTicket({ satisfaction_rating: rating });
              }}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Created</div>
          <div>{new Date(ticket.created_at).toLocaleString()}</div>
        </div>

        <div className="border-t pt-6">
          <TicketMessages ticketId={ticket.id} />
        </div>
        <div className="border-t pt-6">
          <TicketNotes ticketId={ticket.id} />
        </div>
      </div>
    </div>
  );
} 