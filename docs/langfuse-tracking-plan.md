# LangFuse Tracking Implementation Plan

This plan outlines how to integrate LangFuse for annotation and metric tracking in our existing agent functions. By leveraging the callback or logging mechanism within each AI call, we can automatically store trace data (given prompts, outputs, timings, acceptance/rejections, etc.) in LangFuse.

---

## Overview

• We will capture two required metrics:  
  1) "Success rate at identifying the correct action" (based on the acceptance or rejection of AI suggestions).  
  2) "Speed of response" or "Error rate" (we can compute the duration of AI calls or track how often an error occurs).

• LangFuse integration will involve:  
  1) ✅ Installing and configuring LangFuse in our codebase.  
  2) Initially focusing on the `generate-message-suggestion` function to establish the pattern:
     - Integrate with existing `ai_suggestions` and `ai_feedback_events` tables
     - Leverage current feedback infrastructure for acceptance/rejection tracking
     - Use existing hourly aggregation jobs for metrics
  3) Later expand to other agent functions (generate-response, classifyTicket)
  4) Attaching metadata for acceptance/rejection or errors, so we can generate dashboards or aggregated metrics within LangFuse.

---

## Implementation Steps

1. ✅ Install LangFuse package
2. ✅ Configure LangFuse client with proper environment variables
3. ✅ Basic test to verify client setup
4. Next: Implement tracing for `generate-message-suggestion`:
   - Create a trace for each suggestion request
   - Add generation span to capture the OpenAI call
   - Include relevant metadata:
     • Input: prompt and context
     • Model parameters
     • Output: suggested response
     • Confidence score
   - Link with existing tables:
     • Store trace/span IDs in `ai_suggestions` metadata
     • Update trace with feedback from `ai_feedback_events`
5. Connect acceptance/rejection feedback:
   – Use existing feedback types (rejection, revision, approval)
   – Include current feedback reasons (irrelevant, off-topic, etc.)
   – Maintain current batch update pattern for performance
   – Store metadata following current pattern:
     • ai_suggestions: Store core metadata about the suggestion (model, prompt details) for all suggestions
     • ai_feedback_events: Only store additional feedback metadata for rejections (e.g. {"additional_feedback": "too_generic"})
     • For accepted suggestions, rely on metadata from ai_suggestions table
   – Current rejection reasons in metadata include:
     • "too_generic"
     • "off-topic"
     • "error"
     • "too long"

---

## Checklist

- [x] Add LangFuse to dependencies  
- [x] Create langfuseClient (with project/API keys)  
- [x] Configure environment variables for LANGFUSE_API_KEY  
- [ ] Integrate generate-message-suggestion with LangFuse  
  - [ ] Create wrapper function with tracing
  - [ ] Connect to existing feedback system
  - [ ] Implement batch processing
  - [ ] Test with hourly aggregation
- [ ] Annotate acceptance/rejection in LangFuse  
  - [ ] Map existing feedback_types to LangFuse events
  - [ ] Store suggestion metadata in ai_suggestions table
  - [ ] Store rejection feedback in ai_feedback_events metadata
  - [ ] Verify batch processing works
- [ ] Confirm we collect two metrics (success rate, speed/error rate)  
  - [ ] Validate acceptance ratio using existing aggregation
  - [ ] Validate speed tracking with time_to_feedback
- [PROGRESS] Test end-to-end flow  
  - [ ] Generate test suggestions
  - [ ] Test all feedback types
  - [ ] Verify traces in LangFuse
  - [ ] Confirm aggregation jobs still work
- [ ] Create minimal LangFuse usage guide or readme snippet for new devs  
- [ ] Final verification in staging  
  - [ ] Ensure we see real-time traces and metrics in LangFuse  
  - [ ] Confirm no additional performance overhead  
  - [ ] Verify compatibility with existing analytics

---

## Warnings

- Overlapping or duplicated logging in multiple places can cause confusion.  
- Large volumes of AI calls may generate high costs with both OpenAI and LangFuse.  
- Make sure environment variables for production and local dev are set appropriately before deploying.  

---

## Notes on Agent Functions

We will integrate LangFuse annotations starting with the `generate-message-suggestion` function:

• Insert the LangFuse trace start before calling the LLM or agent logic.  
• Capture the final output and any errors, then send them to LangFuse.  
• Leverage existing feedback infrastructure:
  - Use current `ai_feedback_events` table
  - Maintain batch processing pattern
  - Utilize hourly aggregation jobs
• Once stable, expand to other agent functions using the same pattern.

This approach allows us to:
1. Establish a clear integration pattern with one function
2. Leverage existing infrastructure
3. Maintain current performance characteristics
4. Gradually expand to other functions 