import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateTicketForm } from "@/components/tickets/CreateTicketForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateTicketData } from "@/types/ticket";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();

  const handleSubmit = async (data: CreateTicketData) => {
    if (!profile) {
      console.error("No user profile found");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "new",
        customer_id: profile.id,
      });

      if (error) throw error;
      
      navigate("/tickets");
    } catch (error) {
      console.error("Failed to create ticket:", error);
      // TODO: Add proper error toast notification
    } finally {
      setIsSubmitting(false);
    }
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

      <div className="rounded-lg border p-4">
        <CreateTicketForm onSubmit={handleSubmit} isLoading={isSubmitting} />
      </div>
    </div>
  );
} 