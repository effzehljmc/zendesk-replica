import { ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

interface HelpMessageProps {
  ticketId: string;
  articleId: string;
  articleTitle: string;
}

export function HelpMessage({ ticketId, articleId, articleTitle }: HelpMessageProps) {
  const handleResolved = async () => {
    await supabase
      .from('tickets')
      .update({ status: 'resolved' })
      .eq('id', ticketId);
  }

  const handleNeedHelp = async () => {
    // This will be handled by the regular reply functionality
    console.log("User needs further assistance");
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        <p className="text-lg">I found a knowledge base article that might solve your problem:</p>
        
        <p className="font-medium">{articleTitle}</p>

        <div className="grid gap-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open(`/kb/${articleId}`, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View knowledge base article
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="secondary" 
              className="w-full flex items-center justify-center" 
              onClick={handleResolved}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              This resolved my issue
            </Button>

            <Button 
              variant="secondary" 
              className="w-full flex items-center justify-center" 
              onClick={handleNeedHelp}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              I need further assistance
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 