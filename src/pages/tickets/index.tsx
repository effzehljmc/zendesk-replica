import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/hooks/useTickets";
import { useTags } from "@/hooks/useTags";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag as TagComponent } from "@/components/ui/tag";
import { Tag, TicketStatus, TicketPriority } from "@/types/ticket";

const statusColors: Record<TicketStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-gray-100 text-gray-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
  urgent: "bg-red-100 text-red-800",
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const { tickets, isLoading } = useTickets();
  const { tags } = useTags();

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toString().includes(searchQuery) ||
      ticket.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesTag = tagFilter === "all" || ticket.tags?.some(tag => tag.id === tagFilter);

    return matchesSearch && matchesStatus && matchesPriority && matchesTag;
  });

  useEffect(() => {
    filteredTickets.forEach(ticket => {
      console.log('Rendering tags for ticket:', ticket.id, ticket.tags);
      ticket.tags?.forEach(tag => {
        console.log('Rendering tag:', tag);
      });
    });
  }, [filteredTickets]);

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Manage support tickets and track their status</p>
        </div>
        <Button onClick={() => navigate("/tickets/create")}>
          + Create Ticket
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium">Ticket</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Priority</th>
              <th className="text-left p-4 font-medium">Tags</th>
              <th className="text-left p-4 font-medium">Created</th>
              <th className="text-left p-4 font-medium">Assigned To</th>
              <th className="text-left p-4 font-medium">Customer</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <td className="p-4">
                  <div className="font-medium">{ticket.title}</div>
                  <div className="text-sm text-muted-foreground">#{ticket.ticket_number}</div>
                </td>
                <td className="p-4">
                  <Badge className={statusColors[ticket.status as TicketStatus]}>
                    {ticket.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge className={priorityColors[ticket.priority as TicketPriority]}>
                    {ticket.priority}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags?.map((tag: Tag) => (
                      <TagComponent key={tag.id} tag={tag} interactive={false} />
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 text-sm">
                  {ticket.assigned_to?.full_name || 'Unassigned'}
                </td>
                <td className="p-4 text-sm">
                  {ticket.customer?.full_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 