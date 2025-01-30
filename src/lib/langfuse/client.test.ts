import { describe, it, expect } from 'vitest';
import langfuse from './client';

describe('LangFuse Client', () => {
  it('should create a trace successfully', async () => {
    const trace = langfuse.trace({
      name: 'test-trace',
      metadata: { test: true }
    });

    expect(trace).toBeDefined();
    expect(trace.id).toBeDefined();
    
    // Create a span within the trace
    const span = trace.span({
      name: 'test-span',
      metadata: { spanTest: true }
    });
    
    expect(span).toBeDefined();
    expect(span.id).toBeDefined();

    // Update the span and trace with completion
    span.update({ metadata: { completed: true } });
    trace.update({ metadata: { completed: true } });
  });
}); 