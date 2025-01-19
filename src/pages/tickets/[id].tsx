import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// Reuse the mock data and color mappings from the list page
const tickets = [
  {
    id: "TICK-1234",
    title: "Cannot access my account",
    status: "open",
    priority: "high",
    createdAt: "2024-01-19T10:00:00Z",
    assignedTo: "John Doe",
    customer: "Alice Smith",
    description: "I'm unable to log in to my account. When I enter my credentials, it just shows a loading spinner and nothing happens.",
    updates: [
      {
        id: 1,
        type: "comment",
        content: "Hi Alice, I'll help you with this. Can you please try clearing your browser cache and cookies?",
        author: "John Doe",
        timestamp: "2024-01-19T10:30:00Z",
      },
      {
        id: 2,
        type: "status_change",
        content: "Status changed from new to open",
        author: "System",
        timestamp: "2024-01-19T10:30:00Z",
      },
    ],
  },
  // Add more mock tickets as needed
];

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-gray-100 text-gray-800",
  closed: "bg-red-100 text-red-800",
} as const;

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
} as const;

export default function TicketDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("high");

  // Find the ticket from our mock data
  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="flex-1 p-8 text-center">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate("/tickets")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    // TODO: Implement comment submission
    console.log("Submitting comment:", newComment);
    setNewComment("");
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/tickets")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Badge variant="outline">{ticket.id}</Badge>
          </div>
          <h2 className="text-2xl font-bold">{ticket.title}</h2>
          <p className="text-muted-foreground">
            Opened by {ticket.customer} on{" "}
            {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-muted-foreground">{ticket.description}</p>
          </div>

          <div className="space-y-4">
            {ticket.updates.map((update) => (
              <div key={update.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{update.author}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(update.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground">{update.content}</p>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <Button onClick={handleSubmitComment}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-4">Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge
                    className={cn(
                      "capitalize",
                      statusColors[ticket.status as keyof typeof statusColors]
                    )}
                  >
                    {ticket.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Priority</dt>
                <dd>
                  <Badge
                    className={cn(
                      "capitalize",
                      priorityColors[ticket.priority as keyof typeof priorityColors]
                    )}
                  >
                    {ticket.priority}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Assigned To</dt>
                <dd className="font-medium">{ticket.assignedTo}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 