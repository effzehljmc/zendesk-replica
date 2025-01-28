# LangFuse Tracking Implementation Plan

This plan outlines how to integrate LangFuse for annotation and metric tracking in our existing agent functions. By leveraging the callback or logging mechanism within each AI call, we can automatically store trace data (given prompts, outputs, timings, acceptance/rejections, etc.) in LangFuse.

---

## Overview

• We will capture two required metrics:  
  1) "Success rate at identifying the correct action" (based on the acceptance or rejection of AI suggestions).  
  2) "Speed of response" or "Error rate" (we can compute the duration of AI calls or track how often an error occurs).

• LangFuse integration will involve:  
  1) Installing and configuring LangFuse in our codebase.  
  2) Updating existing agent functions (e.g., generate-response, classifyTicket, or suggestion generation) to log input/output data.  
  3) Attaching metadata for acceptance/rejection or errors, so we can generate dashboards or aggregated metrics within LangFuse.

---

## Implementation Steps

1. Install LangFuse (and LangChain if needed).  
2. Configure a new langfuseClient.ts or js file with the required credentials.  
3. Wrap existing or newly created agent calls in a logging layer that:  
   – Starts a trace when the function begins.  
   – Logs the prompt, tickets, or relevant user data.  
   – Logs the AI response.  
   – Ends the trace once the AI call completes, capturing any errors or rejections.  
4. Connect acceptance/rejection feedback from agents to another trace event or update in LangFuse, so we can measure the "correctness" of the suggestion or classification.  
5. Optionally measure "speed of response" by computing the difference between the start and end timestamps for each trace.

---

## Checklist

- [ ] Add LangFuse to dependencies  
- [ ] Create langfuseClient (with project/API keys)  
- [ ] Configure environment variables for LANGFUSE_API_KEY  
- [ ] Wrap generate-response or agent functions with LangFuse logging  
  - [ ] Start trace on each request  
  - [ ] Store prompts and metadata  
  - [ ] Store final response or error  
  - [ ] End trace  
- [ ] Annotate acceptance/rejection in LangFuse  
  - [ ] On suggestion acceptance or rejection, send a "feedback event"  
  - [ ] Include relevant metadata (ticket ID, suggestion ID, user info)  
- [ ] Confirm we collect two metrics (success rate, speed/error rate)  
  - [ ] Validate acceptance ratio  
  - [ ] Validate speed or error tracking  
- [PROGRESS] Test end-to-end flow  
  - [ ] Generate test tickets with AI suggestions  
  - [ ] Accept or reject suggestions  
  - [ ] Verify traces appear in LangFuse  
- [ ] Create minimal LangFuse usage guide or readme snippet for new devs  
- [ ] Final verification in staging  
  - [ ] Ensure we see real-time traces and metrics in LangFuse  
  - [ ] Confirm no additional performance overhead or errors  

---

## Warnings

- Overlapping or duplicated logging in multiple places can cause confusion.  
- Large volumes of AI calls may generate high costs with both OpenAI and LangFuse.  
- Make sure environment variables for production and local dev are set appropriately before deploying.  

---

## Notes on Agent Functions

Yes, we can integrate these LangFuse annotations into our existing agent functions directly. The approach is to:

• Insert the LangFuse trace start before calling the LLM or agent logic.  
• Capture the final output and any errors, then send them to LangFuse.  
• On user acceptance/rejection, log an additional trace or "span" to record outcome data.  

This preserves our current code structure while adding robust observability and metric tracking. 