import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface TicketRatingProps {
  ticketId: string;
  currentRating?: number;
  onRatingSubmit?: (rating: number) => void;
}

export function TicketRating({ ticketId, currentRating, onRatingSubmit }: TicketRatingProps) {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRatingSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ satisfaction_rating: rating })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Thank you for your feedback!',
        description: 'Your rating has been submitted successfully.',
      });

      onRatingSubmit?.(rating);
    } catch (err) {
      console.error('Failed to submit rating:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {currentRating ? 'Update your rating:' : 'How satisfied were you with our support?'}
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoveredRating(value)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                (hoveredRating ? value <= hoveredRating : value <= rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <Button
          onClick={handleRatingSubmit}
          disabled={isSubmitting}
        >
          {currentRating ? 'Update Rating' : 'Submit Rating'}
        </Button>
      )}
    </div>
  );
} 