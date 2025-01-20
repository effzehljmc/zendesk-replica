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
import { useTicket } from '../../hooks/useTicket';
import { useAgents } from '../../hooks/useAgents';
import { useAuth } from '../../contexts/AuthContext';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ticket, isLoading, error, updateTicket } = useTicket(id!);
  const { agents, isLoading: agentsLoading } = useAgents();
  const { profile } = useAuth();

  if (isLoading) {
    return <div className="p-6">Loading ticket...</div>;
  }

  if (error || !ticket) {
    return <div className="p-6">Error loading ticket: {error?.message || 'Ticket not found'}</div>;
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTicket({ status: newStatus as 'new' | 'open' | 'in-progress' | 'resolved' });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await updateTicket({ priority: newPriority as 'low' | 'medium' | 'high' });
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    try {
      await updateTicket({ assigned_to_id: newAssigneeId === 'unassigned' ? null : newAssigneeId });
    } catch (err) {
      console.error('Failed to update assignee:', err);
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
        <h1 className="text-2xl font-bold mb-2">Ticket #{ticket.ticket_number}</h1>
        <h2 className="text-xl">{ticket.title}</h2>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="relative">
          <div className="text-sm text-gray-500 mb-2">Status</div>
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
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge>{ticket.status}</Badge>
          )}
        </div>

        <div className="relative">
          <div className="text-sm text-gray-500 mb-2">Priority</div>
          {canManageTicket ? (
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
              </SelectContent>
            </Select>
          ) : (
            <Badge>{ticket.priority}</Badge>
          )}
        </div>

        <div className="relative">
          <div className="text-sm text-gray-500 mb-2">Assigned To</div>
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
        <div>
          <div className="text-sm text-gray-500 mb-2">Customer</div>
          <div>{ticket.customer?.full_name} ({ticket.customer?.email})</div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-2">Description</div>
          <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-2">Created</div>
          <div>{new Date(ticket.created_at).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
} 