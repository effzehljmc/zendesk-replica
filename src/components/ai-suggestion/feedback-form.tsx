import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FeedbackReason } from "@/types/ai-suggestion";

interface FeedbackFormProps {
  onSubmit: (feedback: { reason: FeedbackReason; additionalFeedback?: string }) => void;
  onCancel: () => void;
}

const FEEDBACK_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: "irrelevant", label: "Irrelevant" },
  { value: "off-topic", label: "Off-topic" },
  { value: "incorrect_info", label: "Incorrect Information" },
  { value: "too_generic", label: "Too Generic" },
];

export function FeedbackForm({ onSubmit, onCancel }: FeedbackFormProps) {
  const [reason, setReason] = useState<FeedbackReason | "">("");
  const [additionalFeedback, setAdditionalFeedback] = useState("");

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit({
      reason,
      additionalFeedback: additionalFeedback.trim() || undefined
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="reason">Why are you rejecting this suggestion?</Label>
        <Select
          value={reason}
          onValueChange={(value) => setReason(value as FeedbackReason)}
        >
          <SelectTrigger id="reason">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_REASONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional-feedback">Additional Feedback (Optional)</Label>
        <Textarea
          id="additional-feedback"
          placeholder="Add any additional comments..."
          value={additionalFeedback}
          onChange={(e) => setAdditionalFeedback(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!reason}>
          Submit Feedback
        </Button>
      </div>
    </div>
  );
} 