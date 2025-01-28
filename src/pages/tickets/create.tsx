import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { TagSelector } from "@/components/ui/tag-selector";
import type { Tag } from "@/types/ticket";
import { useUserRole } from "@/hooks/useUserRole";
import { SuggestedArticles } from "@/components/ticket/SuggestedArticles";
import type { KBArticle } from "@/lib/kb";

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isCustomer, isAgent, isAdmin } = useUserRole();
  const canManageTicket = isAgent || isAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast({
        title: "Error",
        description: "No user profile found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // First create the ticket without selecting
      const { data: newTicket, error: insertError } = await supabase
        .from("tickets")
        .insert({
          title,
          description,
          priority: isCustomer ? "medium" : priority,
          status: "new",
          customer_id: profile.id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Then fetch the complete ticket with relationships
      const { data: ticket, error: fetchError } = await supabase
        .from("tickets")
        .select(`
          *,
          customer:profiles!tickets_customer_id_fkey (
            full_name,
            email
          ),
          assigned_to:profiles!tickets_assigned_to_id_fkey (
            full_name
          )
        `)
        .eq('id', newTicket.id)
        .single();

      if (fetchError) throw fetchError;

      // Then create the ticket-tag relationships if tags are provided and user is not a customer
      if (!isCustomer && selectedTags.length > 0) {
        const { error: tagError } = await supabase
          .from("ticket_tags")
          .insert(
            selectedTags.map(tag => ({
              ticket_id: ticket.id,
              tag_id: tag.id,
              created_by_id: profile.id,
            }))
          );

        if (tagError) throw tagError;
      }

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });
      navigate("/tickets");
    } catch (error) {
      console.error("Failed to create ticket:", error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArticleClick = (article: KBArticle) => {
    // Track that the user viewed this article
    console.log('User viewed article:', article.id);
  };

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/tickets")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
          <p className="text-muted-foreground mt-2">
            Fill out the form below to create a new support ticket.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border p-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter ticket title"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue..."
                className="min-h-[100px]"
                required
              />
            </div>

            {canManageTicket && (
              <>
                <div className="space-y-2">
                  <label htmlFor="priority" className="text-sm font-medium">
                    Priority
                  </label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <TagSelector
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    maxTags={3}
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </form>
        </div>

        {(title || description) && (
          <div className="rounded-lg border p-4">
            <SuggestedArticles 
              title={title} 
              description={description} 
              onArticleClick={handleArticleClick}
            />
          </div>
        )}
      </div>
    </div>
  );
} 