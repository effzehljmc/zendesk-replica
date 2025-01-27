import { useTicketMessages } from '@/hooks/useTicketMessages';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { TicketNotes } from './TicketNotes';
import { AISuggestions } from '../AISuggestions';

interface TicketConversationProps {
  ticketId: string;
}

export function TicketConversation({ ticketId }: TicketConversationProps) {
  const { messages, isLoading, error } = useTicketMessages(ticketId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error?.message || 'An error occurred'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <div key={message.id} className="p-4 border rounded">
            <div className="font-medium">{message.user?.fullName}</div>
            <div className="mt-2">{message.content}</div>
          </div>
        ))}
      </div>

      <AISuggestions ticketId={ticketId} className="mt-4" />

      <TicketNotes ticketId={ticketId} />
    </div>
  );
}
